import { defineStore } from 'pinia'
import type { LoginResponse, RegisterUserResponse, UserProfile } from '~/types'

// ============================================================
// Tài khoản lưu cục bộ (mô phỏng database trong localStorage)
// ============================================================
export interface StoredAccount {
  id: string
  name: string
  username: string
  email: string
  passwordHash: string
  bio: string
  avatar: string
  cover: string
  followersCount: number
  followingCount: number
}

export interface SimulatedEmail {
  show: boolean
  title: string
  sender: string
  content: string
  code: string
}

export type FeedbackType = 'error' | 'success' | ''

const LS_ACCOUNTS = 'vs_accounts'
const LS_USER = 'vs_currentUser'
const LS_AUTHED = 'vs_isAuthenticated'
const LS_ACCESS_TOKEN = 'vs_access_token'
const LS_REFRESH_TOKEN = 'vs_refresh_token'

const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    id: 'me',
    name: 'Nguyễn Hải Nam',
    username: 'hainam.dev',
    email: 'hainam.dev@gmail.com',
    passwordHash: 'password123',
    bio: 'Full Stack Engineer | Thiết kế giao diện & Trực quan hóa dữ liệu. Thích uống cà phê sữa đá đầu ngõ và tìm tòi các đột phá công nghệ mới.',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
    cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
    followersCount: 1420,
    followingCount: 382,
  },
  {
    id: 'account-alpha',
    name: 'Trần Minh Quân',
    username: 'minhquan.ui',
    email: 'minhquan@gmail.com',
    passwordHash: 'quan123',
    bio: 'UI/UX Designer | Đam mê phong cách Modern Craft và Glassmorphism. Thích uống matcha latte nhe!',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    followersCount: 820,
    followingCount: 210,
  },
]

function toProfile(acct: StoredAccount, postsCount = 0): UserProfile {
  return {
    id: acct.id,
    name: acct.name,
    username: acct.username,
    bio: acct.bio,
    avatar: acct.avatar,
    cover: acct.cover,
    followersCount: acct.followersCount,
    followingCount: acct.followingCount,
    postsCount,
    isAI: false,
  }
}

function fallbackProfile(account: string): UserProfile {
  const username = account.includes('@') ? account.split('@')[0]! : account
  return {
    id: username || 'me',
    name: username || 'Người dùng',
    username: username || 'user',
    bio: 'Thành viên của LongHieu Chanel.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    isAI: false,
  }
}

function profileFromRegisterUser(user: RegisterUserResponse): UserProfile {
  return {
    id: user.id,
    name: user.username,
    username: user.username,
    bio: 'Thành viên mới gia nhập cộng đồng LongHieu Chanel năng động. Cùng chia sẻ cảm hứng sáng tạo!',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    isAI: false,
  }
}

function getBackendMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const maybe = error as {
      data?: { error?: string; message?: string }
      statusMessage?: string
    }
    return maybe.data?.message || maybe.data?.error || maybe.statusMessage || ''
  }
  return ''
}

function getErrorMessage(error: unknown, fallback: string) {
  const backendMessage = getBackendMessage(error)
  if (backendMessage) return backendMessage
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { message?: string }
    return maybe.message || fallback
  }
  return fallback
}

interface AuthState {
  accounts: StoredAccount[]
  feedback: { text: string; type: FeedbackType }
  simulatedEmail: SimulatedEmail | null
  otpSentCode: string
  otpTimer: number
  identifiedUser: StoredAccount | null
  registerToken: string
  forgotPasswordToken: string
  isUsingApiOtp: boolean
  loaded: boolean
}

