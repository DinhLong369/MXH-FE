<script setup lang="ts">
import { Home, Compass, MessageCircle, Bell, User, PenSquare, Sparkles, LogOut, Settings } from 'lucide-vue-next'

const store = useSocialStore()
const auth = useAuthStore()
const { currentTab, currentUser, unreadMessagesCount, unreadNotificationsCount } = storeToRefs(store)

function logout() {
  auth.logout()
  navigateTo('/login')
}

const items = [
  { key: 'home',          label: 'Trang chủ',    icon: Home },
  { key: 'explore',       label: 'Khám phá',     icon: Compass },
  { key: 'messenger',     label: 'Tin nhắn',     icon: MessageCircle },
  { key: 'notifications', label: 'Thông báo',    icon: Bell },
  { key: 'profile',       label: 'Trang cá nhân',icon: User },
  { key: 'settings',      label: 'Cài đặt',      icon: Settings },
] as const

function badge(key: string): number {
  if (key === 'messenger') return unreadMessagesCount.value
  if (key === 'notifications') return unreadNotificationsCount.value
  return 0
}
</script>

<template>
  <!-- Desktop sidebar: icon-only ở md (768-1023px), full text ở lg+ -->
  <aside class="hidden md:flex md:w-16 lg:w-64 shrink-0 flex-col gap-2 p-2 lg:p-4 border-r border-slate-800/60 h-full overflow-y-auto thin-scrollbar">
    <!-- Logo -->
    <div class="flex items-center justify-center lg:justify-start gap-2 px-1 lg:px-3 py-4 mb-2">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
        <Sparkles class="h-5 w-5 text-white" />
      </div>
      <span class="hidden lg:block text-lg font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent leading-tight">LongHieu Chanel</span>
    </div>

    <!-- Nav -->
    <nav class="flex flex-col gap-1">
      <button
        v-for="item in items"
        :key="item.key"
        class="group relative flex items-center justify-center lg:justify-start gap-3.5 rounded-2xl px-2 lg:px-4 py-3 text-sm font-semibold transition"
        :class="currentTab === item.key
          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'"
        :title="item.label"
        @click="store.setTab(item.key)"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span class="hidden lg:block">{{ item.label }}</span>
        <!-- Badge inline (lg) -->
        <span
          v-if="badge(item.key) > 0"
          class="hidden lg:flex ml-auto h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white"
        >{{ badge(item.key) }}</span>
        <!-- Badge absolute (md icon-only) -->
        <span
          v-if="badge(item.key) > 0"
          class="lg:hidden absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white"
        >{{ badge(item.key) }}</span>
      </button>
    </nav>

    <!-- Create button -->
    <button
      class="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-2 lg:px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition"
      :title="'Tạo bài viết'"
      @click="store.openCreateModal()"
    >
      <PenSquare class="h-5 w-5 shrink-0" />
      <span class="hidden lg:block">Tạo bài viết</span>
    </button>

    <!-- User card -->
    <div class="mt-auto flex items-center justify-center lg:justify-start gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-2 lg:p-3">
      <button
        class="flex items-center gap-3 overflow-hidden hover:opacity-90 transition"
        :title="currentUser.name"
        @click="store.setTab('profile')"
      >
        <img
          :src="currentUser.avatar"
          :alt="currentUser.name"
          class="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-indigo-500/20"
          referrerpolicy="no-referrer"
        >
        <div class="hidden lg:block text-left overflow-hidden">
          <p class="text-sm font-bold text-slate-100 truncate">{{ currentUser.name }}</p>
          <p class="text-[10px] text-slate-500 truncate">@{{ currentUser.username }}</p>
        </div>
      </button>
      <button
        class="hidden lg:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 transition"
        title="Đăng xuất"
        @click="logout"
      >
        <LogOut class="h-4.5 w-4.5" />
      </button>
    </div>
  </aside>

  <!-- Mobile bottom nav — icon-only, 6 items -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center border-t border-slate-800 bg-slate-950/95 backdrop-blur safe-area-inset-bottom">
    <button
      v-for="item in items"
      :key="item.key"
      class="relative flex flex-1 flex-col items-center justify-center py-2.5 transition"
      :class="currentTab === item.key ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'"
      :aria-label="item.label"
      @click="store.setTab(item.key)"
    >
      <!-- Active indicator line -->
      <span
        v-if="currentTab === item.key"
        class="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-indigo-500"
      />
      <component :is="item.icon" class="h-[18px] w-[18px]" />
      <span class="mt-0.5 text-[8px] font-semibold leading-tight">{{ item.label.split(' ')[0] }}</span>
      <span
        v-if="badge(item.key) > 0"
        class="absolute top-1 right-[calc(50%-18px)] flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white"
      >{{ badge(item.key) }}</span>
    </button>
  </nav>
</template>
