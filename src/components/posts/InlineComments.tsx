'use client'

import Comments from './Comments'

export default function InlineComments({ postId }: { postId: string }) {
  return <Comments postId={postId} isOpen={true} onClose={() => {}} embedded />
}
