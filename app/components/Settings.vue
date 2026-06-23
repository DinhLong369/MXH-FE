<script setup lang="ts">
import { Check, Moon, Sun, MonitorCog, LogOut, Info, Palette, Shield } from 'lucide-vue-next'

type AppTheme = 'cosmic' | 'daylight' | 'mint'

const STORAGE_KEY = 'longhieu_theme'

const themes: { id: AppTheme; name: string; desc: string; icon: typeof Moon; ground: string; accent: string; accent2: string }[] = [
  { id: 'cosmic',   name: 'Vũ trụ',    desc: 'Tối, huyền ảo',  icon: Moon,       ground: '#0a0f1d', accent: '#6366f1', accent2: '#8b5cf6' },
  { id: 'daylight', name: 'Sáng',      desc: 'Tươi, rõ ràng',  icon: Sun,        ground: '#f8fafc', accent: '#2563eb', accent2: '#f59e0b' },
  { id: 'mint',     name: 'Mint',       desc: 'Xanh, tươi mát', icon: MonitorCog, ground: '#071a18', accent: '#10b981', accent2: '#38bdf8' },
]

const store = useSocialStore()
const auth = useAuthStore()
const { currentUser } = storeToRefs(store)

const activeTheme = ref<AppTheme>('cosmic')

function applyTheme(theme: AppTheme) {
  activeTheme.value = theme
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null
  activeTheme.value = (saved && themes.some(t => t.id === saved)) ? saved : 'cosmic'
})

function logout() {
  auth.logout()
  navigateTo('/login')
}
</script>

<template>
  <div class="w-full max-w-xl mx-auto px-4 py-6 pb-28 md:py-8 md:pb-8 space-y-5">

    <!-- Header -->
    <div class="flex items-center gap-3 mb-2">
      <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
        <Palette class="h-5 w-5" />
      </div>
      <h1 class="text-base font-extrabold text-slate-100">Cài đặt</h1>
    </div>

    <!-- Section: Giao diện -->
    <section class="rounded-2xl border border-slate-800 bg-slate-800/40 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-800/60">
        <p class="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400/80">Giao diện</p>
      </div>
      <div class="p-4 grid grid-cols-3 gap-3">
        <button
          v-for="theme in themes"
          :key="theme.id"
          class="relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition"
          :class="activeTheme === theme.id
            ? 'border-indigo-500 bg-indigo-600/10'
            : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/60'"
          @click="applyTheme(theme.id)"
        >
          <!-- Mini preview swatch -->
          <div
            class="w-full h-12 rounded-xl overflow-hidden relative flex items-end"
            :style="{ background: theme.ground }"
          >
            <div class="absolute inset-0 opacity-60" :style="{ background: `radial-gradient(circle at 30% 40%, ${theme.accent}55, transparent 60%)` }" />
            <div class="absolute bottom-1.5 left-1.5 right-1.5 h-2 rounded-full opacity-70" :style="{ background: theme.accent }" />
            <div class="absolute top-1.5 right-1.5 w-3 h-3 rounded-full" :style="{ background: theme.accent2 }" />
          </div>

          <div class="text-center">
            <p class="text-[11px] font-extrabold" :class="activeTheme === theme.id ? 'text-indigo-300' : 'text-slate-300'">{{ theme.name }}</p>
            <p class="text-[9px] text-slate-500 font-semibold mt-0.5">{{ theme.desc }}</p>
          </div>

          <!-- Active check -->
          <div
            v-if="activeTheme === theme.id"
            class="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500"
          >
            <Check class="h-2.5 w-2.5 text-white" />
          </div>
        </button>
      </div>
    </section>

    <!-- Section: Tài khoản -->
    <section class="rounded-2xl border border-slate-800 bg-slate-800/40 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-800/60">
        <p class="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400/80">Tài khoản</p>
      </div>

      <!-- User card -->
      <button
        class="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-800/40 hover:bg-slate-800/40 transition text-left"
        @click="store.setTab('profile')"
      >
        <img
          :src="currentUser.avatar"
          :alt="currentUser.name"
          class="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-500/30 shrink-0"
          referrerpolicy="no-referrer"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-extrabold text-slate-100 truncate">{{ currentUser.name }}</p>
          <p class="text-[11px] text-slate-500 truncate">@{{ currentUser.username }}</p>
        </div>
        <span class="text-[10px] text-indigo-400 font-bold shrink-0">Xem hồ sơ →</span>
      </button>

      <!-- Logout -->
      <button
        class="w-full flex items-center gap-3 px-4 py-3.5 text-rose-400 hover:bg-rose-950/30 transition"
        @click="logout"
      >
        <LogOut class="h-4 w-4 shrink-0" />
        <span class="text-sm font-bold">Đăng xuất</span>
      </button>
    </section>

    <!-- Section: Về ứng dụng -->
    <section class="rounded-2xl border border-slate-800 bg-slate-800/40 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-800/60">
        <p class="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400/80">Về ứng dụng</p>
      </div>
      <div class="px-4 py-3.5 flex items-center gap-3 border-b border-slate-800/40">
        <Shield class="h-4 w-4 text-slate-500 shrink-0" />
        <div class="flex-1">
          <p class="text-xs font-bold text-slate-300">Phiên bản</p>
          <p class="text-[11px] text-slate-500">LongHieu Chanel · 1.0.0</p>
        </div>
      </div>
      <div class="px-4 py-3.5 flex items-center gap-3">
        <Info class="h-4 w-4 text-slate-500 shrink-0" />
        <div class="flex-1">
          <p class="text-xs font-bold text-slate-300">Mạng xã hội cá nhân</p>
          <p class="text-[11px] text-slate-500">Xây dựng với ❤️ bởi LongHieu</p>
        </div>
      </div>
    </section>

  </div>
</template>
