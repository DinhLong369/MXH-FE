<script setup lang="ts">
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-vue-next'

defineEmits<{ autofill: [code: string] }>()

const auth = useAuthStore()
const { feedback } = storeToRefs(auth)
</script>

<template>
  <div class="min-h-screen bg-[#070b16] text-slate-200 flex flex-col items-center justify-center relative px-4 overflow-hidden">
    <!-- Nebula background -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
      <div class="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-700/40 via-violet-600/35 to-sky-500/20 blur-[140px] animate-blob-1" />
      <div class="absolute bottom-[20%] right-[-15%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-fuchsia-600/30 to-slate-800/20 blur-[160px] animate-blob-2" />
      <div class="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] rounded-full bg-indigo-900/30 blur-[130px] animate-blob-3" />
      <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-25" />
    </div>

    <!-- Brand -->
    <Motion
      :initial="{ opacity: 0, y: -25 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ type: 'spring', stiffness: 100, damping: 15 }"
      class="text-center z-10 mb-8 max-w-sm"
    >
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-0.5 shadow-2xl shadow-indigo-500/20 mb-3 hover:scale-105 transition-transform">
        <div class="flex h-full w-full items-center justify-center rounded-[22px] bg-[#090e1f]">
          <Sparkles class="h-6 w-6 text-indigo-400 animate-pulse" />
        </div>
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-indigo-200 to-sky-300 bg-clip-text text-transparent">LongHieu Chanel</h1>
      <p class="text-[11px] text-slate-400 uppercase tracking-widest mt-1.5 font-bold">Multi-Agent Smart Network</p>
    </Motion>

    <!-- Glass panel -->
    <Motion
      :initial="{ opacity: 0, scale: 0.95 }"
      :animate="{ opacity: 1, scale: 1 }"
      :transition="{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }"
      class="w-full max-w-md z-10 rounded-3xl border border-slate-800 bg-[#111827]/70 backdrop-blur-xl p-7 md:p-8 shadow-2xl shadow-black/85 relative card-shine-hover"
    >
      <slot />

      <!-- Feedback panel -->
      <AnimatePresence>
        <Motion
          v-if="feedback.text"
          :initial="{ opacity: 0, y: 15, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 15, scale: 0.95 }"
          class="absolute left-0 right-0 -bottom-16 rounded-2xl border p-3.5 flex items-start gap-2.5 shadow-xl"
          :class="feedback.type === 'error' ? 'bg-rose-950/65 border-rose-800/60 text-rose-300' : 'bg-emerald-950/65 border-emerald-800/60 text-emerald-300'"
        >
          <AlertCircle v-if="feedback.type === 'error'" class="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-400" />
          <CheckCircle v-else class="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-400" />
          <span class="text-xs font-medium leading-relaxed">{{ feedback.text }}</span>
        </Motion>
      </AnimatePresence>
    </Motion>

    <!-- Email simulator -->
    <AuthEmailSimulator @autofill="$emit('autofill', $event)" />

    <Motion :initial="{ opacity: 0 }" :animate="{ opacity: 0.6 }" class="fixed bottom-4 text-[10px] text-slate-500 text-center z-10 leading-relaxed font-mono">
      LongHieu Chanel Authentic Engine (OAuth Security Simulator) • Designed with ♥
    </Motion>
  </div>
</template>
