<script setup lang="ts">
import { Mail } from 'lucide-vue-next'

const auth = useAuthStore()
const { simulatedEmail } = storeToRefs(auth)

// Cho phép page nghe sự kiện "điền nhanh OTP" để đổ vào ô nhập
const emit = defineEmits<{ autofill: [code: string] }>()

function autofill() {
  if (simulatedEmail.value) {
    emit('autofill', simulatedEmail.value.code)
    auth.showFeedback('Đã điền nhanh mã OTP tự động!', 'success')
  }
}
</script>

<template>
  <AnimatePresence>
    <Motion
      v-if="simulatedEmail && simulatedEmail.show"
      :initial="{ opacity: 0, y: 50, scale: 0.92 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :exit="{ opacity: 0, y: 30, scale: 0.92 }"
      class="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-indigo-500/30 bg-[#0c101c]/98 backdrop-blur-md p-4 shadow-2xl shadow-indigo-500/10"
    >
      <div class="flex items-center justify-between border-b border-indigo-500/15 pb-2.5 mb-2.5">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Mail class="h-3.5 w-3.5" />
          </div>
          <div>
            <span class="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wide">Hộp thư bảo mật (Giả lập)</span>
            <p class="text-[9px] font-mono text-slate-500 leading-none">{{ simulatedEmail.sender }}</p>
          </div>
        </div>
        <button class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-bold transition" @click="auth.closeEmail()">
          Đóng
        </button>
      </div>

      <div class="text-[11px] text-slate-100 font-bold mb-1">📥 Mail: {{ simulatedEmail.title }}</div>
      <p class="text-[10px] text-slate-400 leading-relaxed bg-[#03060f] p-2.5 rounded-xl border border-slate-800 whitespace-pre-wrap font-mono">
        {{ simulatedEmail.content }}
      </p>

      <div class="flex justify-between items-center mt-3 bg-indigo-950/30 p-2 rounded-xl border border-indigo-500/10">
        <span class="text-[9px] text-indigo-400 font-bold">Mã OTP rút nhanh:</span>
        <button class="text-[9px] font-extrabold px-2 py-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white transition active:scale-95 shadow-sm shadow-indigo-950" @click="autofill">
          📋 Tự động điền mã
        </button>
      </div>
    </Motion>
  </AnimatePresence>
</template>
