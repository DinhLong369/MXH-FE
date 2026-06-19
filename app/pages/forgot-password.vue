<script setup lang="ts">
import { Mail, ArrowRight, Key } from 'lucide-vue-next'

const auth = useAuthStore()
const { otpTimer } = storeToRefs(auth)

const step = ref<'email' | 'otp' | 'newpass'>('email')
const email = ref('')
const otpCode = ref('')
const newPassword = ref('')
const newConfirm = ref('')
const isSubmitting = ref(false)

const timerText = computed(() => auth.formatTimer(otpTimer.value))

onMounted(() => {
  auth.loadAccounts()
  auth.resetFlow()
})

async function submitEmail() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const res = await auth.requestForgotPasswordOtp(email.value)
    if (res.ok) {
      otpCode.value = auth.isUsingApiOtp ? '' : auth.otpSentCode
      step.value = 'otp'
    }
  } finally {
    isSubmitting.value = false
  }
}

async function verifyOtp() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const res = await auth.verifyForgotOtpWithApi(email.value, otpCode.value)
    if (res.ok) step.value = 'newpass'
  } finally {
    isSubmitting.value = false
  }
}

async function setNewPassword() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const res = await auth.resetPasswordWithApi(newPassword.value, newConfirm.value)
    if (res.ok) {
      setTimeout(() => navigateTo('/login'), 900)
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthShell @autofill="otpCode = $event">
    <!-- Step 1: email -->
    <form v-if="step === 'email'" class="flex flex-col gap-4" @submit.prevent="submitEmail">
      <div class="text-center">
        <h2 class="text-xl font-bold text-slate-100 mb-1">Khôi phục mật khẩu</h2>
        <p class="text-xs text-slate-400">Nhập email liên kết tài khoản để nhận mã khôi phục mật khẩu</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Địa chỉ Gmail khôi phục</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none"><Mail class="h-4.5 w-4.5 text-slate-500" /></div>
          <input v-model="email" type="email" placeholder="username@gmail.com" class="w-full rounded-2xl border border-slate-800 bg-slate-950/65 py-3.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition">
        </div>
      </div>

      <button type="submit" :disabled="isSubmitting" class="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3.5 px-4 font-bold text-white shadow-lg transition hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 mt-1">
        <span>{{ isSubmitting ? 'Đang gửi mã...' : 'Yêu cầu mã khôi phục' }}</span>
        <ArrowRight class="h-4.5 w-4.5" />
      </button>

      <div class="text-center">
        <NuxtLink to="/login" class="text-xs font-semibold text-slate-400 hover:text-slate-200 transition">Quay lại Đăng nhập</NuxtLink>
      </div>
    </form>

    <!-- Step 2: OTP -->
    <form v-else-if="step === 'otp'" class="flex flex-col gap-4" @submit.prevent="verifyOtp">
      <div class="text-center">
        <h2 class="text-xl font-bold text-slate-100 mb-1">Nhập mã xác minh</h2>
        <p class="text-xs text-slate-400 leading-relaxed">Mã khôi phục đã gửi tới Gmail: <b class="text-slate-200">{{ email }}</b></p>
      </div>

      <AuthOtpScreen v-model="otpCode" :timer-text="timerText" danger />

      <button type="submit" :disabled="isSubmitting" class="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3.5 px-4 font-bold text-white shadow-lg transition hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
        <span>{{ isSubmitting ? 'Đang xác nhận...' : 'Xác nhận khôi phục' }}</span>
        <ArrowRight class="h-4.5 w-4.5" />
      </button>
    </form>

    <!-- Step 3: new password -->
    <form v-else class="flex flex-col gap-4" @submit.prevent="setNewPassword">
      <div class="text-center">
        <h2 class="text-xl font-bold text-slate-100 mb-1">Tạo mật khẩu mới</h2>
        <p class="text-xs text-slate-400">Tối thiểu 6 ký tự bảo mật, tránh dùng lại mật khẩu cũ</p>
      </div>

      <div class="flex flex-col gap-1 bg-slate-800/20 p-2.5 rounded-2xl border border-slate-800/40">
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mật khẩu mới</label>
        <input v-model="newPassword" type="password" placeholder="••••••••" class="w-full border-0 bg-transparent py-0.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-0 font-mono">
      </div>

      <div class="flex flex-col gap-1 bg-slate-800/20 p-2.5 rounded-2xl border border-slate-800/40">
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Xác nhận mật khẩu mới</label>
        <input v-model="newConfirm" type="password" placeholder="••••••••" class="w-full border-0 bg-transparent py-0.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-0 font-mono">
      </div>

      <button type="submit" :disabled="isSubmitting" class="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 py-3.5 px-4 font-bold text-white shadow-lg transition hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 mt-1">
        <span>{{ isSubmitting ? 'Đang cập nhật...' : 'Thay đổi mật khẩu' }}</span>
        <Key class="h-4.5 w-4.5 text-emerald-300" />
      </button>
    </form>
  </AuthShell>
</template>
