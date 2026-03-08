import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Plus, Search, Filter, Send, Heart, Flame, ThumbsUp,
  Lightbulb, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Trash2, X, Clock,
  MessageCircle, Loader2, Pin, Zap, Image, LogIn,
  TrendingUp, Users, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { forumApi, notificationsApi } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { containsProfanity, extractProfanityError } from '@/lib/profanityFilter'

interface PostAuthor {
  user_id: string
  full_name: string
  user_type: string
}

interface ReactionSummary {
  like: number
  love: number
  fire: number
  insightful: number
  hot_take: number
  total: number
}

interface Post {
  post_id: string
  title: string
  content: string
  category: string
  tags: string[]
  images?: string[]
  author: PostAuthor
  reactions: ReactionSummary
  user_reaction?: string
  comment_count: number
  created_at: string
  updated_at?: string
  is_pinned: boolean
}

interface Comment {
  comment_id: string
  post_id: string
  content: string
  author: PostAuthor
  parent_id?: string
  reactions: ReactionSummary
  user_reaction?: string
  created_at: string
  replies: Comment[]
}

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-stone-100 text-stone-700', borderColor: 'border-stone-200' },
  { value: 'research', label: 'Research', color: 'bg-blue-50 text-blue-700', borderColor: 'border-blue-200' },
  { value: 'identification', label: 'Identification', color: 'bg-orange-50 text-orange-700', borderColor: 'border-orange-200' },
  { value: 'cultivation', label: 'Cultivation', color: 'bg-green-50 text-green-700', borderColor: 'border-green-200' },
  { value: 'recipes', label: 'Recipes', color: 'bg-amber-50 text-amber-700', borderColor: 'border-amber-200' },
  { value: 'marketplace', label: 'Marketplace', color: 'bg-purple-50 text-purple-700', borderColor: 'border-purple-200' },
  { value: 'announcements', label: 'Announcements', color: 'bg-red-50 text-red-700', borderColor: 'border-red-200' },
]

