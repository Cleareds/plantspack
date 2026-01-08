# Notification System Documentation

## Overview

PlantsPack has a real-time notification system that keeps users informed about important interactions on the platform. The system supports multiple notification types and provides both in-app and (planned) email notifications.

---

## Architecture

### Components

1. **NotificationBell Component** (`src/components/notifications/NotificationBell.tsx`)
   - Displays bell icon with unread count badge
   - Shows dropdown with recent notifications
   - Real-time updates via Supabase subscriptions
   - Mark as read functionality

2. **API Endpoints**
   - `GET /api/notifications` - Fetch user's notifications
   - `PATCH /api/notifications` - Mark notifications as read
   - `POST /api/notifications/create` - Create new notification

3. **Database Tables**
   - `notifications` - Stores all notifications
   - `notification_preferences` - User notification settings

---

## Notification Types

| Type | Description | Triggered When | Icon |
|------|-------------|----------------|------|
| `like` | Post like | Someone likes your post | ❤️ Heart |
| `comment` | New comment | Someone comments on your post | 💬 Message |
| `reply` | Comment reply | Someone replies to your comment | 💬 Message |
| `follow` | New follower | Someone follows you | 👤 User Plus |
| `mention` | User mention | Someone mentions you with @username | @ At Sign |

---

## How It Works

### 1. Notification Creation Flow

```
User Action → Trigger Point → API Call → Database Insert → Real-time Broadcast
```

**Example: Like Notification**
```typescript
// In ReactionButtons.tsx
const response = await fetch('/api/notifications/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: post.user_id,          // Who receives the notification
    type: 'like',                  // Notification type
    entityType: 'post',            // What was liked
    entityId: postId,              // Post ID
  }),
})
```

### 2. Real-Time Updates

The system uses Supabase Realtime for instant notifications:

```typescript
// Subscribe to new notifications
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // Automatically refetch notifications
    fetchNotifications()
  })
  .subscribe()
```

### 3. Notification Preferences

Users can control which notifications they receive:

**Push Notifications (In-App):**
- `push_likes` - Like notifications
- `push_comments` - Comment/reply notifications
- `push_follows` - Follow notifications
- `push_mentions` - Mention notifications

**Email Notifications** (Planned):
- `email_likes`
- `email_comments`
- `email_follows`
- `email_mentions`

If a user has disabled a notification type, the API skips creating it:

```typescript
if (prefs && prefs.push_likes === false) {
  return { success: true, skipped: true }
}
```

---

## Trigger Points

### 1. Follow Notification
**File:** `src/components/social/FollowButton.tsx`
**Triggered:** When user clicks "Follow" button
**Recipient:** The user being followed

```typescript
await fetch('/api/notifications/create', {
  method: 'POST',
  body: JSON.stringify({
    userId: profileUserId,  // User being followed
    type: 'follow',
  }),
})
```

### 2. Like Notification
**File:** `src/components/reactions/ReactionButtons.tsx`
**Triggered:** When user likes a post
**Recipient:** Post author

```typescript
await fetch('/api/notifications/create', {
  method: 'POST',
  body: JSON.stringify({
    userId: post.user_id,
    type: 'like',
    entityType: 'post',
    entityId: postId,
  }),
})
```

### 3. Comment Notification
**File:** `src/components/posts/Comments.tsx`
**Triggered:** When user comments on a post
**Recipient:** Post author

```typescript
await fetch('/api/notifications/create', {
  method: 'POST',
  body: JSON.stringify({
    userId: post.user_id,
    type: 'comment',
    entityType: 'post',
    entityId: postId,
  }),
})
```

### 4. Reply Notification
**File:** `src/components/posts/Comments.tsx`
**Triggered:** When user replies to a comment
**Recipient:** Comment author

```typescript
await fetch('/api/notifications/create', {
  method: 'POST',
  body: JSON.stringify({
    userId: parentComment.user_id,
    type: 'reply',
    entityType: 'comment',
    entityId: parentCommentId,
  }),
})
```

### 5. Mention Notification
**File:** `src/components/posts/CreatePost.tsx`
**Triggered:** When creating a post with @mentions
**Recipient:** Each mentioned user

```typescript
for (const mentionedUserId of mentionedUserIds) {
  if (mentionedUserId !== user.id) {  // Don't notify yourself
    await fetch('/api/notifications/create', {
      method: 'POST',
      body: JSON.stringify({
        userId: mentionedUserId,
        type: 'mention',
        entityType: 'post',
        entityId: createdPost.id,
      }),
    })
  }
}
```

---

## User Interface

### Notification Bell

**Location:** Header (visible when logged in)

**Features:**
- Bell icon with unread count badge (red circle)
- Click to open dropdown with recent notifications
- Dropdown shows:
  - Last 10 notifications
  - Actor's avatar and name
  - Notification message
  - Time ago
  - Unread indicator (green dot)
- Actions:
  - "Mark all as read" button
  - Click notification to mark as read and navigate
  - "View all notifications" link

**States:**
- **No notifications:** Bell icon, no badge
- **Unread notifications:** Bell icon with red badge showing count
- **Badge shows:** "1", "2", ... "99", "99+" (max)

### Notification Dropdown

**Design:**
- Width: 384px (w-96)
- Max height: 384px with scroll
- Unread notifications have green background (`bg-green-50`)
- Each notification shows:
  - Avatar (or icon fallback)
  - Actor name in bold
  - Action description
  - Time ago (e.g., "5m ago", "2h ago", "3d ago")
  - Green dot if unread

**Interactions:**
- Click notification → Navigate to entity + mark as read
- Click "Mark all as read" → All notifications marked as read
- Click outside → Close dropdown
- Click "View all notifications" → Go to full notification page

