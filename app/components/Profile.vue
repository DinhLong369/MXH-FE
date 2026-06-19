<script setup lang="ts">
import {
  ArrowLeft,
  Bookmark,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  MessageCircle,
  Pencil,
  Send,
  Share2,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-vue-next'
import type { Post, ReactionType } from '~/types'

const store = useSocialStore()
const { posts, followedBots, viewedUser, isViewingSelf, bots, currentUser } = storeToRefs(store)

const profilePosts = computed(() => posts.value.filter((p) => p.userId === viewedUser.value.id))
const viewedBot = computed(() => bots.value.find((b) => b.id === viewedUser.value.id) || null)

const isEditing = ref(false)
const form = reactive({ name: '', bio: '', avatar: '', cover: '' })
const fileError = ref('')
const commentInputs = reactive<Record<string, string>>({})
const expandedComments = reactive<Record<string, boolean>>({})
const activeReactionMenu = ref<string | null>(null)

const reactionEmojis: { type: ReactionType; label: string; icon: string }[] = [
  { type: 'like', label: 'Thích', icon: '👍' },
  { type: 'love', label: 'Yêu thích', icon: '❤️' },
  { type: 'haha', label: 'Haha', icon: '😆' },
  { type: 'wow', label: 'Wow', icon: '😮' },
  { type: 'sad', label: 'Buồn', icon: '😢' },
  { type: 'angry', label: 'Phẫn nộ', icon: '😡' },
]

function openEdit() {
  form.name = viewedUser.value.name
  form.bio = viewedUser.value.bio
  form.avatar = viewedUser.value.avatar
  form.cover = viewedUser.value.cover
  fileError.value = ''
  isEditing.value = true
}

function saveEdit() {
  store.updateProfile(form.name.trim() || viewedUser.value.name, form.bio, form.avatar, form.cover)
  isEditing.value = false
}

function handleProfileFile(event: Event, target: 'avatar' | 'cover') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    fileError.value = 'Vui lòng chọn đúng tệp hình ảnh.'
    input.value = ''
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    fileError.value = 'Ảnh tối đa 2MB để hồ sơ lưu ổn định trên trình duyệt.'
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result
    if (typeof result === 'string') {
      form[target] = result
      fileError.value = ''
    }
  }
  reader.onerror = () => {
    fileError.value = 'Không thể đọc ảnh này. Bạn thử chọn ảnh khác nhé.'
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function messageUser() {
  store.setTab('messenger')
}

async function share(postId: string) {
  if (import.meta.client) {
    const url = `${window.location.origin}/?post=${postId}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Vẫn tăng lượt chia sẻ nếu clipboard bị trình duyệt chặn.
    }
  }
  store.sharePost(postId)
}

function reactionIcon(post: Post): string {
  return reactionEmojis.find((r) => r.type === post.myReaction)?.icon || '👍'
}

function react(postId: string, type: ReactionType) {
  store.likePost(postId, type)
  activeReactionMenu.value = null
}

function sendComment(postId: string) {
  const text = commentInputs[postId]
  if (!text || !text.trim()) return
  store.addComment(postId, text)
  commentInputs[postId] = ''
  expandedComments[postId] = true
}

function relTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    if (mins < 1) return 'Vừa xong'
    if (mins < 60) return `${mins} phút trước`
    if (hours < 1) return 'Vừa xong'
    if (hours < 24) return `${hours} giờ trước`
    return `${Math.floor(hours / 24)} ngày trước`
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="flex-1 max-w-3xl w-full px-4 py-6 md:px-0">
    <!-- Nút quay lại khi đang xem hồ sơ người khác -->
    <button v-if="!isViewingSelf" class="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-100 transition" @click="store.setTab('home')">
      <ArrowLeft class="h-4 w-4" />
      <span>Quay lại bảng tin</span>
    </button>

    <!-- Cover + avatar -->
    <div class="rounded-3xl border border-slate-800 bg-slate-800/40">
      <div class="relative h-40 overflow-hidden rounded-t-3xl md:h-52">
        <img :src="viewedUser.cover" alt="cover" class="h-full w-full object-cover" referrerpolicy="no-referrer">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
      </div>
      <div class="px-5 pb-5">
        <div class="flex items-end justify-between -mt-12">
          <img :src="viewedUser.avatar" :alt="viewedUser.name" class="relative z-10 h-24 w-24 rounded-2xl object-cover ring-4 ring-slate-900 shadow-xl" referrerpolicy="no-referrer">

          <!-- Hành động: tự mình → sửa; người khác → theo dõi + nhắn tin -->
          <div class="flex items-center gap-2">
            <button v-if="isViewingSelf" class="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition" @click="openEdit">
              <Pencil class="h-3.5 w-3.5" />
              <span>Chỉnh sửa hồ sơ</span>
            </button>
            <template v-else>
              <button
                v-if="viewedBot"
                class="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition"
                :class="viewedBot.isFollowed ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 text-white'"
                @click="store.toggleFollow(viewedBot.id)"
              >
                <Check v-if="viewedBot.isFollowed" class="h-3.5 w-3.5" />
                <UserPlus v-else class="h-3.5 w-3.5" />
                <span>{{ viewedBot.isFollowed ? 'Đang theo dõi' : 'Theo dõi' }}</span>
              </button>
              <button class="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition" @click="messageUser">
                <MessageCircle class="h-3.5 w-3.5" />
                <span>Nhắn tin</span>
              </button>
            </template>
          </div>
        </div>
        <h2 class="mt-3 text-xl font-extrabold text-slate-100">{{ viewedUser.name }}</h2>
        <p class="text-xs text-slate-500">@{{ viewedUser.username }}</p>
        <p class="mt-2 text-sm text-slate-300 leading-relaxed">{{ viewedUser.bio }}</p>
        <div class="mt-3 flex gap-5 text-xs">
          <span class="text-slate-400"><b class="text-slate-100">{{ profilePosts.length }}</b> bài viết</span>
          <span class="text-slate-400"><b class="text-slate-100">{{ viewedUser.followersCount.toLocaleString() }}</b> người theo dõi</span>
          <span class="text-slate-400"><b class="text-slate-100">{{ viewedUser.followingCount }}</b> đang theo dõi</span>
        </div>
      </div>
    </div>

    <!-- Followed bots (chỉ khi xem chính mình) -->
    <div v-if="isViewingSelf && followedBots.length" class="mt-6">
      <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">Đang theo dõi</h3>
      <div class="flex flex-wrap gap-3">
        <div v-for="bot in followedBots" :key="bot.id" class="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-800/40 p-2.5 pr-4">
          <img :src="bot.avatar" :alt="bot.name" class="h-9 w-9 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-400/40" referrerpolicy="no-referrer" @click="store.viewProfile(bot.id)">
          <div>
            <p class="text-xs font-bold text-slate-100">{{ bot.name }}</p>
            <p class="text-[10px] text-slate-500">@{{ bot.username }}</p>
          </div>
          <button class="ml-2 text-[11px] font-bold text-slate-400 hover:text-rose-400 transition" @click="store.toggleFollow(bot.id)">Bỏ theo dõi</button>
        </div>
      </div>
    </div>

    <!-- Posts -->
    <div class="mt-6">
      <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">
        {{ isViewingSelf ? 'Bài viết của tôi' : `Bài viết của ${viewedUser.name}` }}
      </h3>
      <div v-if="profilePosts.length === 0" class="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
        <p class="text-sm text-slate-400">{{ isViewingSelf ? 'Bạn chưa đăng bài viết nào.' : 'Người dùng này chưa có bài viết nào.' }}</p>
        <button v-if="isViewingSelf" class="mt-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white px-4 py-2.5 transition" @click="store.openCreateModal()">Đăng bài đầu tiên</button>
      </div>
      <div v-else class="flex flex-col gap-4">
        <article v-for="post in profilePosts" :key="post.id" class="rounded-3xl border border-slate-800 bg-slate-800/50 p-5 transition hover:border-indigo-500/30 hover:bg-slate-800/75">
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="relative">
                <img :src="post.authorAvatar" :alt="post.authorName" class="h-10 w-10 rounded-full object-cover ring-2 ring-slate-800/80" referrerpolicy="no-referrer">
                <span class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-800" />
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <h4 class="text-sm font-bold text-slate-100">{{ post.authorName }}</h4>
                  <CheckCircle2 class="h-3.5 w-3.5 fill-indigo-500 text-slate-800" />
                  <span class="font-mono text-[9px] font-medium text-slate-500">@{{ post.authorUsername }}</span>
                </div>
                <p class="mt-0.5 text-[10px] font-medium text-slate-500">{{ relTime(post.createdAt) }}</p>
              </div>
            </div>
            <button v-if="isViewingSelf" class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-950/40 hover:text-rose-400" title="Xóa bài đăng" @click="store.deletePost(post.id)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <p class="mb-4 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">{{ post.content }}</p>

          <div v-if="post.tags.length" class="mb-4 flex flex-wrap gap-1.5">
            <button v-for="tag in post.tags" :key="tag" class="rounded-full border border-slate-800 bg-slate-950/95 px-2.5 py-1 text-[10px] font-semibold text-slate-400 transition hover:border-indigo-500/20 hover:bg-indigo-950/40 hover:text-indigo-300" @click="store.filterTagAndNavigate(tag)">#{{ tag }}</button>
          </div>

          <div v-if="post.imageUrl" class="mb-4 overflow-hidden rounded-2xl border border-slate-800">
            <img :src="post.imageUrl" alt="post" class="w-full max-h-[460px] object-cover" referrerpolicy="no-referrer">
          </div>

          <div class="mb-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>{{ post.likesCount }} lượt thích</span>
            <span>{{ post.commentsCount }} bình luận · {{ post.sharesCount }} chia sẻ</span>
          </div>

          <div class="flex items-center justify-between border-t border-slate-800 pt-2">
            <div class="relative">
              <button
                class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                :class="post.isLiked ? 'bg-indigo-950/30 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'"
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
                  class="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl"
                  @mouseleave="activeReactionMenu = null"
                >
                  <button v-for="r in reactionEmojis" :key="r.type" :title="r.label" class="text-2xl transition hover:scale-125" @click="react(post.id, r.type)">
                    {{ r.icon }}
                  </button>
                </Motion>
              </AnimatePresence>
            </div>

            <button class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800" @click="expandedComments[post.id] = !expandedComments[post.id]">
              <MessageCircle class="h-4 w-4" />
              <span>Bình luận</span>
            </button>

            <button class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800" @click="share(post.id)">
              <Share2 class="h-4 w-4" />
              <span>Chia sẻ</span>
            </button>

            <button
              class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
              :class="post.isSaved ? 'bg-amber-950/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800'"
              @click="store.savePost(post.id)"
            >
              <Bookmark class="h-4 w-4" :class="post.isSaved ? 'fill-amber-400' : ''" />
              <span>Lưu</span>
            </button>
          </div>

          <div v-if="expandedComments[post.id] || post.comments.length" class="mt-3 space-y-3 border-t border-slate-800 pt-3">
            <CommentItem v-for="c in post.comments" :key="c.id" :comment="c" :post-id="post.id" />

            <div class="flex items-center gap-2.5">
              <img :src="currentUser.avatar" :alt="currentUser.name" class="h-8 w-8 rounded-full object-cover" referrerpolicy="no-referrer">
              <div class="flex flex-1 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-3.5 py-1.5 focus-within:border-indigo-500/40">
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
        </article>
      </div>
    </div>

    <!-- Edit modal -->
    <AnimatePresence>
      <div v-if="isEditing" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <Motion
          :initial="{ opacity: 0, scale: 0.95 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: 0.95 }"
          class="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-slate-100">Chỉnh sửa hồ sơ</h3>
            <button class="text-slate-500 hover:text-white" @click="isEditing = false"><X class="h-5 w-5" /></button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Tên hiển thị</label>
              <input v-model="form.name" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Tiểu sử</label>
              <textarea v-model="form.bio" rows="3" class="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none" />
            </div>
            <div v-if="fileError" class="rounded-xl border border-rose-900/40 bg-rose-950/20 px-3.5 py-2 text-xs text-rose-300">
              {{ fileError }}
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-[10px] font-bold uppercase text-indigo-400">Ảnh đại diện</label>
                <div class="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-2.5">
                  <img :src="form.avatar" alt="Xem trước ảnh đại diện" class="h-14 w-14 rounded-xl object-cover ring-2 ring-slate-800">
                  <label class="flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700">
                    <Upload class="h-3.5 w-3.5" />
                    <span>Chọn ảnh</span>
                    <input type="file" accept="image/*" class="sr-only" @change="handleProfileFile($event, 'avatar')">
                  </label>
                </div>
              </div>
              <div>
                <label class="mb-1 block text-[10px] font-bold uppercase text-indigo-400">Ảnh bìa</label>
                <div class="rounded-xl border border-slate-700 bg-slate-950 p-2.5">
                  <div class="mb-2 h-14 overflow-hidden rounded-lg border border-slate-800">
                    <img :src="form.cover" alt="Xem trước ảnh bìa" class="h-full w-full object-cover">
                  </div>
                  <label class="flex w-max cursor-pointer items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700">
                    <ImageIcon class="h-3.5 w-3.5" />
                    <span>Chọn ảnh bìa</span>
                    <input type="file" accept="image/*" class="sr-only" @change="handleProfileFile($event, 'cover')">
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-3">
            <button class="rounded-xl border border-slate-800 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold px-4 py-2.5 transition" @click="isEditing = false">Hủy</button>
            <button class="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white px-5 py-2.5 transition" @click="saveEdit">
              <Check class="h-4 w-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </Motion>
      </div>
    </AnimatePresence>
  </div>
</template>
