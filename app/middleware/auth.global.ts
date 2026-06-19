// Bảo vệ route: chưa đăng nhập → /login; đã đăng nhập mà vào trang auth → /
export default defineNuxtRouteMiddleware((to) => {
  const authCookie = useCookie<string | null>('vs_isAuthenticated')
  if (!authCookie.value && import.meta.client && localStorage.getItem('vs_isAuthenticated') === 'true') {
    authCookie.value = 'true'
  }
  const authed = authCookie.value === 'true'
  const authPages = ['/login', '/register', '/forgot-password']
  const isAuthPage = authPages.includes(to.path)

  if (!authed && !isAuthPage) return navigateTo('/login')
  if (authed && isAuthPage) return navigateTo('/')
})
