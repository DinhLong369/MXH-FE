<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string
    timerText: string
    danger?: boolean
  }>(),
  { danger: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const digits = ref<string[]>(['', '', '', '', '', ''])

// Đồng bộ khi parent set sẵn mã (vd: tự động điền từ email giả lập)
watch(
  () => props.modelValue,
  (val) => {
    const arr = (val || '').slice(0, 6).split('')
    digits.value = Array.from({ length: 6 }, (_, i) => arr[i] || '')
  },
  { immediate: true },
)

function sync() {
  emit('update:modelValue', digits.value.join(''))
}

function onInput(val: string, index: number) {
  if (val !== '' && Number.isNaN(Number(val))) return
  digits.value[index] = val.slice(-1)
  sync()
  if (val !== '' && index < 5) {
    const next = document.getElementById(`pin-digit-${index + 1}`) as HTMLInputElement | null
    next?.focus()
  }
}

function onKeydown(e: KeyboardEvent, index: number) {
  if (e.key === 'Backspace' && digits.value[index] === '' && index > 0) {
    const prev = document.getElementById(`pin-digit-${index - 1}`) as HTMLInputElement | null
    prev?.focus()
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2 justify-center my-1.5">
      <input
        v-for="(digit, i) in digits"
        :id="`pin-digit-${i}`"
        :key="i"
        type="text"
        inputmode="numeric"
        maxlength="1"
        :value="digit"
        class="w-11 h-13 text-center border border-slate-800 bg-slate-950/70 text-lg font-bold text-indigo-400 rounded-xl focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono"
        @input="onInput(($event.target as HTMLInputElement).value, i)"
        @keydown="onKeydown($event, i)"
      >
    </div>
    <div class="text-center text-xs text-slate-400">
      Thời gian hiệu lực mã OTP còn:
      <span class="font-mono font-bold" :class="danger ? 'text-rose-400' : 'text-indigo-400'">{{ timerText }}</span>
    </div>
  </div>
</template>
