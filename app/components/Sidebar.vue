<script setup lang="ts">
import { Home, Compass, MessageCircle, Bell, User, PenSquare, Sparkles, LogOut } from 'lucide-vue-next'

const store = useSocialStore()
const auth = useAuthStore()
const { currentTab, currentUser, unreadMessagesCount, unreadNotificationsCount } = storeToRefs(store)

function logout() {
  auth.logout()
  navigateTo('/login')
}

const items = [
  { key: 'home', label: 'Trang chủ', icon: Home },
  { key: 'explore', label: 'Khám phá', icon: Compass },
  { key: 'messenger', label: 'Tin nhắn', icon: MessageCircle },
  { key: 'notifications', label: 'Thông báo', icon: Bell },
  { key: 'profile', label: 'Trang cá nhân', icon: User },
] as const

function badge(key: string): number {
  if (key === 'messenger') return unreadMessagesCount.value
  if (key === 'notifications') return unreadNotificationsCount.value
  return 0
}
</script>

<template>
  <!-- Desktop sidebar -->
  <aside class="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col gap-2 p-4 border-r border-slate-800/60 md:h-screen overflow-y-auto thin-scrollbar">
    <div class="flex items-center gap-2 px-3 py-4 mb-2">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
        <Sparkles class="h-5 w-5 text-white" />
      </div>
      <span class="text-lg font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">LongHieu Chanel</span>
    </div>

    <nav class="flex flex-col gap-1">
      <button
        v-for="item in items"
        :key="item.key"
        class="group relative flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition"
        :class="currentTab === item.key ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent'"
        @click="store.setTab(item.key)"
      >
        <component :is="item.icon" class="h-5 w-5" />
        <span>{{ item.label }}</span>
        <span v-if="badge(item.key) > 0" class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
          {{ badge(item.key) }}
        </span>
      </button>
    </nav>

    <button
      class="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition"
      @click="store.openCreateModal()"
    >
      <PenSquare class="h-4.5 w-4.5" />
      <span>Tạo bài viết</span>
    </button>

    <!-- User card -->
    <div class="mt-auto flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-3">
      <button class="flex flex-1 items-center gap-3 overflow-hidden hover:opacity-90 transition" @click="store.setTab('profile')">
        <img :src="currentUser.avatar" :alt="currentUser.name" class="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-500/20" referrerpolicy="no-referrer">
        <div class="text-left overflow-hidden">
          <p class="text-sm font-bold text-slate-100 truncate">{{ currentUser.name }}</p>
          <p class="text-[10px] text-slate-500 truncate">@{{ currentUser.username }}</p>
        </div>
      </button>
      <button class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 transition" title="Đăng xuất" @click="logout">
        <LogOut class="h-4.5 w-4.5" />
      </button>
    </div>
  </aside>

  <!-- Mobile bottom nav -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-800 bg-slate-950/95 backdrop-blur px-2 py-2">
    <button
      v-for="item in items"
      :key="item.key"
      class="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition"
      :class="currentTab === item.key ? 'text-indigo-400' : 'text-slate-500'"
      @click="store.setTab(item.key)"
    >
      <component :is="item.icon" class="h-5 w-5" />
      <span v-if="badge(item.key) > 0" class="absolute top-0 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
        {{ badge(item.key) }}
      </span>
    </button>
  </nav>
</template>
