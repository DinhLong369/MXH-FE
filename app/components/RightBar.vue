<script setup lang="ts">
import { Sparkles, TrendingUp, UserPlus, Check, Send } from 'lucide-vue-next'

const store = useSocialStore()
const { bots } = storeToRefs(store)

const trendingTags = ['congnghe', 'dulich', 'amthuc', 'thietke', 'ai', 'chualanh']
const aiPrompt = ref('')

function launch() {
  if (!aiPrompt.value.trim()) return
  store.launchAIWriter(aiPrompt.value)
  aiPrompt.value = ''
}
</script>

<template>
  <aside class="hidden lg:flex w-80 shrink-0 flex-col gap-5 p-4 border-l border-slate-800/60 overflow-y-auto thin-scrollbar">
    <!-- AI Writer widget -->
    <div class="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-slate-900/40 p-4">
      <div class="flex items-center gap-2 mb-2">
        <Sparkles class="h-4.5 w-4.5 text-yellow-300" />
        <h3 class="text-xs font-bold text-slate-100 uppercase tracking-wide">Trợ lý sáng tạo AI</h3>
      </div>
      <p class="text-[11px] text-slate-400 mb-3 leading-relaxed">Nhập một ý tưởng, AI sẽ viết bản nháp bài đăng cho bạn.</p>
      <div class="flex items-center gap-2 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 focus-within:border-indigo-500/40">
        <input
          v-model="aiPrompt"
          type="text"
          placeholder="vd: review quán cà phê Hà Nội..."
          class="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          @keyup.enter="launch"
        >
        <button class="text-indigo-400 hover:text-indigo-300 disabled:opacity-40" :disabled="!aiPrompt.trim()" @click="launch">
          <Send class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Suggested bots -->
    <div class="rounded-3xl border border-slate-800 bg-slate-800/40 p-4">
      <h3 class="text-xs font-bold text-slate-100 uppercase tracking-wide mb-3">Gợi ý theo dõi</h3>
      <div class="flex flex-col gap-3">
        <div v-for="bot in bots" :key="bot.id" class="flex items-center gap-3">
          <img :src="bot.avatar" :alt="bot.name" class="h-10 w-10 rounded-full object-cover ring-2 ring-slate-800" referrerpolicy="no-referrer">
          <div class="flex-1 overflow-hidden">
            <p class="text-sm font-bold text-slate-100 truncate">{{ bot.name }}</p>
            <p class="text-[11px] text-slate-500 truncate">{{ bot.followersCount.toLocaleString() }} người theo dõi</p>
          </div>
          <button
            class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition"
            :class="bot.isFollowed ? 'bg-slate-800 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white'"
            @click="store.toggleFollow(bot.id)"
          >
            <Check v-if="bot.isFollowed" class="h-3.5 w-3.5" />
            <UserPlus v-else class="h-3.5 w-3.5" />
            <span>{{ bot.isFollowed ? 'Đang theo dõi' : 'Theo dõi' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Trending tags -->
    <div class="rounded-3xl border border-slate-800 bg-slate-800/40 p-4">
      <div class="flex items-center gap-2 mb-3">
        <TrendingUp class="h-4 w-4 text-indigo-400" />
        <h3 class="text-xs font-bold text-slate-100 uppercase tracking-wide">Xu hướng</h3>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in trendingTags"
          :key="tag"
          class="rounded-full bg-slate-950/80 hover:bg-indigo-950/40 px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/20 transition"
          @click="store.filterTagAndNavigate(tag)"
        >
          #{{ tag }}
        </button>
      </div>
    </div>
  </aside>
</template>
