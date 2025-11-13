-- Add RPC function to handle post deletion
-- This function bypasses RLS WITH CHECK issues when soft-deleting posts
-- The problem: UPDATE policies with WITH CHECK fail when setting deleted_at
-- because the updated row would violate the SELECT policy (deleted_at IS NULL)

CREATE OR REPLACE FUNCTION delete_post(post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_post_user_id uuid;
    v_deleted_at timestamptz;
BEGIN
    -- Get the current authenticated user
    v_user_id := auth.uid();

    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Get the post's owner and deleted status
    SELECT user_id, deleted_at
    INTO v_post_user_id, v_deleted_at
    FROM posts
    WHERE id = post_id;

    -- Check if post exists
    IF v_post_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Post not found'
        );
    END IF;

    -- Check if already deleted
    IF v_deleted_at IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Post already deleted'
        );
    END IF;

    -- Check ownership
    IF v_post_user_id != v_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authorized'
        );
    END IF;

    -- Soft delete the post
    UPDATE posts
    SET deleted_at = NOW()
    WHERE id = post_id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'Post deleted successfully'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_post(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_post(uuid) IS
  'Soft deletes a post by setting deleted_at. Uses SECURITY DEFINER to bypass RLS WITH CHECK issues.';
