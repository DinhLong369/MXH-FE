<script setup lang="ts">
import {
  MessageCircle, Share2, Bookmark, Trash2, Sparkles, Send, CheckCircle2, X,
} from 'lucide-vue-next'
import type { Post, ReactionType } from '~/types'

const store = useSocialStore()
const { filteredPosts, currentUser, selectedTag, highlightPostId } = storeToRefs(store)

const commentInputs = reactive<Record<string, string>>({})
const expandedComments = reactive<Record<string, boolean>>({})
const activeReactionMenu = ref<string | null>(null)

// Cuộn + làm nổi bật bài viết khi bấm từ thông báo
watch(
  highlightPostId,
  async (id) => {
    if (!id) return
    expandedComments[id] = true
    await nextTick()
    const el = document.getElementById(`feed-post-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => store.clearHighlight(), 2600)
  },
  { immediate: true },
)

async function share(postId: string) {
  const url = `${window.location.origin}/?post=${postId}`
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // clipboard có thể bị chặn — vẫn tăng đếm chia sẻ
  }
  store.sharePost(postId)
}

const reactionEmojis: { type: ReactionType; label: string; icon: string }[] = [
  { type: 'like', label: 'Thích', icon: '👍' },
  { type: 'love', label: 'Yêu thích', icon: '❤️' },
  { type: 'haha', label: 'Haha', icon: '😆' },
  { type: 'wow', label: 'Wow', icon: '😮' },
  { type: 'sad', label: 'Buồn', icon: '😢' },
  { type: 'angry', label: 'Phẫn nộ', icon: '😡' },
]

function reactionIcon(post: Post): string {
  return reactionEmojis.find((r) => r.type === post.myReaction)?.icon || '👍'
}

function sendComment(postId: string) {
  const text = commentInputs[postId]
  if (!text || !text.trim()) return
  store.addComment(postId, text)
  commentInputs[postId] = ''
  expandedComments[postId] = true
}

function getRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (mins < 1) return 'Vừa xong'
    if (mins < 60) return `${mins} phút trước`
    if (hours < 24) return `${hours} giờ trước`
    return `${days} ngày trước`
  } catch {
    return 'Gần đây'
  }
}

function react(postId: string, type: ReactionType) {
  store.likePost(postId, type)
  activeReactionMenu.value = null
}
</script>

<template>
  <div class="flex-1 max-w-2xl px-4 py-6 md:px-0 w-full">
    <!-- Header / filter -->
    <div class="mb-6 flex items-center justify-between">
      <h2 class="text-lg font-bold text-slate-100 uppercase tracking-tight">
        <span v-if="selectedTag" class="flex items-center gap-2">
          Bài viết về <span class="text-indigo-400">#{{ selectedTag }}</span>
        </span>
        <span v-else>Bảng tin hoạt động</span>
      </h2>
      <button
        v-if="selectedTag"
        class="flex items-center gap-1.5 rounded-full bg-slate-800 hover:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition border border-slate-700"
        @click="store.setSelectedTag(null)"
      >
        <span>Hiển thị tất cả</span>
        <X class="h-3.5 w-3.5 text-slate-400" />
      </button>
    </div>

    <!-- Quick compose -->
    <div
      class="mb-6 cursor-pointer rounded-3xl border border-slate-800 bg-slate-800/70 p-4 shadow-lg shadow-black/20 hover:border-slate-700 transition flex items-center gap-4"
      @click="store.openCreateModal()"
    >
      <img :src="currentUser.avatar" :alt="currentUser.name" class="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-500/20" referrerpolicy="no-referrer">
      <div class="flex-1 rounded-xl bg-slate-950/95 hover:bg-slate-950 px-4 py-3 text-sm text-slate-400 font-medium border border-slate-800 transition">
        {{ currentUser.name }} ơi, bạn đang nghĩ gì thế? Chia sẻ ý kiến hay dùng AI soạn bài nhé...
      </div>
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/10">
        <Sparkles class="h-5 w-5 animate-pulse text-yellow-300" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredPosts.length === 0" class="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
      <p class="text-sm font-semibold text-slate-300 mb-2">Chưa tìm thấy bài viết nào có hashtag #{{ selectedTag }}</p>
      <p class="text-xs text-slate-500 mb-4">Hãy quay về trang chính để hiện đầy đủ các chủ đề khác.</p>
      <button class="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white px-4 py-2.5 transition" @click="store.setSelectedTag(null)">
        Xem dòng thời gian chính
      </button>
    </div>

    <!-- Posts -->
    <div v-else class="flex flex-col gap-6 pb-12">
      <Motion
        v-for="(post, i) in filteredPosts"
        :key="post.id"
        :initial="{ opacity: 0, y: 24, scale: 0.98 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.45, delay: Math.min(5, i) * 0.08, type: 'spring', stiffness: 100, damping: 16 }"
        as="article"
        :id="`feed-post-${post.id}`"
        class="rounded-3xl border bg-slate-800/60 hover:bg-slate-800/85 shadow-lg shadow-black/20 transition card-shine-hover group/card"
        :class="highlightPostId === post.id ? 'border-indigo-500 ring-2 ring-indigo-500/40' : 'border-slate-800 hover:border-indigo-500/30'"
      >
        <div class="p-5">
          <!-- Author -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="relative">
                <img :src="post.authorAvatar" :alt="post.authorName" class="h-10 w-10 rounded-full object-cover ring-2 ring-slate-800/80 cursor-pointer hover:ring-indigo-400/50 transition" referrerpolicy="no-referrer" @click="store.viewProfile(post.userId)">
                <span class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-800" />
              </div>
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="text-sm font-bold text-slate-100 hover:text-indigo-400 hover:underline cursor-pointer" @click="store.viewProfile(post.userId)">{{ post.authorName }}</h3>
                  <CheckCircle2 class="h-3.5 w-3.5 fill-indigo-500 text-slate-800" />
                  <span class="font-mono text-[9px] text-slate-500 font-medium">@{{ post.authorUsername }}</span>
                  <span v-if="post.userId !== currentUser.id" class="rounded bg-indigo-950/60 px-1.5 py-0.5 font-bold text-[8px] text-indigo-400 border border-indigo-500/25">AI Bot</span>
                </div>
                <p class="text-[10px] font-medium text-slate-500 mt-0.5">{{ getRelativeTime(post.createdAt) }}</p>
              </div>
            </div>
            <button
              v-if="post.userId === currentUser.id"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 transition"
              title="Xóa bài đăng"
              @click="store.deletePost(post.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Content -->
          <div class="text-[15px] text-slate-200 whitespace-pre-wrap leading-relaxed mb-4">{{ post.content }}</div>

          <!-- Tags -->
          <div v-if="post.tags.length" class="flex flex-wrap gap-1.5 mb-4">
            <button
              v-for="tag in post.tags"
              :key="tag"
              class="rounded-full bg-slate-950/95 hover:bg-indigo-950/40 px-2.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/20 transition"
              @click="store.setSelectedTag(tag)"
            >
              #{{ tag }}
            </button>
          </div>

          <!-- Image -->
          <div v-if="post.imageUrl" class="mb-4 overflow-hidden rounded-2xl border border-slate-800">
            <img :src="post.imageUrl" :alt="post.content.slice(0, 40)" class="w-full max-h-[460px] object-cover" referrerpolicy="no-referrer">
          </div>

          <!-- Stats -->
          <div class="flex items-center justify-between text-[11px] text-slate-500 mb-3">
            <span>{{ post.likesCount }} lượt thích</span>
            <span>{{ post.commentsCount }} bình luận · {{ post.sharesCount }} chia sẻ</span>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between border-t border-slate-800 pt-2">
            <div class="relative">
              <button
                class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                :class="post.isLiked ? 'text-indigo-400 bg-indigo-950/30' : 'text-slate-400 hover:bg-slate-800'"
                @click="store.likePost(post.id, post.myReaction)"
                @mouseenter="activeReactionMenu = post.id"
              >
                <span class="text-base leading-none">{{ reactionIcon(post) }}</span>
                <span>{{ post.isLiked ? reactionEmojis.find(r => r.type === post.myReaction)?.label : 'Thích' }}</span>
              </button>

              <AnimatePresence>
                <Motion
                  v-if="activeReactionMenu === post.id"
                  :initial="{ opacity: 0, y: 8, scale: 0.9 }"
                  :animate="{ opacity: 1, y: 0, scale: 1 }"
                  :exit="{ opacity: 0, y: 8, scale: 0.9 }"
                  class="absolute bottom-full left-0 mb-2 flex gap-1 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl z-20"
                  @mouseleave="activeReactionMenu = null"
                >
                  <button
                    v-for="r in reactionEmojis"
                    :key="r.type"
                    :title="r.label"
                    class="text-2xl transition hover:scale-125"
                    @click="react(post.id, r.type)"
                  >
                    {{ r.icon }}
                  </button>
                </Motion>
              </AnimatePresence>
            </div>

            <button class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 transition" @click="expandedComments[post.id] = !expandedComments[post.id]">
              <MessageCircle class="h-4 w-4" />
              <span>Bình luận</span>
            </button>

            <button class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 transition" @click="share(post.id)">
              <Share2 class="h-4 w-4" />
              <span>Chia sẻ</span>
            </button>

            <button
              class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
              :class="post.isSaved ? 'text-amber-400 bg-amber-950/20' : 'text-slate-400 hover:bg-slate-800'"
              @click="store.savePost(post.id)"
            >
              <Bookmark class="h-4 w-4" :class="post.isSaved ? 'fill-amber-400' : ''" />
              <span>Lưu</span>
            </button>
          </div>

          <!-- Comments -->
          <div v-if="expandedComments[post.id] || post.comments.length" class="mt-3 border-t border-slate-800 pt-3 space-y-3">
            <CommentItem
              v-for="c in post.comments"
              :key="c.id"
              :comment="c"
              :post-id="post.id"
            />

            <!-- Comment input -->
            <div class="flex items-center gap-2.5">
              <img :src="currentUser.avatar" :alt="currentUser.name" class="h-8 w-8 rounded-full object-cover" referrerpolicy="no-referrer">
              <div class="flex-1 flex items-center gap-2 rounded-2xl bg-slate-950 px-3.5 py-1.5 border border-slate-800 focus-within:border-indigo-500/40">
                <input
                  v-model="commentInputs[post.id]"
                  type="text"
                  placeholder="Viết bình luận..."
                  class="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  @keyup.enter="sendComment(post.id)"
                >
                <button class="text-indigo-400 hover:text-indigo-300 disabled:opacity-40" :disabled="!commentInputs[post.id]?.trim()" @click="sendComment(post.id)">
                  <Send class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Motion>
    </div>
  </div>
</template>
