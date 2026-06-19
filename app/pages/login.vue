<script setup lang="ts">
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-vue-next'

const auth = useAuthStore()
const { rememberedLogins } = storeToRefs(auth)
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)

onMounted(() => {
  auth.loadAccounts()
  auth.resetFlow()
  // Nếu vừa đăng ký xong → điền sẵn tài khoản/mật khẩu vừa nhập
  const prefill = auth.consumePrefillLogin()
  if (prefill) {
    username.value = prefill.account
    password.value = prefill.password
  } else {
    username.value = rememberedLogins.value[0] || ''
  }
})

async function submit() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const res = await auth.loginWithApi(username.value, password.value)
    if (res.ok) {
      setTimeout(() => navigateTo('/'), 700)
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthShell>
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="text-center mb-1">
        <h2 class="text-xl font-bold text-slate-100 mb-1">Chào mừng quay lại</h2>
        <p class="text-xs text-slate-400 font-medium">Đăng nhập bằng tài khoản và mật khẩu của bạn</p>
      </div>

      <div class="flex flex-col gap-1.5 mt-2">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tên tài khoản hoặc Email</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <User class="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input v-model="username" type="text" placeholder="Tên tài khoản hoặc email" class="w-full rounded-2xl border border-slate-800 bg-slate-950/65 py-3.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition">
        </div>
      </div> 

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Mật khẩu</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Lock class="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••" class="w-full rounded-2xl border border-slate-800 bg-slate-950/65 py-3.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition font-mono">
          <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300" @click="showPassword = !showPassword">
            <EyeOff v-if="showPassword" class="h-4.5 w-4.5" />
            <Eye v-else class="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
<!-- 
      <p class="text-[10px] text-indigo-400/80 leading-relaxed bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/10 mt-1">
        💡 Tài khoản thử: <b>hainam.dev</b> (hoặc <b>hainam.dev@gmail.com</b>), mật khẩu <b>password123</b>
      </p> -->

      <button type="submit" :disabled="isSubmitting" class="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 py-3.5 px-4 font-bold text-white shadow-lg transition hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 mt-1">
        <span>{{ isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập' }}</span>
        <ArrowRight class="h-4.5 w-4.5" />
      </button>

      <div class="flex items-center justify-between mt-2.5 text-xs">
        <NuxtLink to="/register" class="text-indigo-400 hover:text-indigo-300 transition font-bold">Đăng ký tài khoản mới?</NuxtLink>
        <NuxtLink to="/forgot-password" class="text-slate-400 hover:text-slate-200 transition font-medium">Quên mật khẩu?</NuxtLink>
      </div>
    </form>
  </AuthShell>
</template>
