import {
  MXH_API_ENDPOINTS,
  type ApiMessageResponse,
  type ConversationMessagesQuery,
  type ConversationResponse,
  type CreateDirectConversationRequest,
  type ForgotPasswordOtpRequest,
  type ForgotPasswordVerifyResponse,
  type LoginRequest,
  type LoginResponse,
  type MessageListResponse,
  type RegisterRequest,
  type RegisterResponse,
  type ResetPasswordRequest,
  type SendRegisterOtpRequest,
  type VerifyForgotPasswordOtpRequest,
  type VerifyRegisterOtpRequest,
  type VerifyRegisterOtpResponse,
} from '~/types/api'

function normalizeApiBase(baseUrl: string) {
  const cleanBase = baseUrl.replace(/\/$/, '')
  return cleanBase.endsWith('/api') ? cleanBase.slice(0, -4) : cleanBase
}

function authHeaders(accessToken: string) {
  return {
    Authorization: accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`,
  }
}

export function useMxhApi() {
  const config = useRuntimeConfig()
  const baseURL = normalizeApiBase(config.public.apiBaseUrl)

  const request = <TResponse>(url: string, options = {}) =>
    $fetch<TResponse>(url, {
      baseURL,
      timeout: 30000,
      ...options,
    })

  return {
    endpoints: MXH_API_ENDPOINTS,

    auth: {
      sendForgotPasswordOtp(payload: ForgotPasswordOtpRequest) {
        const endpoint = MXH_API_ENDPOINTS.auth.forgotPasswordOtp
        return request<ApiMessageResponse>(endpoint.path, {
          method: endpoint.method,
          body: payload,
        })
      },

      verifyForgotPasswordOtp(payload: VerifyForgotPasswordOtpRequest) {
        const endpoint = MXH_API_ENDPOINTS.auth.verifyForgotPasswordOtp
        return request<ForgotPasswordVerifyResponse>(endpoint.path, {
          method: endpoint.method,
          body: payload,
        })
      },

      resetPassword(payload: ResetPasswordRequest) {
        const endpoint = MXH_API_ENDPOINTS.auth.resetPassword
        return request<ApiMessageResponse>(endpoint.path, {
          method: endpoint.method,
          body: payload,
        })
      },

      login(payload: LoginRequest) {
        const endpoint = MXH_API_ENDPOINTS.auth.login
        return request<LoginResponse>(endpoint.path, {
          method: endpoint.method,
          body: payload,
        })
      },

      register(payload: RegisterRequest) {
        const endpoint = MXH_API_ENDPOINTS.auth.register
        return request<RegisterResponse>(endpoint.path, {
          method: endpoint.method,
          body: payload,
        })
      },

      sendRegisterOtp(payload: SendRegisterOtpRequest) {
        const endpoint = MXH_API_ENDPOINTS.auth.sendRegisterOtp
        return request<ApiMessageResponse>(endpoint.path, {
          method: endpoint.method,
          body: payload,
        })
      },

      verifyRegisterOtp(payload: VerifyRegisterOtpRequest) {
        const endpoint = MXH_API_ENDPOINTS.auth.verifyRegisterOtp
        return request<VerifyRegisterOtpResponse>(endpoint.path, {
          method: endpoint.method,
          body: payload,
        })
      },
    },

    chat: {
      listConversations<TData = unknown>(accessToken: string) {
        const endpoint = MXH_API_ENDPOINTS.chat.conversations
        return request<ConversationResponse<TData>>(endpoint.path, {
          method: endpoint.method,
          headers: authHeaders(accessToken),
        })
      },

      createDirectConversation<TData = unknown>(
        accessToken: string,
        payload: CreateDirectConversationRequest,
      ) {
        const endpoint = MXH_API_ENDPOINTS.chat.directConversation
        return request<ConversationResponse<TData>>(endpoint.path, {
          method: endpoint.method,
          headers: authHeaders(accessToken),
          body: payload,
        })
      },

      listConversationMessages<TData = unknown>(
        accessToken: string,
        conversationId: string,
        query?: ConversationMessagesQuery,
      ) {
        const endpoint = MXH_API_ENDPOINTS.chat.conversationMessages
        return request<MessageListResponse<TData>>(endpoint.path(conversationId), {
          method: endpoint.method,
          headers: authHeaders(accessToken),
          query,
        })
      },
    },
  }
}
