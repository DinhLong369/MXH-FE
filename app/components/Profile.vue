<script setup lang="ts">
import { Pencil, Trash2, X, Check, UserPlus, MessageCircle, ArrowLeft } from 'lucide-vue-next'

const store = useSocialStore()
const { posts, followedBots, viewedUser, isViewingSelf, bots } = storeToRefs(store)

const profilePosts = computed(() => posts.value.filter((p) => p.userId === viewedUser.value.id))
const viewedBot = computed(() => bots.value.find((b) => b.id === viewedUser.value.id) || null)

const isEditing = ref(false)
const form = reactive({ name: '', bio: '', avatar: '', cover: '' })

function openEdit() {
  form.name = viewedUser.value.name
  form.bio = viewedUser.value.bio
  form.avatar = viewedUser.value.avatar
  form.cover = viewedUser.value.cover
  isEditing.value = true
}

function saveEdit() {
  store.updateProfile(form.name.trim() || viewedUser.value.name, form.bio, form.avatar, form.cover)
  isEditing.value = false
}

function messageUser() {
  store.setTab('messenger')
}

function relTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const hours = Math.floor(diff / 3600000)
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
    <div class="rounded-3xl overflow-hidden border border-slate-800 bg-slate-800/40">
      <div class="relative h-40 md:h-52">
        <img :src="viewedUser.cover" alt="cover" class="h-full w-full object-cover" referrerpolicy="no-referrer">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
      </div>
      <div class="px-5 pb-5">
        <div class="flex items-end justify-between -mt-12">
          <img :src="viewedUser.avatar" :alt="viewedUser.name" class="h-24 w-24 rounded-2xl object-cover ring-4 ring-slate-900 shadow-xl" referrerpolicy="no-referrer">

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
        <article v-for="post in profilePosts" :key="post.id" class="rounded-3xl border border-slate-800 bg-slate-800/50 p-5">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] text-slate-500">{{ relTime(post.createdAt) }}</p>
            <button v-if="isViewingSelf" class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 transition" @click="store.deletePost(post.id)">
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
          <p class="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{{ post.content }}</p>
          <div v-if="post.imageUrl" class="mt-3 overflow-hidden rounded-2xl border border-slate-800">
            <img :src="post.imageUrl" alt="post" class="w-full max-h-80 object-cover" referrerpolicy="no-referrer">
          </div>
          <div class="mt-3 flex gap-1.5 flex-wrap">
            <button v-for="tag in post.tags" :key="tag" class="rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-indigo-300 transition" @click="store.filterTagAndNavigate(tag)">#{{ tag }}</button>
          </div>
          <div class="mt-3 flex gap-4 text-[11px] text-slate-500">
            <span>{{ post.likesCount }} thích</span>
            <span>{{ post.commentsCount }} bình luận</span>
            <span>{{ post.sharesCount }} chia sẻ</span>
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
            <div>
              <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1">URL ảnh đại diện</label>
              <input v-model="form.avatar" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1">URL ảnh bìa</label>
              <input v-model="form.cover" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none">
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
