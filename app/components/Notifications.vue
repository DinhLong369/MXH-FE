<script setup lang="ts">
import { Bell, Heart, MessageCircle, UserPlus, Settings, CheckCheck, Trash2 } from 'lucide-vue-next'
import type { NotificationType } from '~/types'

const store = useSocialStore()
const { notifications } = storeToRefs(store)

const iconMap: Record<NotificationType, { icon: unknown; color: string }> = {
  like: { icon: Heart, color: 'text-rose-400 bg-rose-950/30' },
  comment: { icon: MessageCircle, color: 'text-indigo-400 bg-indigo-950/30' },
  follow: { icon: UserPlus, color: 'text-emerald-400 bg-emerald-950/30' },
  system: { icon: Settings, color: 'text-amber-400 bg-amber-950/30' },
}

function relTime(iso: string): string {
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
    return ''
  }
}

function openTarget(targetPostId?: string) {
  if (targetPostId) store.setTab('home')
}
</script>

<template>
  <div class="flex-1 max-w-2xl w-full px-4 py-6 md:px-0">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <Bell class="h-6 w-6 text-indigo-400" />
        <h2 class="text-lg font-bold text-slate-100 uppercase tracking-tight">Thông báo</h2>
      </div>
      <div class="flex items-center gap-2">
        <button class="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition" @click="store.markAllAsRead()">
          <CheckCheck class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Đọc tất cả</span>
        </button>
        <button class="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 px-3 py-1.5 text-xs font-semibold text-slate-200 transition" @click="store.clearNotifications()">
          <Trash2 class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Xóa hết</span>
        </button>
      </div>
    </div>

    <div v-if="notifications.length === 0" class="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
      <Bell class="h-10 w-10 mx-auto mb-3 text-slate-600" />
      <p class="text-sm font-semibold text-slate-300">Chưa có thông báo nào</p>
      <p class="text-xs text-slate-500 mt-1">Tương tác với bài viết và bot AI để nhận thông báo nhé!</p>
    </div>

    <div v-else class="flex flex-col gap-2">
      <button
        v-for="n in notifications"
        :key="n.id"
        class="flex items-start gap-3 rounded-2xl border p-3.5 text-left transition"
        :class="n.read ? 'border-slate-800 bg-slate-800/30' : 'border-indigo-500/20 bg-indigo-950/20'"
        @click="openTarget(n.targetPostId)"
      >
        <div class="relative shrink-0">
          <img :src="n.senderAvatar" :alt="n.senderName" class="h-11 w-11 rounded-full object-cover" referrerpolicy="no-referrer">
          <span class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-slate-900" :class="iconMap[n.type].color">
            <component :is="iconMap[n.type].icon" class="h-3 w-3" />
          </span>
        </div>
        <div class="flex-1">
          <p class="text-xs text-slate-300 leading-relaxed">
            <span class="font-bold text-slate-100">{{ n.senderName }}</span>
            {{ ' ' }}{{ n.message }}
          </p>
          <p class="text-[10px] text-slate-500 mt-1">{{ relTime(n.createdAt) }}</p>
        </div>
        <span v-if="!n.read" class="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
      </button>
    </div>
  </div>
</template>
