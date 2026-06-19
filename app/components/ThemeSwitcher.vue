<script setup lang="ts">
import { Check, MonitorCog, Moon, Palette, Sun } from 'lucide-vue-next'

type AppTheme = 'cosmic' | 'daylight' | 'mint'

const STORAGE_KEY = 'longhieu_theme'

const themes: {
  id: AppTheme
  name: string
  icon: typeof Moon
  swatches: string[]
}[] = [
  {
    id: 'cosmic',
    name: 'Vũ trụ',
    icon: Moon,
    swatches: ['#0a0f1d', '#4f46e5', '#8b5cf6'],
  },
  {
    id: 'daylight',
    name: 'Sáng',
    icon: Sun,
    swatches: ['#f8fafc', '#2563eb', '#f59e0b'],
  },
  {
    id: 'mint',
    name: 'Xanh mint',
    icon: MonitorCog,
    swatches: ['#071a18', '#10b981', '#38bdf8'],
  },
]

const activeTheme = ref<AppTheme>('cosmic')
const isOpen = ref(false)

function applyTheme(theme: AppTheme) {
  activeTheme.value = theme
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}

onMounted(() => {
  const savedTheme = localStorage.getItem(STORAGE_KEY) as AppTheme | null
  const validTheme = themes.some((theme) => theme.id === savedTheme) ? savedTheme : 'cosmic'
  applyTheme(validTheme || 'cosmic')
})

function selectTheme(theme: AppTheme) {
  applyTheme(theme)
  isOpen.value = false
}
</script>

<template>
  <div class="fixed right-4 top-20 z-[60] md:right-6">
    <button
      type="button"
      class="theme-toggle-button flex h-11 w-11 items-center justify-center rounded-2xl border shadow-2xl transition hover:-translate-y-0.5"
      aria-label="Chỉnh theme"
      @click="isOpen = !isOpen"
    >
      <Palette class="h-5 w-5" />
    </button>

    <AnimatePresence>
      <Motion
        v-if="isOpen"
        :initial="{ opacity: 0, y: -8, scale: 0.96 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: -8, scale: 0.96 }"
        class="theme-menu mt-3 w-52 rounded-2xl border p-2.5 shadow-2xl"
      >
        <button
          v-for="theme in themes"
          :key="theme.id"
          type="button"
          class="theme-menu-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold transition"
          :class="activeTheme === theme.id ? 'is-active' : ''"
          @click="selectTheme(theme.id)"
        >
          <component :is="theme.icon" class="h-4 w-4 shrink-0" />
          <span class="min-w-0 flex-1">{{ theme.name }}</span>
          <span class="flex items-center -space-x-1">
            <span
              v-for="color in theme.swatches"
              :key="color"
              class="h-3.5 w-3.5 rounded-full border border-white/30"
              :style="{ backgroundColor: color }"
            />
          </span>
          <Check v-if="activeTheme === theme.id" class="h-3.5 w-3.5 shrink-0" />
        </button>
      </Motion>
    </AnimatePresence>
  </div>
</template>
