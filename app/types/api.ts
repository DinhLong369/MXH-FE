// ============================================================
// API definitions sinh từ Swagger MXH Backend
// Nguồn: https://mxh-backend.onrender.com/swagger/index.html
// ============================================================

export const MXH_API_ENDPOINTS = {
  users: {
    search: {
      method: 'GET' as const,
      path: '/api/users/search.json',
    },
  },
  auth: {
    forgotPasswordOtp: {
      method: 'POST',
      path: '/api/auth/forgot-password/otp.json',
    },
    verifyForgotPasswordOtp: {
      method: 'POST',
      path: '/api/auth/forgot-password/otp/verify.json',
    },
    resetPassword: {
      method: 'POST',
      path: '/api/auth/forgot-password/reset.json',
    },
    login: {
      method: 'POST',
      path: '/api/auth/login.json',
    },
    register: {
      method: 'POST',
      path: '/api/auth/register.json',
    },
    sendRegisterOtp: {
      method: 'POST',
      path: '/api/auth/register/otp.json',
    },
    verifyRegisterOtp: {
      method: 'POST',
      path: '/api/auth/register/otp/verify.json',
    },
  },
  chat: {
    conversations: {
      method: 'GET',
      path: '/api/conversations.json',
    },
    directConversation: {
      method: 'POST',
      path: '/api/conversations/direct.json',
    },
    conversationMessages: {
      method: 'GET',
      path: (id: string) => `/api/conversations/${encodeURIComponent(id)}/messages.json`,
    },
  },
  media: {
    upload: {
      method: 'POST',
      path: '/api/media/upload.json',
    },
  },
} as const

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ApiResponseStatus = boolean

export interface ApiMessageResponse {
  status: ApiResponseStatus
  message: string
}

export interface ForgotPasswordOtpRequest {
  email: string
}

export interface VerifyForgotPasswordOtpRequest {
  email: string
  otp: string
}

export interface ForgotPasswordVerifyResponse extends ApiMessageResponse {
  token: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface LoginRequest {
  account: string
  password: string
}

export interface LoginResponse extends ApiMessageResponse {
  access_token: string
  refresh_token: string
}

export interface SendRegisterOtpRequest {
  email: string
}

export interface VerifyRegisterOtpRequest {
  email: string
  otp: string
}

export interface VerifyRegisterOtpResponse extends ApiMessageResponse {
  token: string
}

export interface RegisterRequest {
  username: string
  password: string
  token: string
}

export interface RegisterUserResponse {
  id: string
  username: string
  email: string
  role: string
  status: string
  is_verify: boolean
}

export interface RegisterResponse extends ApiMessageResponse {
  data: RegisterUserResponse
}

export interface CreateDirectConversationRequest {
  user_id: string
}

export interface ConversationResponse<TData = unknown> extends ApiMessageResponse {
  data: TData
}

export interface MessageListResponse<TData = unknown> extends ApiMessageResponse {
  data: TData
}

export interface ConversationMessagesQuery {
  page?: number
  limit?: number
}

// ----- Tìm kiếm người dùng -----
export interface SearchUsersQuery {
  q: string
}

export interface ApiUserResult {
  id: string
  name: string
  username: string
  avatar: string
  email?: string
}

export interface SearchUsersResponse extends ApiMessageResponse {
  data: ApiUserResult[]
}

// ----- Media -----
// Backend trả về URL ảnh đã upload lên S3. Shape có thể khác nhau giữa các
// phiên bản API nên giữ linh hoạt và dùng extractMediaUrl() để lấy URL.
export interface MediaUploadData {
  url?: string
  path?: string
  location?: string
  key?: string
}

export interface MediaUploadResponse extends ApiMessageResponse {
  url?: string
  data?: MediaUploadData | string
}
