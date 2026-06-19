// Hiển thị số tin nhắn/thông báo chưa đọc lên tiêu đề tab trình duyệt
// (kiểu thiết bị: "(3) LongHieu Chanel").
export default defineNuxtPlugin(() => {
  const store = useSocialStore()
  const baseTitle = 'LongHieu Chanel'

  watch(
    () => store.unreadMessagesCount + store.unreadNotificationsCount,
    (count) => {
      document.title = count > 0 ? `(${count > 99 ? '99+' : count}) ${baseTitle}` : baseTitle
    },
    { immediate: true },
  )

  // Lưu tab đang mở để reload giữ nguyên trang (mọi đường đổi tab, kể cả set trực tiếp).
  // immediate:false để không ghi đè giá trị đã lưu trước khi hydrate khôi phục.
  watch(
    () => store.currentTab,
    (tab) => localStorage.setItem('vs_currentTab', tab),
    { immediate: false },
  )
})
