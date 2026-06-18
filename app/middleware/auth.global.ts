// Bảo vệ route: chưa đăng nhập → /login; đã đăng nhập mà vào trang auth → /
export default defineNuxtRouteMiddleware((to) => {
  // localStorage chỉ có ở client; bỏ qua phía server (app render client-only)
  if (!import.meta.client) return

  const authed = localStorage.getItem('vs_isAuthenticated') === 'true'
  const authPages = ['/login', '/register', '/forgot-password']
  const isAuthPage = authPages.includes(to.path)

  if (!authed && !isAuthPage) return navigateTo('/login')
  if (authed && isAuthPage) return navigateTo('/')
})