let timerHandle: ReturnType<typeof setInterval> | null = null

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accounts: [],
    feedback: { text: '', type: '' },
    simulatedEmail: null,
    otpSentCode: '',
    otpTimer: 120,
    identifiedUser: null,
    registerToken: '',
    forgotPasswordToken: '',
    isUsingApiOtp: false,
    loaded: false,
  }),

  actions: {
    // ----- Khởi tạo DB tài khoản -----
    loadAccounts() {
      if (this.loaded || !import.meta.client) return
      const raw = localStorage.getItem(LS_ACCOUNTS)
      if (raw) {
        this.accounts = JSON.parse(raw)
      } else {
        localStorage.setItem(LS_ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS))
        this.accounts = DEFAULT_ACCOUNTS
      }
      this.loaded = true
    },

    persistAccounts() {
      if (import.meta.client) localStorage.setItem(LS_ACCOUNTS, JSON.stringify(this.accounts))
    },

    setApiTokens(tokens: Pick<LoginResponse, 'access_token' | 'refresh_token'>) {
      if (!import.meta.client) return
      localStorage.setItem(LS_ACCESS_TOKEN, tokens.access_token)
      localStorage.setItem(LS_REFRESH_TOKEN, tokens.refresh_token)
    },

    getAccessToken() {
      if (!import.meta.client) return ''
      return localStorage.getItem(LS_ACCESS_TOKEN) || ''
    },

    // ----- Feedback -----
    showFeedback(text: string, type: Exclude<FeedbackType, ''>) {
      this.feedback = { text, type }
    },
    clearFeedback() {
      this.feedback = { text: '', type: '' }
    },

    // ----- OTP + Email simulator -----
    formatTimer(seconds: number): string {
      const m = Math.floor(seconds / 60)
      const s = seconds % 60
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    },

    generateOTP(): string {
      let code = ''
      for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10)
      return code
    },

    startTimer() {
      this.stopTimer()
      if (!import.meta.client) return
      timerHandle = setInterval(() => {
        if (this.otpTimer > 0) this.otpTimer -= 1
        else this.stopTimer()
      }, 1000)
    },
    stopTimer() {
      if (timerHandle) {
        clearInterval(timerHandle)
        timerHandle = null
      }
    },

    triggerEmail(subjectTitle: string, typeDesc: string) {
      const code = this.generateOTP()
      this.otpSentCode = code
      this.otpTimer = 120
      this.startTimer()

      this.simulatedEmail = {
        show: true,
        sender: 'security@LongHieu Chanel.vn',
        title: subjectTitle,
        content: `Chào bạn, LongHieu Chanel Security Team xin gửi mã xác minh OTP cho hành động ${typeDesc} của bạn. Vui lòng không chia sẻ mã này cho bất kỳ ai:\n\nMã xác minh OTP của bạn là: ${code}`,
        code,
      }

      if (import.meta.client) {
        setTimeout(() => {
          if (this.simulatedEmail) this.simulatedEmail.show = false
        }, 12000)
      }
    },

    closeEmail() {
      if (this.simulatedEmail) this.simulatedEmail.show = false
    },

    // Kiểm tra mã OTP nhập vào với mã đã gửi + còn hạn
    verifyOtp(enteredCode: string): { ok: boolean; error?: string } {
      if (enteredCode.length !== 6) return { ok: false, error: 'Vui lòng nhập đủ 6 chữ số mã OTP!' }
      if (this.otpTimer === 0) return { ok: false, error: 'Mã OTP đã hết hạn hiệu lực!' }
      if (enteredCode !== this.otpSentCode) return { ok: false, error: 'Mã OTP xác thực không đúng!' }
      return { ok: true }
    },

    // ----- Session -----
    setSession(user: UserProfile) {
      if (import.meta.client) {
        localStorage.setItem(LS_USER, JSON.stringify(user))
        localStorage.setItem(LS_AUTHED, 'true')
      }
    },
    logout() {
      if (import.meta.client) {
        localStorage.removeItem(LS_AUTHED)
        localStorage.removeItem(LS_ACCESS_TOKEN)
        localStorage.removeItem(LS_REFRESH_TOKEN)
        // Giữ vs_currentUser/feed để lần sau vào lại vẫn còn dữ liệu demo
      }
    },

    // ========================================================
    // LOGIN — đăng nhập trực tiếp bằng username/email + mật khẩu
    // ========================================================
    login(usernameOrEmail: string, password: string): { ok: boolean; user?: UserProfile } {
      this.clearFeedback()
      if (!usernameOrEmail.trim()) {
        this.showFeedback('Vui lòng điền tên đăng nhập hoặc email!', 'error')
        return { ok: false }
      }
      if (!password) {
        this.showFeedback('Vui lòng nhập mật khẩu!', 'error')
        return { ok: false }
      }
      const cleaned = usernameOrEmail.trim().toLowerCase()
      const user = this.accounts.find(
        (a) => a.username.toLowerCase() === cleaned || a.email.toLowerCase() === cleaned,
      )
      if (!user) {
        this.showFeedback('Tài khoản không tồn tại trên hệ thống!', 'error')
        return { ok: false }
      }
      if (password !== user.passwordHash) {
        this.showFeedback('Mật khẩu không chính xác! Vui lòng thử lại.', 'error')
        return { ok: false }
      }
      const profile = toProfile(user, 12)
      this.setSession(profile)
      this.showFeedback('Đăng nhập thành công! Đang chuyển hướng...', 'success')
      return { ok: true, user: profile }
    },

    async loginWithApi(usernameOrEmail: string, password: string): Promise<{ ok: boolean; user?: UserProfile }> {
      this.clearFeedback()
      if (!usernameOrEmail.trim()) {
        this.showFeedback('Vui lòng điền tên đăng nhập hoặc email!', 'error')
        return { ok: false }
      }
      if (!password) {
        this.showFeedback('Vui lòng nhập mật khẩu!', 'error')
        return { ok: false }
      }

      try {
        const api = useMxhApi()
        const data = await api.auth.login({
          account: usernameOrEmail.trim(),
          password,
        })
        if (!data.status) {
          this.showFeedback(data.message || 'Đăng nhập không thành công.', 'error')
          return { ok: false }
        }

        this.setApiTokens(data)
        const cleaned = usernameOrEmail.trim().toLowerCase()
        const localAccount = this.accounts.find(
          (a) => a.username.toLowerCase() === cleaned || a.email.toLowerCase() === cleaned,
        )
        const profile = localAccount ? toProfile(localAccount, 12) : fallbackProfile(cleaned)
        this.setSession(profile)
        this.showFeedback(data.message || 'Đăng nhập thành công! Đang chuyển hướng...', 'success')
        return { ok: true, user: profile }
      } catch (error) {
        const backendMessage = getBackendMessage(error)
        if (backendMessage) {
          this.showFeedback(backendMessage, 'error')
          return { ok: false }
        }

        const fallback = this.login(usernameOrEmail, password)
        if (fallback.ok) {
          this.showFeedback('Đăng nhập demo thành công. Backend hiện chưa phản hồi ổn định.', 'success')
          return fallback
        }
        this.showFeedback(getErrorMessage(error, 'Không thể đăng nhập qua API. Vui lòng thử lại.'), 'error')
        return { ok: false }
      }
    },

    // ========================================================
    // REGISTER — kiểm tra form rồi gửi OTP, sau đó hoàn tất
    // ========================================================
    validateRegister(form: {
      name: string
      username: string
      email: string
      password: string
      confirm: string
    }): { ok: boolean } {
      this.clearFeedback()
      const { name, username, email, password, confirm } = form
      if (!name.trim() || !username.trim() || !email.trim() || !password || !confirm) {
        this.showFeedback('Vui lòng điền đầy đủ tất cả thông tin!', 'error')
        return { ok: false }
      }
      if (username.includes(' ') || username.length < 3) {
        this.showFeedback('Tên đăng nhập viết liền không dấu, tối thiểu 3 kí tự!', 'error')
        return { ok: false }
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        this.showFeedback('Cấu trúc email không hợp lệ!', 'error')
        return { ok: false }
      }
      if (password.length < 6) {
        this.showFeedback('Mật khẩu bảo mật tối thiểu 6 ký tự!', 'error')
        return { ok: false }
      }
      if (password !== confirm) {
        this.showFeedback('Xác nhận mật khẩu không trùng khớp!', 'error')
        return { ok: false }
      }
      if (this.accounts.some((a) => a.username.toLowerCase() === username.trim().toLowerCase())) {
        this.showFeedback('Tên đăng nhập đã tồn tại trong hệ thống!', 'error')
        return { ok: false }
      }
      if (this.accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) {
        this.showFeedback('Địa chỉ Gmail này đã được sử dụng!', 'error')
        return { ok: false }
      }
      // Hợp lệ → gửi mã kích hoạt
      this.showFeedback(`Thông tin hợp lệ! Đã gửi mã kích hoạt tới ${email}`, 'success')
      this.triggerEmail('✨ Mã Kích Hoạt Đăng Ký Tài Khoản LongHieu Chanel', 'KÍCH HOẠT TÀI KHOẢN MỚI')
      return { ok: true }
    },

    async requestRegisterOtp(form: {
      name: string
      username: string
      email: string
      password: string
      confirm: string
    }): Promise<{ ok: boolean }> {
      this.clearFeedback()
      this.isUsingApiOtp = false
      this.registerToken = ''

      const { name, username, email, password, confirm } = form
      if (!name.trim() || !username.trim() || !email.trim() || !password || !confirm) {
        this.showFeedback('Vui lòng điền đầy đủ tất cả thông tin!', 'error')
        return { ok: false }
      }
      if (username.includes(' ') || username.length < 3) {
        this.showFeedback('Tên đăng nhập viết liền không dấu, tối thiểu 3 kí tự!', 'error')
        return { ok: false }
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        this.showFeedback('Cấu trúc email không hợp lệ!', 'error')
        return { ok: false }
      }
      if (password.length < 6) {
        this.showFeedback('Mật khẩu bảo mật tối thiểu 6 ký tự!', 'error')
        return { ok: false }
      }
      if (password !== confirm) {
        this.showFeedback('Xác nhận mật khẩu không trùng khớp!', 'error')
        return { ok: false }
      }
      try {
        const api = useMxhApi()
        const data = await api.auth.sendRegisterOtp({ email: email.trim().toLowerCase() })
        if (!data.status) {
          this.showFeedback(data.message || 'Không thể gửi mã OTP đăng ký.', 'error')
          return { ok: false }
        }
        this.isUsingApiOtp = true
        this.otpTimer = 120
        this.startTimer()
        this.simulatedEmail = null
        this.showFeedback(data.message || `Đã gửi mã kích hoạt tới ${email}`, 'success')
        return { ok: true }
      } catch (error) {
        const backendMessage = getBackendMessage(error)
        if (backendMessage) {
          this.showFeedback(backendMessage, 'error')
          return { ok: false }
        }

        console.warn('Register OTP API failed, fallback to local simulator:', error)
        this.showFeedback(`API OTP chưa sẵn sàng. Đã gửi mã mô phỏng tới ${email}`, 'success')
        this.triggerEmail('✨ Mã Kích Hoạt Đăng Ký Tài Khoản LongHieu Chanel', 'KÍCH HOẠT TÀI KHOẢN MỚI')
        return { ok: true }
      }
    },

    finalizeRegister(
      form: { name: string; username: string; email: string; password: string },
      enteredCode: string,
    ): { ok: boolean; user?: UserProfile } {
      const check = this.verifyOtp(enteredCode)
      if (!check.ok) {
        this.showFeedback(check.error!, 'error')
        return { ok: false }
      }
      const newAccount: StoredAccount = {
        id: `user-${Date.now()}`,
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        passwordHash: form.password,
        bio: 'Thành viên mới gia nhập cộng đồng LongHieu Chanel năng động. Cùng chia sẻ cảm hứng sáng tạo!',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
        followersCount: 0,
        followingCount: 0,
      }
      this.accounts = [...this.accounts, newAccount]
      this.persistAccounts()
      const profile = toProfile(newAccount, 0)
      this.setSession(profile)
      this.stopTimer()
      this.showFeedback('Đăng ký & xác thực hoàn tất! Chào mừng bạn...', 'success')
      return { ok: true, user: profile }
    },

    async finalizeRegisterWithApi(
      form: { name: string; username: string; email: string; password: string },
      enteredCode: string,
    ): Promise<{ ok: boolean; user?: UserProfile }> {
      if (!this.isUsingApiOtp) return this.finalizeRegister(form, enteredCode)

      if (enteredCode.length !== 6) {
        this.showFeedback('Vui lòng nhập đủ 6 chữ số mã OTP!', 'error')
        return { ok: false }
      }
      if (this.otpTimer === 0) {
        this.showFeedback('Mã OTP đã hết hạn hiệu lực!', 'error')
        return { ok: false }
      }

      try {
        const api = useMxhApi()
        const verify = await api.auth.verifyRegisterOtp({
          email: form.email.trim().toLowerCase(),
          otp: enteredCode,
        })
        if (!verify.status || !verify.token) {
          this.showFeedback(verify.message || 'Mã OTP xác thực không đúng!', 'error')
          return { ok: false }
        }

        this.registerToken = verify.token
        const data = await api.auth.register({
          username: form.username.trim().toLowerCase(),
          password: form.password,
          token: verify.token,
        })
        if (!data.status) {
          this.showFeedback(data.message || 'Không thể đăng ký tài khoản.', 'error')
          return { ok: false }
        }

        const user: StoredAccount = {
          id: data.data?.id || `user-${Date.now()}`,
          name: form.name.trim(),
          username: data.data?.username || form.username.trim().toLowerCase(),
          email: data.data?.email || form.email.trim().toLowerCase(),
          passwordHash: form.password,
          bio: 'Thành viên mới gia nhập cộng đồng LongHieu Chanel năng động. Cùng chia sẻ cảm hứng sáng tạo!',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
          followersCount: 0,
          followingCount: 0,
        }
        this.accounts = [...this.accounts, user]
        this.persistAccounts()
        const profile = data.data ? profileFromRegisterUser(data.data) : toProfile(user, 0)
        this.setSession({ ...profile, name: form.name.trim() || profile.name })
        this.stopTimer()
        this.showFeedback(data.message || 'Đăng ký & xác thực hoàn tất! Chào mừng bạn...', 'success')
        return { ok: true, user: profile }
      } catch (error) {
        this.showFeedback(getErrorMessage(error, 'Không thể hoàn tất đăng ký qua API.'), 'error')
        return { ok: false }
      }
    },

    // ========================================================
    // FORGOT PASSWORD — tìm email → OTP → đặt mật khẩu mới
    // ========================================================
    forgotFindEmail(email: string): { ok: boolean } {
      this.clearFeedback()
      if (!email.trim()) {
        this.showFeedback('Vui lòng nhập địa chỉ Gmail khôi phục!', 'error')
        return { ok: false }
      }
      const acct = this.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
      if (!acct) {
        this.showFeedback('Không tồn tại tài khoản nào ứng với email này!', 'error')
        return { ok: false }
      }
      this.identifiedUser = acct
      this.showFeedback(`Đã tìm thấy tài khoản! Gửi mã khôi phục qua ${acct.email}`, 'success')
      this.triggerEmail('🔑 Khôi Phục Mật Khẩu LongHieu Chanel', 'KHÔI PHỤC MẬT KHẨU')
      return { ok: true }
    },

    async requestForgotPasswordOtp(email: string): Promise<{ ok: boolean }> {
      this.clearFeedback()
      this.isUsingApiOtp = false
      this.forgotPasswordToken = ''

      if (!email.trim()) {
        this.showFeedback('Vui lòng nhập địa chỉ Gmail khôi phục!', 'error')
        return { ok: false }
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        this.showFeedback('Cấu trúc email không hợp lệ!', 'error')
        return { ok: false }
      }

      try {
        const api = useMxhApi()
        const data = await api.auth.sendForgotPasswordOtp({
          email: email.trim().toLowerCase(),
        })
        if (!data.status) {
          this.showFeedback(data.message || 'Không thể gửi mã khôi phục.', 'error')
          return { ok: false }
        }
        this.isUsingApiOtp = true
        this.otpTimer = 120
        this.startTimer()
        this.simulatedEmail = null
        this.showFeedback(data.message || `Đã gửi mã khôi phục qua ${email}`, 'success')
        return { ok: true }
      } catch (error) {
        const backendMessage = getBackendMessage(error)
        if (backendMessage) {
          this.showFeedback(backendMessage, 'error')
          return { ok: false }
        }

        console.warn('Forgot password OTP API failed, fallback to local simulator:', error)
        return this.forgotFindEmail(email)
      }
    },

    verifyForgotOtp(enteredCode: string): { ok: boolean } {
      const check = this.verifyOtp(enteredCode)
      if (!check.ok) {
        this.showFeedback(check.error!, 'error')
        return { ok: false }
      }
      this.showFeedback('Xác minh chủ sở hữu thành công! Vui lòng đặt mật khẩu mới.', 'success')
      return { ok: true }
    },

    async verifyForgotOtpWithApi(email: string, enteredCode: string): Promise<{ ok: boolean }> {
      if (!this.isUsingApiOtp) return this.verifyForgotOtp(enteredCode)

      if (enteredCode.length !== 6) {
        this.showFeedback('Vui lòng nhập đủ 6 chữ số mã OTP!', 'error')
        return { ok: false }
      }
      if (this.otpTimer === 0) {
        this.showFeedback('Mã OTP đã hết hạn hiệu lực!', 'error')
        return { ok: false }
      }

      try {
        const api = useMxhApi()
        const data = await api.auth.verifyForgotPasswordOtp({
          email: email.trim().toLowerCase(),
          otp: enteredCode,
        })
        if (!data.status || !data.token) {
          this.showFeedback(data.message || 'Mã OTP xác thực không đúng!', 'error')
          return { ok: false }
        }
        this.forgotPasswordToken = data.token
        this.showFeedback(data.message || 'Xác minh chủ sở hữu thành công! Vui lòng đặt mật khẩu mới.', 'success')
        return { ok: true }
      } catch (error) {
        this.showFeedback(getErrorMessage(error, 'Không thể xác minh OTP qua API.'), 'error')
        return { ok: false }
      }
    },

    resetPassword(newPassword: string, confirm: string): { ok: boolean; username?: string } {
      this.clearFeedback()
      if (!newPassword || !confirm) {
        this.showFeedback('Điền đầy đủ thông tin mật khẩu mới!', 'error')
        return { ok: false }
      }
      if (newPassword.length < 6) {
        this.showFeedback('Mật khẩu mới tối thiểu 6 ký tự bảo mật!', 'error')
        return { ok: false }
      }
      if (newPassword !== confirm) {
        this.showFeedback('Xác nhận mật khẩu mới không trùng khớp!', 'error')
        return { ok: false }
      }
      if (!this.identifiedUser) {
        this.showFeedback('Phiên khôi phục không hợp lệ.', 'error')
        return { ok: false }
      }
      const username = this.identifiedUser.username
      this.accounts = this.accounts.map((a) =>
        a.id === this.identifiedUser!.id ? { ...a, passwordHash: newPassword } : a,
      )
      this.persistAccounts()
      this.stopTimer()
      this.identifiedUser = null
      this.showFeedback('Khôi phục mật khẩu thành công! Chuyển hướng về đăng nhập...', 'success')
      return { ok: true, username }
    },

    async resetPasswordWithApi(newPassword: string, confirm: string): Promise<{ ok: boolean; username?: string }> {
      if (!this.isUsingApiOtp) return this.resetPassword(newPassword, confirm)

      this.clearFeedback()
      if (!newPassword || !confirm) {
        this.showFeedback('Điền đầy đủ thông tin mật khẩu mới!', 'error')
        return { ok: false }
      }
      if (newPassword.length < 6) {
        this.showFeedback('Mật khẩu mới tối thiểu 6 ký tự bảo mật!', 'error')
        return { ok: false }
      }
      if (newPassword !== confirm) {
        this.showFeedback('Xác nhận mật khẩu mới không trùng khớp!', 'error')
        return { ok: false }
      }
      if (!this.forgotPasswordToken) {
        this.showFeedback('Phiên khôi phục không hợp lệ.', 'error')
        return { ok: false }
      }

      try {
        const api = useMxhApi()
        const data = await api.auth.resetPassword({
          token: this.forgotPasswordToken,
          new_password: newPassword,
        })
        if (!data.status) {
          this.showFeedback(data.message || 'Không thể đổi mật khẩu.', 'error')
          return { ok: false }
        }
        this.stopTimer()
        this.forgotPasswordToken = ''
        this.isUsingApiOtp = false
        this.showFeedback(data.message || 'Khôi phục mật khẩu thành công! Chuyển hướng về đăng nhập...', 'success')
        return { ok: true }
      } catch (error) {
        this.showFeedback(getErrorMessage(error, 'Không thể đổi mật khẩu qua API.'), 'error')
        return { ok: false }
      }
    },

    // Reset state khi chuyển màn
    resetFlow() {
      this.clearFeedback()
      this.stopTimer()
      this.otpTimer = 120
      this.otpSentCode = ''
      this.registerToken = ''
      this.forgotPasswordToken = ''
      this.isUsingApiOtp = false
    },
  },
})
