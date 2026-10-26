import type { Comment } from './types'

export type CommentSort = 'oldest' | 'newest' | 'top'

export interface CommentNode extends Comment {
  children: Array<CommentNode>
  depth: number
}

const byOldest = (a: Comment, b: Comment) => a.createdAt.localeCompare(b.createdAt)
const byNewest = (a: Comment, b: Comment) => b.createdAt.localeCompare(a.createdAt)
const byTop = (a: Comment, b: Comment) => b.count - a.count || byOldest(a, b)

/**
 * Build the reply tree. Replies whose parent no longer exists are promoted to
 * the top level (matching how the original site rendered them).
 */
export function buildCommentTree(comments: Array<Comment>, sort: CommentSort): Array<CommentNode> {
  const nodes = new Map<string, CommentNode>()
  for (const comment of comments) nodes.set(comment.id, { ...comment, children: [], depth: 0 })

  const roots: Array<CommentNode> = []
  for (const node of nodes.values()) {
    const parent = node.replyId ? nodes.get(node.replyId) : undefined
    if (parent && parent !== node) parent.children.push(node)
    else roots.push(node)
  }

  const assign = (list: Array<CommentNode>, depth: number) => {
    for (const node of list) {
      node.depth = depth
      node.children.sort(byOldest)
      assign(node.children, depth + 1)
    }
  }

  roots.sort(sort === 'top' ? byTop : sort === 'newest' ? byNewest : byOldest)
  assign(roots, 0)
  return roots
}

export function countDescendants(node: CommentNode): number {
  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0)
}
