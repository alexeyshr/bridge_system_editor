"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  BookOpenIcon,
  ChevronRightIcon,
  DiamondIcon,
  GraduationCapIcon,
  HeartIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  SpadeIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardFaviconToggle } from "@/components/dashboard-favicon-toggle"
import { TopbarGlobalSearch } from "@/components/topbar-global-search"
import { TopbarNotifications } from "@/components/topbar-notifications"
import { TopbarUserMenu } from "@/components/topbar-user-menu"
import { normalizePortalRoles, type PortalRole } from "@/lib/portal-access"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { trpc } from "@/lib/trpc/react"

interface BookRow {
  id: string
  slug: string
  prefix: string
  title: string
  author: string
  description: string | null
  difficulty: string | null
  accentColor: string | null
  icon: string | null
  coverUrl: string | null
  sortOrder: number | null
  createdAt: Date
  updatedAt: Date
}

const ICON_MAP: Record<string, typeof SpadeIcon> = {
  spade: SpadeIcon,
  heart: HeartIcon,
  diamond: DiamondIcon,
  club: BookOpenIcon,
}

function BookCard({ book }: { book: BookRow }) {
  const Icon = ICON_MAP[book.icon ?? "spade"] ?? SpadeIcon
  const color = book.accentColor ?? "#2563eb"
  return (
    <Link
      href={`/dashboard/learning/${book.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white transition hover:border-[#6b7280] hover:shadow-lg w-[260px]"
    >
      {book.coverUrl ? (
        <div className="relative h-[150px] w-full overflow-hidden" style={{ backgroundColor: `${color}08` }}>
          <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        </div>
      ) : (
        <div
          className="flex h-[120px] w-full items-center justify-center"
          style={{ backgroundColor: `${color}10` }}
        >
          <Icon className="size-12" style={{ color }} />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[15px] font-semibold text-[#1f2734] group-hover:text-[#2563eb] leading-tight">
          {book.title}
        </p>
        <p className="mt-1 text-sm text-[#6e7788]">{book.author}</p>
        {book.description ? (
          <p className="mt-2 text-[12px] leading-relaxed text-[#9ca3af] line-clamp-2">{book.description}</p>
        ) : null}
        {book.difficulty ? (
          <div className="mt-auto pt-3">
            <span className="text-[11px] font-medium text-[#9ca3af]">Сложность: {book.difficulty}</span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}

/* ── Book Form Modal ── */

interface BookFormData {
  id: string
  slug: string
  prefix: string
  title: string
  author: string
  description: string
  difficulty: string
  accentColor: string
  icon: string
  coverUrl: string
  sortOrder: number
}

const EMPTY_FORM: BookFormData = {
  id: "",
  slug: "",
  prefix: "",
  title: "",
  author: "",
  description: "",
  difficulty: "",
  accentColor: "#2563eb",
  icon: "spade",
  coverUrl: "",
  sortOrder: 0,
}

function BookFormModal({
  initial,
  isEditing,
  onClose,
  onSaved,
}: {
  initial: BookFormData
  isEditing: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<BookFormData>(initial)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const createMut = trpc.learningBooks.create.useMutation()
  const updateMut = trpc.learningBooks.update.useMutation()

  const set = (key: keyof BookFormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? "Upload failed")
      }
      const data = await res.json()
      set("coverUrl", data.url)
    } catch (e: any) {
      setError(e.message ?? "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith("image/")) handleUpload(file)
    },
    [handleUpload],
  )

  const handleSave = async () => {
    if (!form.id.trim() || !form.slug.trim() || !form.title.trim() || !form.author.trim() || !form.prefix.trim()) {
      setError("ID, Slug, Prefix, Title, and Author are required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isEditing) {
        await updateMut.mutateAsync({
          id: form.id,
          data: {
            slug: form.slug,
            prefix: form.prefix,
            title: form.title,
            author: form.author,
            description: form.description || null,
            difficulty: form.difficulty || null,
            accentColor: form.accentColor,
            icon: form.icon,
            coverUrl: form.coverUrl || null,
            sortOrder: form.sortOrder,
          },
        })
      } else {
        await createMut.mutateAsync({
          id: form.id,
          slug: form.slug,
          prefix: form.prefix,
          title: form.title,
          author: form.author,
          description: form.description || undefined,
          difficulty: form.difficulty || undefined,
          accentColor: form.accentColor,
          icon: form.icon,
          coverUrl: form.coverUrl || null,
          sortOrder: form.sortOrder,
        })
      }
      onSaved()
    } catch (e: any) {
      setError(e.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#1f2734]">
          <XIcon className="size-5" />
        </button>

        <h2 className="mb-4 text-lg font-semibold text-[#1f2734]">
          {isEditing ? "Редактирование книги" : "Новая книга"}
        </h2>

        {error ? (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="space-y-3">
          {!isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e7788]">ID</label>
                <input
                  value={form.id}
                  onChange={(e) => set("id", e.target.value)}
                  placeholder="e.g. dupont"
                  className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#6e7788]">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="e.g. dupont"
                  className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
                />
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-medium text-[#6e7788]">Prefix (for content filtering)</label>
            <input
              value={form.prefix}
              onChange={(e) => set("prefix", e.target.value)}
              placeholder="e.g. cnt_dupont"
              className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#6e7788]">Title</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#6e7788]">Author</label>
            <input
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-3 text-sm text-[#1f2734] placeholder:text-[#9ca3af] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#6e7788]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#d8dbe1] bg-white px-3 py-2 text-sm text-[#1f2734] placeholder:text-[#9ca3af] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6e7788]">Difficulty</label>
              <input
                value={form.difficulty}
                onChange={(e) => set("difficulty", e.target.value)}
                className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-3 text-sm text-[#1f2734] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6e7788]">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => set("accentColor", e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-[#d8dbe1] p-0.5"
                />
                <input
                  value={form.accentColor}
                  onChange={(e) => set("accentColor", e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-2 text-xs text-[#1f2734] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6e7788]">Icon</label>
              <select
                value={form.icon}
                onChange={(e) => set("icon", e.target.value)}
                className="h-9 w-full rounded-lg border border-[#d8dbe1] bg-white px-2 text-sm text-[#1f2734] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
              >
                <option value="spade">Spade</option>
                <option value="heart">Heart</option>
                <option value="diamond">Diamond</option>
                <option value="club">Club</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#6e7788]">Sort Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)}
              className="h-9 w-24 rounded-lg border border-[#d8dbe1] bg-white px-3 text-sm text-[#1f2734] focus:border-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#6b7280]/20"
            />
          </div>

          {/* Cover image upload */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6e7788]">Cover Image</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#d8dbe1] bg-[#f9fafb] p-4 transition hover:border-[#6b7280]"
            >
              {form.coverUrl ? (
                <div className="relative">
                  <img src={form.coverUrl} alt="Cover" className="h-24 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => set("coverUrl", "")}
                    className="absolute -right-2 -top-2 rounded-full bg-white p-0.5 shadow hover:bg-red-50"
                  >
                    <XIcon className="size-3.5 text-red-500" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadIcon className="size-6 text-[#9ca3af]" />
                  <p className="text-xs text-[#6e7788]">Drag & drop or click to upload</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-[#d8dbe1] bg-white px-3 py-1.5 text-xs font-medium text-[#6e7788] hover:bg-[#f3f4f6] disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Choose file"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#d8dbe1] bg-white px-4 py-2 text-sm font-medium text-[#6e7788] hover:bg-[#f3f4f6]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Book"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Delete Confirmation ── */

function DeleteConfirmModal({
  bookTitle,
  onConfirm,
  onCancel,
  deleting,
}: {
  bookTitle: string
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[#1f2734]">Удалить книгу?</h3>
        <p className="mt-2 text-sm text-[#6e7788]">
          Книга &quot;{bookTitle}&quot; будет удалена. Это действие нельзя отменить.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#d8dbe1] bg-white px-4 py-2 text-sm font-medium text-[#6e7788] hover:bg-[#f3f4f6]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */

export default function DashboardLearningPage() {
  const { data: session, status } = useSession()
  const sessionRoles = (session?.user?.globalRoles ?? []) as PortalRole[]
  const roles = normalizePortalRoles(sessionRoles)
  const isAdmin = sessionRoles.includes("admin")
  const isGuest = status === "unauthenticated"
  const currentUser = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
  }

  const booksQuery = trpc.learningBooks.list.useQuery()
  const deleteMut = trpc.learningBooks.delete.useMutation()
  const utils = trpc.useUtils()

  const [showManage, setShowManage] = useState(false)
  const [editingBook, setEditingBook] = useState<BookFormData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingBook, setDeletingBook] = useState<BookRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const books = booksQuery.data?.books ?? []

  const handleEditBook = (book: BookRow) => {
    setEditingBook({
      id: book.id,
      slug: book.slug,
      prefix: book.prefix,
      title: book.title,
      author: book.author,
      description: book.description ?? "",
      difficulty: book.difficulty ?? "",
      accentColor: book.accentColor ?? "#2563eb",
      icon: book.icon ?? "spade",
      coverUrl: book.coverUrl ?? "",
      sortOrder: book.sortOrder ?? 0,
    })
  }

  const handleFormSaved = () => {
    setEditingBook(null)
    setIsCreating(false)
    utils.learningBooks.list.invalidate()
  }

  const handleDelete = async () => {
    if (!deletingBook) return
    setDeleteLoading(true)
    try {
      await deleteMut.mutateAsync({ id: deletingBook.id })
      setDeletingBook(null)
      utils.learningBooks.list.invalidate()
    } catch {
      // error shown by mutation
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar visualVariant="dense" roles={roles} />
      <SidebarInset className="h-svh overflow-hidden bg-[#f6f7fb]">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[#d8dbe1] bg-[#f6f7fb]/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <DashboardFaviconToggle />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 [&[data-slot=separator]]:bg-[#cfd5df]" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard" className="text-[#6e7788]">Portal</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[#1f2734]">Learning</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TopbarGlobalSearch className="hidden sm:flex" />
            {!isGuest ? <TopbarNotifications /> : null}
            <TopbarUserMenu user={currentUser} isGuest={isGuest} />
          </div>
        </header>

        <main className="relative flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCapIcon className="size-6 text-[#2563eb]" />
                  <h1 className="text-2xl font-bold text-[#1f2734]">Обучение</h1>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setShowManage(!showManage)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#d8dbe1] bg-white px-3 py-1.5 text-sm font-medium text-[#6e7788] hover:bg-[#f3f4f6] transition"
                  >
                    <SettingsIcon className="size-4" />
                    Manage books
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[#6e7788]">Учебные материалы по розыгрышу и анализу из лучших бридж-книг</p>
            </div>

            {/* Admin management bar */}
            {isAdmin && showManage ? (
              <div className="mb-6 rounded-xl border border-[#d8dbe1] bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1f2734]">Manage Books</h3>
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-1 rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1d4ed8] transition"
                  >
                    <PlusIcon className="size-3.5" />
                    Add Book
                  </button>
                </div>
                <div className="divide-y divide-[#f3f4f6]">
                  {books.map((book) => (
                    <div key={book.id} className="flex items-center justify-between py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1f2734]">{book.title}</p>
                        <p className="text-xs text-[#9ca3af]">
                          slug: {book.slug} · prefix: {book.prefix} · order: {book.sortOrder}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditBook(book)}
                          className="rounded-lg p-1.5 text-[#6e7788] hover:bg-[#f3f4f6] hover:text-[#1f2734] transition"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBook(book)}
                          className="rounded-lg p-1.5 text-[#6e7788] hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {books.length === 0 ? (
                    <p className="py-4 text-center text-sm text-[#9ca3af]">No books yet</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Loading */}
            {booksQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2Icon className="size-6 animate-spin text-[#9ca3af]" />
              </div>
            ) : (
              /* Book cards */
              <div className="flex flex-wrap gap-6">
                {books.map((book) => (
                  <BookCard key={book.slug} book={book} />
                ))}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>

      {/* Modals */}
      {isCreating ? (
        <BookFormModal
          initial={EMPTY_FORM}
          isEditing={false}
          onClose={() => setIsCreating(false)}
          onSaved={handleFormSaved}
        />
      ) : null}

      {editingBook ? (
        <BookFormModal
          initial={editingBook}
          isEditing={true}
          onClose={() => setEditingBook(null)}
          onSaved={handleFormSaved}
        />
      ) : null}

      {deletingBook ? (
        <DeleteConfirmModal
          bookTitle={deletingBook.title}
          onConfirm={handleDelete}
          onCancel={() => setDeletingBook(null)}
          deleting={deleteLoading}
        />
      ) : null}
    </SidebarProvider>
  )
}
