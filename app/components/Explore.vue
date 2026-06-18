<script setup lang="ts">
import { Compass, Hash, Heart, MessageCircle, Check, UserPlus } from 'lucide-vue-next'

const store = useSocialStore()
const { posts, bots } = storeToRefs(store)

// Tổng hợp tag từ toàn bộ bài viết
const allTags = computed(() => {
  const counts: Record<string, number> = {}
  posts.value.forEach((p) => p.tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)))
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }))
})

// Bài có ảnh để dựng lưới khám phá
const imagePosts = computed(() => posts.value.filter((p) => p.imageUrl))
</script>

<template>
  <div class="flex-1 max-w-4xl px-4 py-6 md:px-0 w-full">
    <div class="flex items-center gap-2 mb-6">
      <Compass class="h-6 w-6 text-indigo-400" />
      <h2 class="text-lg font-bold text-slate-100 uppercase tracking-tight">Khám phá</h2>
    </div>

    <!-- Tags -->
    <div class="mb-7">
      <div class="flex items-center gap-2 mb-3">
        <Hash class="h-4 w-4 text-indigo-400" />
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wide">Chủ đề thịnh hành</h3>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="t in allTags"
          :key="t.tag"
          class="flex items-center gap-1.5 rounded-full bg-slate-800/60 hover:bg-indigo-950/40 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/20 transition"
          @click="store.filterTagAndNavigate(t.tag)"
        >
          <span>#{{ t.tag }}</span>
          <span class="text-[10px] text-slate-500">{{ t.count }}</span>
        </button>
      </div>
    </div>

    <!-- Bots -->
    <div class="mb-7">
      <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">Nhân vật nổi bật</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div v-for="bot in bots" :key="bot.id" class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-3">
          <img :src="bot.avatar" :alt="bot.name" class="h-12 w-12 rounded-full object-cover ring-2 ring-slate-800" referrerpolicy="no-referrer">
          <div class="flex-1 overflow-hidden">
            <p class="text-xs font-bold text-slate-100 truncate">{{ bot.name }}</p>
            <p class="text-[10px] text-slate-500 truncate">{{ bot.bio }}</p>
          </div>
          <button
            class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition shrink-0"
            :class="bot.isFollowed ? 'bg-slate-800 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white'"
            @click="store.toggleFollow(bot.id)"
          >
            <Check v-if="bot.isFollowed" class="h-3.5 w-3.5" />
            <UserPlus v-else class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">{{ bot.isFollowed ? 'Đang theo dõi' : 'Theo dõi' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Image grid -->
    <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">Khoảnh khắc nổi bật</h3>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-2.5">
      <button
        v-for="post in imagePosts"
        :key="post.id"
        class="group relative aspect-square overflow-hidden rounded-2xl border border-slate-800"
        @click="post.tags[0] && store.filterTagAndNavigate(post.tags[0])"
      >
        <img :src="post.imageUrl" :alt="post.content.slice(0, 30)" class="h-full w-full object-cover transition group-hover:scale-105" referrerpolicy="no-referrer">
        <div class="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition">
          <div class="flex items-center gap-3 p-3 text-xs font-bold text-white">
            <span class="flex items-center gap-1"><Heart class="h-3.5 w-3.5" />{{ post.likesCount }}</span>
            <span class="flex items-center gap-1"><MessageCircle class="h-3.5 w-3.5" />{{ post.commentsCount }}</span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
