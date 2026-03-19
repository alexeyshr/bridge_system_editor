"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  MessageSquareIcon,
  ReplyIcon,
  SendIcon,
} from "lucide-react"

type Comment = {
  id: string
  contentItemId: string
  authorUserId: string
  authorDisplayName: string | null
  authorBridgesportPlayerId: number | null
  parentCommentId: string | null
  body: string
  createdAt: string
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString("ru-RU")
}

function Avatar({ name, bridgesportPlayerId }: { name: string | null; bridgesportPlayerId: number | null }) {
  const initials = (name ?? "U").slice(0, 2).toUpperCase()
  const [imgError, setImgError] = useState(false)

  if (bridgesportPlayerId && !imgError) {
    return (
      <img
        src={`https://db.bridgesport.ru/foto/${bridgesportPlayerId}.jpg`}
        alt=""
        className="size-8 shrink-0 rounded-full object-cover"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1f2734] text-[10px] font-bold text-white">
      {initials}
    </div>
  )
}

// Render suit symbols with colors
function renderBody(text: string) {
  const parts: Array<string | { suit: string; color: string }> = []
  let last = 0
  const suitColors: Record<string, string> = { "♠": "#2b3446", "♥": "#9e2d36", "♦": "#b7692f", "♣": "#2f6a4a" }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (suitColors[c]) {
      if (i > last) parts.push(text.slice(last, i))
      parts.push({ suit: c, color: suitColors[c] })
      last = i + 1
    }
  }
  if (last < text.length) parts.push(text.slice(last))

  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          p
        ) : (
          <span key={i} className="font-bold" style={{ color: p.color }}>{p.suit}</span>
        )
      )}
    </>
  )
}

function CommentForm({
  onSubmit,
  placeholder,
  autoFocus = false,
  onCancel,
}: {
  onSubmit: (body: string) => Promise<void>
  placeholder: string
  autoFocus?: boolean
  onCancel?: () => void
}) {
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const trimmed = body.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    await onSubmit(trimmed)
    setBody("")
    setSubmitting(false)
  }

  return (
    <div className="flex gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSubmit()
          if (e.key === "Escape" && onCancel) onCancel()
        }}
        className="flex-1 resize-none rounded-lg border border-[#d8dbe1] bg-white px-3 py-2 text-sm text-[#1f2734] placeholder:text-[#9ca3af] transition focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
      />
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={!body.trim() || submitting}
          onClick={() => void handleSubmit()}
          className="flex h-8 items-center gap-1 rounded-lg bg-[#1f2734] px-3 text-xs font-medium text-white transition hover:bg-[#374151] disabled:opacity-40"
        >
          {submitting ? <Loader2Icon className="size-3 animate-spin" /> : <SendIcon className="size-3" />}
          Send
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-lg border border-[#d8dbe1] px-3 text-xs text-[#6e7788] transition hover:bg-[#f3f4f6]"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  )
}

function CommentThread({
  comment,
  childrenMap,
  depth,
  collapsed,
  toggleCollapse,
  replyingTo,
  setReplyingTo,
  onSubmitReply,
  isAuthenticated,
}: {
  comment: Comment
  childrenMap: Map<string | null, Comment[]>
  depth: number
  collapsed: Set<string>
  toggleCollapse: (id: string) => void
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  onSubmitReply: (body: string, parentId: string) => Promise<void>
  isAuthenticated: boolean
}) {
  const children = childrenMap.get(comment.id) ?? []
  const hasChildren = children.length > 0
  const isCollapsed = collapsed.has(comment.id)
  const maxDepth = 6

  return (
    <div className={depth > 0 ? "ml-5 border-l-2 border-[#e5e7eb] pl-4" : ""}>
      <div className="group py-2">
        <div className="flex items-start gap-2.5">
          <Avatar name={comment.authorDisplayName} bridgesportPlayerId={comment.authorBridgesportPlayerId} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#1f2734]">
                {comment.authorDisplayName ?? "User"}
              </span>
              <span className="text-[11px] text-[#9ca3af]">{relativeTime(comment.createdAt)}</span>
            </div>
            <p className="mt-0.5 text-sm leading-relaxed text-[#374151] whitespace-pre-wrap">
              {renderBody(comment.body)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleCollapse(comment.id)}
                  className="flex items-center gap-0.5 text-[11px] text-[#9ca3af] transition hover:text-[#1f2734]"
                >
                  {isCollapsed ? <ChevronRightIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
                  {children.length} {children.length === 1 ? "reply" : "replies"}
                </button>
              ) : null}
              {isAuthenticated && depth < maxDepth ? (
                <button
                  type="button"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="flex items-center gap-0.5 text-[11px] text-[#9ca3af] opacity-0 transition group-hover:opacity-100 hover:text-[#1f2734]"
                >
                  <ReplyIcon className="size-3" />
                  Reply
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Reply form */}
      {replyingTo === comment.id ? (
        <div className="mb-2 ml-10">
          <CommentForm
            onSubmit={(body) => onSubmitReply(body, comment.id)}
            placeholder={`Reply to ${comment.authorDisplayName ?? "user"}...`}
            autoFocus
            onCancel={() => setReplyingTo(null)}
          />
        </div>
      ) : null}

      {/* Children */}
      {hasChildren && !isCollapsed ? (
        <div>
          {children.map((child) => (
            <CommentThread
              key={child.id}
              comment={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onSubmitReply={onSubmitReply}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ContentComments({ contentId }: { contentId: string }) {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/items/${encodeURIComponent(contentId)}/comments`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments ?? [])
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [contentId])

  useEffect(() => { void loadComments() }, [loadComments])

  const childrenMap = useMemo(() => {
    const map = new Map<string | null, Comment[]>()
    for (const c of comments) {
      const key = c.parentCommentId
      const arr = map.get(key) ?? []
      arr.push(c)
      map.set(key, arr)
    }
    return map
  }, [comments])

  const rootComments = childrenMap.get(null) ?? []

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const submitComment = useCallback(async (body: string, parentId: string | null = null) => {
    try {
      const res = await fetch(`/api/content/items/${encodeURIComponent(contentId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parentCommentId: parentId }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments((prev) => [...prev, data.comment])
        setReplyingTo(null)
        // Expand parent if collapsed
        if (parentId) {
          setCollapsed((prev) => {
            const next = new Set(prev)
            next.delete(parentId)
            return next
          })
        }
      }
    } catch { /* ignore */ }
  }, [contentId])

  const submitReply = useCallback(async (body: string, parentId: string) => {
    await submitComment(body, parentId)
  }, [submitComment])

  return (
    <section className="mt-10 border-t border-[#e5e7eb] pt-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareIcon className="size-4 text-[#6b7280]" />
        <h2 className="text-sm font-semibold text-[#1f2734]">
          {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : "Comments"}
        </h2>
      </div>

      {/* New comment form */}
      {isAuthenticated ? (
        <div className="mb-6">
          <CommentForm
            onSubmit={(body) => submitComment(body)}
            placeholder="Write a comment... (Ctrl+Enter to send)"
          />
        </div>
      ) : (
        <p className="mb-6 text-xs text-[#9ca3af]">
          <a href="/auth/signin" className="text-blue-600 hover:underline">Sign in</a> to leave a comment.
        </p>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2Icon className="size-5 animate-spin text-[#9ca3af]" />
        </div>
      ) : rootComments.length > 0 ? (
        <div className="space-y-1">
          {rootComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              childrenMap={childrenMap}
              depth={0}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onSubmitReply={submitReply}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-[#9ca3af]">No comments yet. Be the first to comment!</p>
      )}
    </section>
  )
}