const REACTIONS = [
  { type: 'like', icon: ThumbsUp, label: 'Like', activeColor: 'text-blue-600 bg-blue-50 border-blue-200' },
  { type: 'love', icon: Heart, label: 'Love', activeColor: 'text-rose-600 bg-rose-50 border-rose-200' },
  { type: 'fire', icon: Flame, label: 'Fire', activeColor: 'text-orange-600 bg-orange-50 border-orange-200' },
  { type: 'insightful', icon: Lightbulb, label: 'Insightful', activeColor: 'text-amber-600 bg-amber-50 border-amber-200' },
  { type: 'hot_take', icon: Zap, label: 'Hot Take', activeColor: 'text-red-600 bg-red-50 border-red-200' },
]

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm',
    researcher: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm',
    user: 'bg-stone-100 text-stone-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[role] || styles.user}`}>
      {role}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find(c => c.value === category)
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cat?.color || 'bg-stone-100 text-stone-600'} ${cat?.borderColor || 'border-stone-200'}`}>
      {cat?.label || category}
    </span>
  )
}

function ImageCarousel({ images, height = 'h-64', rounded = 'rounded-xl' }: { images: string[]; height?: string; rounded?: string }) {
  const [current, setCurrent] = useState(0)

  if (!images || images.length === 0) return null

  if (images.length === 1) {
    return (
      <img src={images[0]} alt="Post image" className={`w-full ${height} object-cover ${rounded} border border-border shadow-sm`} />
    )
  }

  return (
    <div className="relative group">
      <div className={`relative overflow-hidden ${rounded}`}>
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {images.map((url, i) => (
            <img key={i} src={url} alt={`Image ${i + 1}`} className={`w-full ${height} object-cover shrink-0`} />
          ))}
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={(e) => { e.stopPropagation(); setCurrent(p => (p - 1 + images.length) % images.length) }}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg backdrop-blur-sm"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setCurrent(p => (p + 1) % images.length) }}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg backdrop-blur-sm"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
            className={`w-2 h-2 rounded-full transition-all shadow-sm ${i === current ? 'bg-white w-4' : 'bg-white/60 hover:bg-white/80'}`}
          />
        ))}
      </div>

      {/* Counter badge */}
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold">
        {current + 1}/{images.length}
      </span>
    </div>
  )
}

export default function Forum() {
  const { isAuthenticated, user } = useAuthStore()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [posts, setPosts] = useState<Post[]>([])
  const [totalPosts, setTotalPosts] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  // New post form
  const [showNewPost, setShowNewPost] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Active post detail
  const [activePost, setActivePost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)

  // Refresh header notification badge
  const refreshNotifCount = useCallback(async () => {
    if (!isAuthenticated) return
    try { await notificationsApi.getUnreadCount() } catch { /* silent */ }
  }, [isAuthenticated])

  // Auto-open a post from URL query (?post=xxx)
  useEffect(() => {
    const postId = searchParams.get('post')
    if (postId) {
      setSearchParams({}, { replace: true }) // clear query param
      ;(async () => {
        try {
          const post = await forumApi.getPost(postId)
          if (post) {
            setActivePost(post)
            setLoadingComments(true)
            const data = await forumApi.listComments(postId)
            setComments(data || [])
            setLoadingComments(false)
          }
        } catch { /* post may not exist */ }
      })()
    }
  }, [searchParams, setSearchParams])

  const fetchPosts = async () => {
    setIsLoading(true)
    try {
      const data = await forumApi.listPosts(page, 20, filterCategory || undefined, searchQuery || undefined)
      setPosts(data.items || [])
      setTotalPosts(data.total || 0)
    } catch {
      console.error('Failed to load forum posts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [page, filterCategory]) // eslint-disable-line

  const handleSearch = () => {
    setPage(1)
    fetchPosts()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setIsUploadingImage(true)
    try {
      const uploadPromises = Array.from(files).map(file => forumApi.uploadImage(file))
      const results = await Promise.all(uploadPromises)
      const urls = results.map(r => r.url)
      setUploadedImages(prev => [...prev, ...urls])
      toast({ title: 'Images uploaded!', description: `${files.length} image(s) ready to attach.` })
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload images.', variant: 'destructive' })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) return
    if (newTitle.trim().length < 3) {
      toast({ title: 'Title too short', description: 'Title must be at least 3 characters.', variant: 'destructive' })
      return
    }
    if (newContent.trim().length < 10) {
      toast({ title: 'Content too short', description: 'Content must be at least 10 characters.', variant: 'destructive' })
      return
    }
    // Client-side profanity pre-check
    if (containsProfanity(newTitle)) {
      toast({ title: '⚠️ Inappropriate Language', description: 'Your title contains words that are not allowed. Please revise before posting.', variant: 'destructive' })
      return
    }
    if (containsProfanity(newContent)) {
      toast({ title: '⚠️ Inappropriate Language', description: 'Your content contains words that are not allowed. Please revise before posting.', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    try {
      await forumApi.createPost({ 
        title: newTitle, 
        content: newContent, 
        category: newCategory,
        images: uploadedImages 
      })
      toast({ title: 'Post created!', description: 'Your post is now live.' })
      setNewTitle('')
      setNewContent('')
      setNewCategory('general')
      setUploadedImages([])
      setShowNewPost(false)
      setPage(1)
      fetchPosts()
    } catch (err: unknown) {
      const profanityMsg = extractProfanityError(err)
      if (profanityMsg) {
        toast({ title: '⚠️ Inappropriate Language', description: profanityMsg, variant: 'destructive' })
      } else {
        let msg = 'Failed to create post.'
        if (err && typeof err === 'object' && 'response' in err) {
          const resp = (err as { response?: { data?: { detail?: Array<{ msg: string; loc: string[] }> | string } } }).response
          const detail = resp?.data?.detail
          if (Array.isArray(detail)) {
            msg = detail.map(d => d.msg).join('. ')
          } else if (typeof detail === 'string') {
            msg = detail
          }
        }
        toast({ title: 'Error', description: msg, variant: 'destructive' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    try {
      await forumApi.deletePost(postId)
      toast({ title: 'Deleted', description: 'Post removed.' })
      if (activePost?.post_id === postId) setActivePost(null)
      fetchPosts()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' })
    }
  }

  const handleReactToPost = async (postId: string, reactionType: string) => {
    if (!isAuthenticated) {
      toast({ title: 'Sign in required', description: 'Create an account to react to posts.', variant: 'destructive' })
      return
    }
    try {
      await forumApi.reactToPost(postId, reactionType)
      fetchPosts()
      if (activePost?.post_id === postId) {
        const updated = await forumApi.getPost(postId)
        setActivePost(updated)
      }
      refreshNotifCount()
    } catch {
      // silent
    }
  }

  // Comments
  const openPost = async (post: Post) => {
    setActivePost(post)
    setLoadingComments(true)
    try {
      const data = await forumApi.listComments(post.post_id)
      setComments(data || [])
    } catch {
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async () => {
    if (!activePost || !newComment.trim()) return
    // Profanity pre-check
    if (containsProfanity(newComment)) {
      toast({ title: '⚠️ Inappropriate Language', description: 'Your comment contains words that are not allowed. Please revise.', variant: 'destructive' })
      return
    }
    try {
      await forumApi.createComment(activePost.post_id, { content: newComment })
      setNewComment('')
      const data = await forumApi.listComments(activePost.post_id)
      setComments(data || [])
      fetchPosts()
      refreshNotifCount()
    } catch (err: unknown) {
      const profanityMsg = extractProfanityError(err)
      toast({ title: profanityMsg ? '⚠️ Inappropriate Language' : 'Error', description: profanityMsg || 'Failed to add comment.', variant: 'destructive' })
    }
  }

  const handleAddReply = async (parentId: string) => {
    if (!activePost || !replyContent.trim()) return
    // Profanity pre-check
    if (containsProfanity(replyContent)) {
      toast({ title: '⚠️ Inappropriate Language', description: 'Your reply contains words that are not allowed. Please revise.', variant: 'destructive' })
      return
    }
    try {
      await forumApi.createComment(activePost.post_id, { content: replyContent, parent_id: parentId })
      setReplyTo(null)
      setReplyContent('')
      const data = await forumApi.listComments(activePost.post_id)
      setComments(data || [])
      fetchPosts()
      refreshNotifCount()
    } catch (err: unknown) {
      const profanityMsg = extractProfanityError(err)
      toast({ title: profanityMsg ? '⚠️ Inappropriate Language' : 'Error', description: profanityMsg || 'Failed to reply.', variant: 'destructive' })
    }
  }

  const handleReactToComment = async (commentId: string, reactionType: string) => {
    if (!isAuthenticated || !activePost) return
    try {
      await forumApi.reactToComment(commentId, reactionType)
      const data = await forumApi.listComments(activePost.post_id)
      setComments(data || [])
      refreshNotifCount()
    } catch {
      // silent
    }
  }

  const totalPages = Math.ceil(totalPosts / 20)

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            Community Forum
          </h1>
          <p className="text-foreground-secondary text-sm mt-1.5 ml-[52px]">
            Discuss chili cultivation, research, recipes, and more with the community
          </p>
        </div>
        {isAuthenticated ? (
          <Button onClick={() => setShowNewPost(true)} className="gap-1.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 shadow-md shadow-red-200/40 h-10 px-5">
            <Plus className="h-4 w-4" /> New Post
          </Button>
        ) : (
          <a href="/register">
            <Button className="gap-1.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 shadow-md shadow-red-200/40 h-10 px-5">
              <LogIn className="h-4 w-4" /> Join to Post
            </Button>
          </a>
        )}
      </div>

      {/* Guest banner */}
      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 border border-amber-200/60 p-5"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-orange-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-0.5">Welcome, Guest! 👋</p>
              <p className="text-sm text-amber-700">
                You're browsing in read-only mode. <a href="/login" className="font-bold underline underline-offset-2 hover:text-red-700 transition-colors">Sign in</a> or <a href="/register" className="font-bold underline underline-offset-2 hover:text-red-700 transition-colors">create an account</a> to post, comment, and react.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-100/60">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Posts</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalPosts}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100/60">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Categories</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{CATEGORIES.length}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100/60">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Page</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{page} / {totalPages || 1}</p>
        </div>
      </div>

      {/* Search + filters */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 h-10 rounded-xl border-border focus-visible:ring-red-200"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-4 w-4 text-foreground-muted shrink-0" />
              <Button
                variant={!filterCategory ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setFilterCategory(null); setPage(1) }}
                className={`h-8 text-xs rounded-full ${!filterCategory ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white' : ''}`}
              >All</Button>
              {CATEGORIES.map(c => (
                <Button
                  key={c.value}
                  variant={filterCategory === c.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setFilterCategory(c.value); setPage(1) }}
                  className={`h-8 text-xs rounded-full ${filterCategory === c.value ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white' : 'hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
                >{c.label}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowNewPost(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-lg font-bold font-display">Create New Post</h2>
                </div>
                <button onClick={() => setShowNewPost(false)} className="p-2 hover:bg-surface rounded-xl transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Title</label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What's on your mind?" className="h-11 rounded-xl" maxLength={200} />
                  <p className={`text-[11px] mt-1.5 ${newTitle.trim().length > 0 && newTitle.trim().length < 3 ? 'text-red-500' : 'text-foreground-muted'}`}>
                    {newTitle.trim().length}/200 {newTitle.trim().length > 0 && newTitle.trim().length < 3 && '· Min 3 characters'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-11 px-4 border border-input rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Content</label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Share your thoughts, questions, or discoveries..."
                    rows={5}
                    maxLength={5000}
                    className="w-full px-4 py-3 border border-input rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none transition-all"
                  />
                  <p className={`text-[11px] mt-1.5 ${newContent.trim().length > 0 && newContent.trim().length < 10 ? 'text-red-500' : 'text-foreground-muted'}`}>
                    {newContent.trim().length}/5000 {newContent.trim().length > 0 && newContent.trim().length < 10 && '· Min 10 characters'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block flex items-center gap-1.5">
                    <Image className="h-4 w-4 text-foreground-muted" /> Images (optional)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/jfif,.jfif"
                      multiple
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="block w-full text-sm text-foreground-secondary file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-600 hover:file:bg-red-100 transition-colors cursor-pointer"
                    />
                    {uploadedImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {uploadedImages.map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt={`Upload ${i + 1}`} className="h-20 w-20 object-cover rounded-xl border border-border shadow-sm" />
                            <button
                              onClick={() => setUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {isUploadingImage && (
                      <div className="flex items-center gap-2 text-xs text-foreground-muted">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-border bg-stone-50/50 rounded-b-2xl shrink-0">
                <Button variant="outline" onClick={() => setShowNewPost(false)} className="rounded-xl px-5">Cancel</Button>
                <Button onClick={handleCreatePost} disabled={isSubmitting || newTitle.trim().length < 3 || newContent.trim().length < 10} className="rounded-xl px-5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Publish
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {activePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActivePost(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col"
            >
              {/* Post header */}
              <div className="p-6 border-b border-border shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <CategoryBadge category={activePost.category} />
                      {activePost.is_pinned && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold font-display text-foreground leading-tight">{activePost.title}</h2>
                    <div className="flex items-center gap-2.5 mt-3 text-xs text-foreground-muted">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                        {activePost.author.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-foreground-secondary">{activePost.author.full_name}</span>
                      <RoleBadge role={activePost.author.user_type} />
                      <span className="text-foreground-muted">·</span>
                      <span className="flex items-center gap-1 text-foreground-muted"><Clock className="h-3 w-3" /> {timeAgo(activePost.created_at)}</span>
                    </div>
                  </div>
                  <button onClick={() => setActivePost(null)} className="p-2 hover:bg-surface rounded-xl transition-colors ml-3">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Post body + comments (scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{activePost.content}</p>

                {/* Images */}
                {activePost.images && activePost.images.length > 0 && (
                  <ImageCarousel images={activePost.images} height="h-72" rounded="rounded-xl" />
                )}

                {/* Reactions bar — visible to all, clickable only for authenticated */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {REACTIONS.map(r => {
                    const Icon = r.icon
                    const count = activePost.reactions[r.type as keyof ReactionSummary] as number
                    const isActive = activePost.user_reaction === r.type
                    return (
                      <button
                        key={r.type}
                        onClick={() => handleReactToPost(activePost.post_id, r.type)}
                        title={isAuthenticated ? r.label : `Sign in to react with ${r.label}`}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border ${
                          isActive ? r.activeColor : count > 0 ? 'border-border bg-stone-50 text-foreground-secondary hover:bg-red-50 hover:border-red-200' : 'border-border/60 hover:bg-stone-50 text-foreground-muted'
                        } ${!isAuthenticated ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {count > 0 && <span>{count}</span>}
                      </button>
                    )
                  })}
                  {activePost.reactions.total > 0 && (
                    <span className="text-xs text-foreground-muted ml-2 font-medium">{activePost.reactions.total} reactions</span>
                  )}
                </div>

                {/* Comments section */}
                <div className="border-t border-border pt-5">
                  <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-foreground-secondary" />
                    </div>
                    Comments ({activePost.comment_count})
                  </h3>

                  {loadingComments ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="h-6 w-6 text-foreground-muted" />
                      </div>
                      <p className="text-sm text-foreground-muted">No comments yet. {isAuthenticated ? 'Be the first to share your thoughts!' : 'Sign in to comment.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map(comment => (
                        <div key={comment.comment_id} className="space-y-2">
                          {/* Main comment */}
                          <div className="p-4 bg-stone-50/80 rounded-xl border border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-[9px] font-bold shadow-sm">
                                {comment.author.full_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-foreground">{comment.author.full_name}</span>
                              <RoleBadge role={comment.author.user_type} />
                              <span className="text-[10px] text-foreground-muted ml-auto">{timeAgo(comment.created_at)}</span>
                            </div>
                            <p className="text-sm text-foreground-secondary leading-relaxed">{comment.content}</p>
                            <div className="flex items-center gap-2 mt-3">
                              {REACTIONS.slice(0, 3).map(r => {
                                const Icon = r.icon
                                const count = comment.reactions[r.type as keyof ReactionSummary] as number
                                return (
                                  <button
                                    key={r.type}
                                    onClick={() => isAuthenticated && handleReactToComment(comment.comment_id, r.type)}
                                    className={`flex items-center gap-0.5 text-[11px] px-2 py-1 rounded-lg transition-colors ${
                                      count > 0 ? 'bg-red-50 text-red-600' : 'text-foreground-muted hover:text-foreground-secondary'
                                    } ${!isAuthenticated ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    <Icon className="h-3 w-3" /> {count > 0 && count}
                                  </button>
                                )
                              })}
                              {isAuthenticated && (
                                <button
                                  onClick={() => setReplyTo(replyTo === comment.comment_id ? null : comment.comment_id)}
                                  className="text-[11px] text-foreground-muted hover:text-red-600 transition-colors ml-auto font-medium"
                                >
                                  Reply
                                </button>
                              )}
                            </div>
                            {/* Reply input */}
                            {replyTo === comment.comment_id && (
                              <div className="flex gap-2 mt-3">
                                <Input
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder="Write a reply..."
                                  className="h-9 text-xs rounded-xl"
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.comment_id)}
                                />
                                <Button size="sm" className="h-9 px-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-500" onClick={() => handleAddReply(comment.comment_id)}>
                                  <Send className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {/* Replies */}
                          {comment.replies.length > 0 && (
                            <div className="ml-8 space-y-2 border-l-2 border-red-100 pl-4">
                              {comment.replies.map(reply => (
                                <div key={reply.comment_id} className="p-3 bg-white rounded-xl border border-border/50">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[8px] font-bold">
                                      {reply.author.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-[11px] font-semibold text-foreground">{reply.author.full_name}</span>
                                    <RoleBadge role={reply.author.user_type} />
                                    <span className="text-[10px] text-foreground-muted ml-auto">{timeAgo(reply.created_at)}</span>
                                  </div>
                                  <p className="text-xs text-foreground-secondary leading-relaxed">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Comment input (bottom) */}
              {isAuthenticated ? (
                <div className="p-5 border-t border-border shrink-0 bg-stone-50/50 rounded-b-2xl">
                  <div className="flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="h-10 rounded-xl"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <Button onClick={handleAddComment} disabled={!newComment.trim()} className="h-10 px-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-border shrink-0 bg-amber-50/50 rounded-b-2xl">
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-700">
                    <LogIn className="h-4 w-4" />
                    <span><a href="/login" className="font-bold underline hover:text-red-700">Sign in</a> to join the conversation</span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse border border-border shadow-sm">
              <div className="flex gap-3 mb-3">
                <div className="h-5 bg-stone-100 rounded-full w-20" />
                <div className="h-5 bg-stone-100 rounded-full w-16" />
              </div>
              <div className="h-6 bg-stone-100 rounded-lg w-3/4 mb-3" />
              <div className="h-4 bg-stone-50 rounded w-full mb-2" />
              <div className="h-4 bg-stone-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center mb-6 shadow-inner">
              <MessageSquare className="h-9 w-9 text-red-300" />
            </div>
            <h2 className="text-xl font-bold font-display text-foreground mb-2">No posts yet</h2>
            <p className="text-foreground-secondary text-sm text-center max-w-md mb-8">
              {isAuthenticated ? 'Be the first to start a discussion in the community!' : 'Sign in to create the first post and start the conversation.'}
            </p>
            {isAuthenticated ? (
              <Button onClick={() => setShowNewPost(true)} className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 rounded-xl h-11 px-6 shadow-md">
                <Plus className="h-4 w-4 mr-1.5" /> Create First Post
              </Button>
            ) : (
              <a href="/register">
                <Button className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 rounded-xl h-11 px-6 shadow-md">
                  <LogIn className="h-4 w-4 mr-1.5" /> Sign Up to Post
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <motion.div key={post.post_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div
                className="bg-white rounded-2xl cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-100/30 transition-all duration-300 group border border-border shadow-sm overflow-hidden"
                onClick={() => openPost(post)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Category + pinned */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <CategoryBadge category={post.category} />
                        {post.is_pinned && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                            <Pin className="h-3 w-3" /> Pinned
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-foreground group-hover:text-red-600 transition-colors text-base mb-1.5 line-clamp-1">
                        {post.title}
                      </h3>

                      {/* Image preview */}
                      {post.images && post.images.length > 0 && (
                        <div className="mb-3 rounded-xl overflow-hidden">
                          <ImageCarousel images={post.images} height="h-36" rounded="rounded-xl" />
                        </div>
                      )}

                      {/* Content preview */}
                      <p className="text-sm text-foreground-secondary line-clamp-2 mb-4 leading-relaxed">
                        {post.content}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 text-xs text-foreground-muted flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-[9px] font-bold shadow-sm">
                            {post.author.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-foreground-secondary">{post.author.full_name}</span>
                          <RoleBadge role={post.author.user_type} />
                        </div>
                        <span className="text-border">|</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(post.created_at)}</span>
                        <span className="text-border">|</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {post.comment_count}</span>
                        {post.reactions.total > 0 && (
                          <>
                            <span className="text-border">|</span>
                            <span className="flex items-center gap-1">
                              {post.reactions.fire > 0 && <Flame className="h-3 w-3 text-orange-500" />}
                              {post.reactions.love > 0 && <Heart className="h-3 w-3 text-rose-400" />}
                              {post.reactions.like > 0 && <ThumbsUp className="h-3 w-3 text-blue-400" />}
                              <span className="font-medium">{post.reactions.total}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Delete button for own posts / admin */}
                    {isAuthenticated && (post.author.user_id === user?.id || user?.role === 'admin') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePost(post.post_id) }}
                        className="p-2 text-foreground-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPosts > 20 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-xl h-9 px-4 gap-1.5">
            <ChevronDown className="h-4 w-4 rotate-90" /> Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                    page === pageNum ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md' : 'text-foreground-secondary hover:bg-stone-100'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            {totalPages > 5 && <span className="text-foreground-muted px-1">...</span>}
          </div>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="rounded-xl h-9 px-4 gap-1.5">
            Next <ChevronUp className="h-4 w-4 rotate-90" />
          </Button>
        </div>
      )}
    </div>
  )
}