---

## Database Schema

### `notifications` Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,  -- 'like' | 'comment' | 'follow' | 'mention' | 'reply'
  entity_type TEXT,    -- 'post' | 'comment'
  entity_id UUID,      -- Post ID or Comment ID
  message TEXT,        -- Optional custom message
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### `notification_preferences` Table

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email_likes BOOLEAN DEFAULT TRUE,
  email_comments BOOLEAN DEFAULT TRUE,
  email_follows BOOLEAN DEFAULT TRUE,
  email_mentions BOOLEAN DEFAULT TRUE,
  push_likes BOOLEAN DEFAULT TRUE,
  push_comments BOOLEAN DEFAULT TRUE,
  push_follows BOOLEAN DEFAULT TRUE,
  push_mentions BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Reference

### GET /api/notifications

Fetch user's notifications.

**Query Parameters:**
- `limit` (optional): Number of notifications to fetch (default: 20)
- `unreadOnly` (optional): If "true", only fetch unread notifications

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "actor_id": "uuid",
      "type": "like",
      "entity_type": "post",
      "entity_id": "uuid",
      "message": null,
      "read": false,
      "created_at": "2026-01-08T10:30:00Z",
      "actor": {
        "id": "uuid",
        "username": "johndoe",
        "avatar_url": "https://...",
        "first_name": "John",
        "last_name": "Doe"
      }
    }
  ],
  "unreadCount": 5
}
```

### PATCH /api/notifications

Mark notifications as read.

**Request Body:**
```json
{
  "notificationIds": ["uuid1", "uuid2"],  // Specific notifications
  // OR
  "markAllAsRead": true                    // All notifications
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /api/notifications/create

Create a new notification.

**Request Body:**
```json
{
  "userId": "uuid",              // Recipient user ID
  "type": "like",                // Notification type
  "entityType": "post",          // Optional: 'post' | 'comment'
  "entityId": "uuid",            // Optional: Related entity ID
  "message": "Custom message"    // Optional: Override default message
}
```

**Response:**
```json
{
  "success": true,
  "notification": { /* notification object */ }
}
```

**Special Cases:**
- Returns `{ success: true, skipped: true }` if:
  - User is notifying themselves
  - User has disabled this notification type

---

## Best Practices

### 1. Don't Notify Yourself
Always check if the actor is the same as the recipient:

```typescript
if (session.user.id === recipientUserId) {
  return // Don't create notification
}
```

### 2. Respect User Preferences
Check notification preferences before creating:

```typescript
const prefs = await getNotificationPreferences(userId)
if (!prefs.push_likes) {
  return // User has disabled like notifications
}
```

### 3. Batching
For bulk actions (e.g., 10 users mentioned in one post), create notifications efficiently:

```typescript
// Good: Individual requests with error handling
for (const userId of userIds) {
  try {
    await createNotification(userId, data)
  } catch (error) {
    // Log but don't fail entire operation
    console.error('Failed to notify user:', userId, error)
  }
}
```

### 4. Performance
- Use database indexes on `user_id`, `read`, and `created_at`
- Limit notifications fetched (default: 20)
- Use real-time subscriptions instead of polling

---

## Testing

### E2E Tests

Located in: `tests/e2e/notifications.spec.ts`

**Top 5 Use Cases Tested:**
1. Follow notification
2. Like notification
3. Comment notification
4. Mention notification
5. Reply notification

**Additional Tests:**
- Mark as read (individual)
- Mark all as read
- Unread count badge
- Real-time updates

**Run Tests:**
```bash
npm run test:notifications
```

---

## Known Issues & Future Improvements

### Current Limitations

1. **No email notifications** - Only in-app notifications work
   - Email integration planned (SendGrid/AWS SES)
   - Email templates need to be created

2. **No push notifications** - No browser/mobile push
   - Web Push API integration planned
   - Firebase Cloud Messaging for mobile

3. **No notification grouping** - Each action creates separate notification
   - Future: "John and 5 others liked your post"
   - Reduces notification spam

4. **No notification deletion** - Users can only mark as read
   - Add ability to delete individual notifications
   - Add "Clear all" option

5. **Limited notification history** - Dropdown shows last 10
   - Full notification page exists but could be enhanced
   - Add pagination/infinite scroll

### Planned Features

- [ ] Email notifications
- [ ] Browser push notifications
- [ ] Notification grouping ("X and Y liked your post")
- [ ] Notification sounds (optional)
- [ ] Delete notifications
- [ ] Notification categories/filters
- [ ] Daily/weekly digest emails
- [ ] Mute notifications for specific users/posts

---

## Troubleshooting

### Notifications not appearing?

**Check:**
1. User is logged in
2. Real-time subscription is active (check browser console)
3. Supabase connection is working
4. Notification preferences are enabled
5. Actor is not the same as recipient

### Unread count not updating?

**Check:**
1. Real-time subscription to notifications table
2. Database policies allow reading notifications
3. Browser console for errors

### Mark as read not working?

**Check:**
1. User authentication
2. Notification belongs to current user
3. Database update policies
4. API response status

---

## Security

### Row Level Security (RLS)

Notifications use RLS to ensure users can only:
- Read their own notifications
- Not create notifications for others (use API endpoint)
- Update read status on their own notifications only

**Policies:**
```sql
-- Users can only read their own notifications
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only update read status on their notifications
CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
```

### API Security

- All notification endpoints require authentication
- Service role used for notification creation (prevents abuse)
- Rate limiting on notification creation (TODO)

---

**Last Updated:** January 8, 2026
