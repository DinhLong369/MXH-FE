/**
 * useApi — Trung tâm gọi API của toàn dự án.
 *
 * Cấu trúc:
 *  1. Tạo 1 instance $fetch (apiFetch) với baseURL + interceptor (token, error).
 *  2. Gom toàn bộ endpoint thành các nhóm hàm (auth, users, ...).
 *  3. Mỗi endpoint là 1 hàm rõ ràng, có kiểu dữ liệu (typed).
 *
 * Cách dùng trong component:
 *   const api = useApi()
 *   const { data } = await useAsyncData('users', () => api.users.list())
 *   await api.auth.login({ email, password })
 */

// ============================================================
// Types — khai báo kiểu dữ liệu dùng chung
// ============================================================
export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface User {
  id: number | string
  name: string
  email: string
  createdAt?: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ListQuery {
  page?: number
  pageSize?: number
  search?: string
}

// ============================================================
// useApi composable
// ============================================================
export function useApi() {
  const config = useRuntimeConfig()

  // Token lưu ở cookie để dùng được cả SSR lẫn client
  const token = useCookie<string | null>('auth_token', {
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 ngày
  })

  // ----- Instance $fetch dùng chung -----
  const apiFetch = $fetch.create({
    baseURL: config.public.apiBaseUrl,

    onRequest({ options }) {
      // Tự động đính kèm token nếu có
      if (token.value) {
        options.headers = new Headers(options.headers)
        options.headers.set('Authorization', `Bearer ${token.value}`)
      }
    },

    onResponseError({ response }) {
      // Xử lý lỗi tập trung
      if (response.status === 401) {
        token.value = null
        if (import.meta.client) {
          navigateTo('/login')
        }
      }
    },
  })

  // ============================================================
  // Nhóm endpoint: AUTH
  // ============================================================
  const auth = {
    login(payload: LoginPayload) {
      return apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: payload,
      })
    },

    logout() {
      return apiFetch('/auth/logout', { method: 'POST' })
    },

    me() {
      return apiFetch<User>('/auth/me')
    },
  }

  // ============================================================
  // Nhóm endpoint: USERS
  // ============================================================
  const users = {
    list(query: ListQuery = {}) {
      return apiFetch<Paginated<User>>('/users', { query })
    },

    detail(id: number | string) {
      return apiFetch<User>(`/users/${id}`)
    },

    create(payload: Partial<User>) {
      return apiFetch<User>('/users', {
        method: 'POST',
        body: payload,
      })
    },

    update(id: number | string, payload: Partial<User>) {
      return apiFetch<User>(`/users/${id}`, {
        method: 'PUT',
        body: payload,
      })
    },

    remove(id: number | string) {
      return apiFetch(`/users/${id}`, { method: 'DELETE' })
    },
  }

  // ----- Public API của composable -----
  return {
    apiFetch, // raw client — dùng cho endpoint chưa được gom nhóm
    token,
    auth,
    users,
  }
}
