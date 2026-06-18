import { defineStore } from 'pinia'
import type { UserProfile } from '~/types'

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

interface AuthState {
  accounts: StoredAccount[]
  feedback: { text: string; type: FeedbackType }
  simulatedEmail: SimulatedEmail | null
  otpSentCode: string
  otpTimer: number
  identifiedUser: StoredAccount | null
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

    verifyForgotOtp(enteredCode: string): { ok: boolean } {
      const check = this.verifyOtp(enteredCode)
      if (!check.ok) {
        this.showFeedback(check.error!, 'error')
        return { ok: false }
      }
      this.showFeedback('Xác minh chủ sở hữu thành công! Vui lòng đặt mật khẩu mới.', 'success')
      return { ok: true }
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

    // Reset state khi chuyển màn
    resetFlow() {
      this.clearFeedback()
      this.stopTimer()
      this.otpTimer = 120
      this.otpSentCode = ''
    },
  },
})
