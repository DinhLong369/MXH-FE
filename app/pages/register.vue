<script setup lang="ts">
import { User, Mail, ChevronLeft, UserPlus, CheckCircle } from 'lucide-vue-next'

const auth = useAuthStore()
const { otpTimer } = storeToRefs(auth)

const step = ref<'form' | 'otp'>('form')
const form = reactive({ name: '', username: '', email: '', password: '', confirm: '' })
const otpCode = ref('')

const timerText = computed(() => auth.formatTimer(otpTimer.value))

onMounted(() => {
  auth.loadAccounts()
  auth.resetFlow()
})

function submitForm() {
  const res = auth.validateRegister(form)
  if (res.ok) {
    otpCode.value = ''
    step.value = 'otp'
  }
}

function verify() {
  const res = auth.finalizeRegister(form, otpCode.value)
  if (res.ok) setTimeout(() => navigateTo('/'), 800)
}

function backToForm() {
  step.value = 'form'
  auth.clearFeedback()
}
</script>

<template>
  <AuthShell @autofill="otpCode = $event">
    <!-- Step 1: form -->
    <form v-if="step === 'form'" class="flex flex-col gap-3 py-1" @submit.prevent="submitForm">
      <div class="text-center mb-1">
        <h2 class="text-xl font-bold text-slate-100 mb-0.5">Khởi tạo tài khoản</h2>
        <p class="text-xs text-slate-400">Tham gia ngay cùng VietSocial để trải nghiệm AI mượt mà nhất</p>
      </div>

      <div class="flex flex-col gap-1 bg-slate-800/20 p-2.5 rounded-2xl border border-slate-800/40">
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Họ &amp; Tên hiển thị</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-1 pointer-events-none"><User class="h-4 w-4 text-slate-500" /></div>
          <input v-model="form.name" type="text" placeholder="VD: Trần Văn A" class="w-full border-0 bg-transparent pl-7 pr-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-0">
        </div>
      </div>

      <div class="flex flex-col gap-1 bg-slate-800/20 p-2.5 rounded-2xl border border-slate-800/40">
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-1 pointer-events-none"><span class="text-slate-500 text-sm font-semibold">@</span></div>
          <input v-model="form.username" type="text" placeholder="viet_lien_khong_dau" class="w-full border-0 bg-transparent pl-5 pr-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-0">
        </div>
      </div>

      <div class="flex flex-col gap-1 bg-slate-800/20 p-2.5 rounded-2xl border border-slate-800/40">
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gmail kích hoạt</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-1 pointer-events-none"><Mail class="h-4 w-4 text-slate-500" /></div>
          <input v-model="form.email" type="email" placeholder="username@gmail.com" class="w-full border-0 bg-transparent pl-7 pr-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-0">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1 bg-slate-800/20 p-2.5 rounded-2xl border border-slate-800/40">
          <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mật khẩu</label>
          <input v-model="form.password" type="password" placeholder="••••••" class="w-full border-0 bg-transparent py-0.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-0 font-mono">
        </div>
        <div class="flex flex-col gap-1 bg-slate-800/20 p-2.5 rounded-2xl border border-slate-800/40">
          <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhập lại</label>
          <input v-model="form.confirm" type="password" placeholder="••••••" class="w-full border-0 bg-transparent py-0.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-0 font-mono">
        </div>
      </div>

      <button type="submit" class="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 py-3.5 px-4 font-bold text-white shadow-lg transition hover:opacity-95 active:scale-95 mt-1">
        <span>Gửi mã kích hoạt bảo mật</span>
        <UserPlus class="h-4.5 w-4.5" />
      </button>

      <div class="text-center mt-1.5 text-xs">
        <NuxtLink to="/login" class="text-slate-400 hover:text-slate-100 transition font-medium">Đã có tài khoản? <b class="text-indigo-400">Đăng nhập ngay</b></NuxtLink>
      </div>
    </form>

    <!-- Step 2: OTP -->
    <form v-else class="flex flex-col gap-4" @submit.prevent="verify">
      <button type="button" class="self-start flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition font-semibold" @click="backToForm">
        <ChevronLeft class="h-4 w-4" />
        <span>Quay lại sửa thông tin</span>
      </button>

      <div class="text-center">
        <h2 class="text-xl font-bold text-slate-100 mb-1">Kích hoạt tài khoản mới</h2>
        <p class="text-xs text-slate-400 leading-relaxed">Nhập mã xác thực OTP gửi đến: <b class="text-slate-200">{{ form.email }}</b></p>
      </div>

      <AuthOtpScreen v-model="otpCode" :timer-text="timerText" />

      <button type="submit" class="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 py-3.5 px-4 font-bold text-white shadow-lg transition hover:opacity-95 active:scale-95">
        <span>Kích hoạt &amp; Vào trang chính</span>
        <CheckCircle class="h-4.5 w-4.5" />
      </button>
    </form>
  </AuthShell>
</template>
