<script setup lang="ts">
import {
  Send, MessageCircle, ArrowLeft, ArrowDown, SmilePlus, Pencil, Trash2, Check, X,
  Image as ImageIcon, Copy, Mic, Video, MapPin, Smile, Film, Plus, PhoneOff,
  SquarePen, Search, MoreVertical, EyeOff, Eye, CheckCheck, MailOpen, Users,
} from 'lucide-vue-next'
import type { Chat, Message } from '~/types'
import type { ApiUserResult } from '~/types/api'

type MediaLibraryItem = {
  id: string
  title: string
  url: string
}

const store = useSocialStore()
const { chats, currentUser } = storeToRefs(store)

const showHiddenChats = ref(false)
const visibleChats = computed(() => chats.value.filter((chat) => !chat.hidden))
const hiddenChats = computed(() => chats.value.filter((chat) => chat.hidden))
const listedChats = computed(() => showHiddenChats.value ? hiddenChats.value : visibleChats.value)
const activeChatId = ref<string | null>(visibleChats.value[0]?.id ?? null)
const draft = ref('')
const isBotTyping = ref(false)
const scrollEl = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const uploadingLabel = ref('media')
const showJumpToLatest = ref(false)
const hasNewInActiveChat = ref(false)
const loadedMediaIds = ref<Set<string>>(new Set())

// Sửa / biểu cảm tin nhắn
const editingId = ref<string | null>(null)
const editText = ref('')
const reactMenuId = ref<string | null>(null)
const chatActionMenuId = ref<string | null>(null)
const quickEmojis = ['👍', '❤️', '😆', '😮', '😢', '🙏']

// Bảng đính kèm / sticker / gif
const showAttachMenu = ref(false)
const showStickerPanel = ref(false)
const stickerTab = ref<'sticker' | 'gif'>('sticker')
const mediaLibraryQuery = ref('')
const mediaLibraryLoading = ref(false)
const mediaLibraryItems = ref<MediaLibraryItem[]>([])
let mediaLibraryDebounce: ReturnType<typeof setTimeout> | null = null

// Ghi âm (giả lập)
const isRecording = ref(false)
const recordSeconds = ref(0)
let recordTimer: ReturnType<typeof setInterval> | null = null

// Gọi video
const inCall = computed(() => !!store.activeCall)

// Menu cuộc hội thoại (xóa)
const showChatMenu = ref(false)

// Tìm kiếm người dùng để nhắn tin mới
const showSearch = ref(false)
const showGroupModal = ref(false)
const searchQuery = ref('')
const searchResults = ref<ApiUserResult[]>([])
const searchLoading = ref(false)
let searchDebounce: ReturnType<typeof setTimeout> | null = null
const groupName = ref('')
const groupMembers = ref<ApiUserResult[]>([])

const activeChat = computed(() => visibleChats.value.find((c) => c.id === activeChatId.value) || null)

// Hội thoại thật từ API có id dạng UUID; chat với bot AI thì không.
function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// Tin nhắn cuối cùng của mình (để gắn nhãn "Đã xem"/"Đã gửi")
const lastMyMsg = computed(() => {
  const msgs = activeChat.value?.messages ?? []
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]!.sender === 'me') return msgs[i]!
  }
  return null
})
const lastMyMsgId = computed(() => lastMyMsg.value?.id ?? null)

// Đã xem: với bot dùng cờ msg.seen; với hội thoại thật dùng mốc lastSeenAt từ WebSocket
const lastMyMsgSeen = computed(() => {
  const msg = lastMyMsg.value
  const chat = activeChat.value
  if (!msg || !chat) return false
  if (msg.seen) return true
  if (chat.lastSeenAt) {
    return new Date(chat.lastSeenAt).getTime() >= new Date(msg.createdAt).getTime()
  }
  return false
})

function selectChat(id: string) {
  activeChatId.value = id
  showSearch.value = false
  chatActionMenuId.value = null
  closePanels()
  // Luôn đánh dấu đã đọc khi mở (kể cả khi đang là chat active sẵn → watch không bắn)
  store.setActiveChatInMessenger(id)
}

function closeChatActions() {
  chatActionMenuId.value = null
}

function closeFloatingMenus() {
  chatActionMenuId.value = null
  reactMenuId.value = null
  showAttachMenu.value = false
  showStickerPanel.value = false
  showChatMenu.value = false
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target
  if (target instanceof Element && target.closest('[data-messenger-popover]')) return
  closeFloatingMenus()
}

function hideChat(chatId: string) {
  store.hideChat(chatId)
  if (activeChatId.value === chatId) activeChatId.value = visibleChats.value.find((c) => c.id !== chatId)?.id ?? null
  closeChatActions()
}

function unhideChat(chatId: string) {
  store.unhideChat(chatId)
  showHiddenChats.value = false
  activeChatId.value = chatId
  store.setActiveChatInMessenger(chatId)
  closeChatActions()
}

function deleteChat(chatId: string) {
  store.deleteChat(chatId)
  if (activeChatId.value === chatId) activeChatId.value = visibleChats.value.find((c) => c.id !== chatId)?.id ?? null
  closeChatActions()
}

function markRead(chatId: string) {
  store.markChatRead(chatId)
  closeChatActions()
}

function markUnread(chatId: string) {
  store.markChatUnread(chatId)
  closeChatActions()
}

// ---------- Tìm người dùng + mở hội thoại mới ----------
function openSearch() {
  showHiddenChats.value = false
  showSearch.value = true
  showGroupModal.value = false
  searchQuery.value = ''
  searchResults.value = []
}
function closeSearch() {
  showSearch.value = false
  searchQuery.value = ''
  searchResults.value = []
}
function openGroupModal() {
  showHiddenChats.value = false
  showGroupModal.value = true
  showSearch.value = false
  groupName.value = ''
  groupMembers.value = []
  searchQuery.value = ''
  searchResults.value = []
}
function closeGroupModal() {
  showGroupModal.value = false
  groupName.value = ''
  groupMembers.value = []
  searchQuery.value = ''
  searchResults.value = []
}
function onSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce)
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  searchDebounce = setTimeout(async () => {
    searchLoading.value = true
    try {
      searchResults.value = await store.searchUsersFromApi(q)
    } finally {
      searchLoading.value = false
    }
  }, 300)
}
function toggleGroupMember(user: ApiUserResult) {
  const exists = groupMembers.value.some((member) => member.id === user.id)
  groupMembers.value = exists
    ? groupMembers.value.filter((member) => member.id !== user.id)
    : [...groupMembers.value, user]
}
function createGroup() {
  if (!groupMembers.value.length) {
    store.showToast('Chọn ít nhất 1 thành viên để tạo nhóm.')
    return
  }
  const chatId = store.createGroupChat(groupName.value, groupMembers.value)
  closeGroupModal()
  store.setTab('messenger')
  activeChatId.value = chatId
  store.setActiveChatInMessenger(chatId)
}
async function startChatWith(user: ApiUserResult) {
  closeSearch()
  const chatId = await store.openOrCreateChat(user.id, {
    name: user.name,
    username: user.username,
    avatar: user.avatar,
  })
  if (chatId) {
    store.setTab('messenger')
    activeChatId.value = chatId
    store.setActiveChatInMessenger(chatId)
    await scrollToBottom()
  }
}

function closePanels() {
  showAttachMenu.value = false
  showStickerPanel.value = false
  showChatMenu.value = false
}

// Bấm vào ô nhập = đã đọc → ẩn badge thông báo tin nhắn của hội thoại hiện tại
function onInputFocus() {
  closePanels()
  if (activeChat.value) store.markChatRead(activeChat.value.id)
}

// ---------- Sửa / xóa / biểu cảm ----------
function startEdit(msgId: string, text: string) {
  editingId.value = msgId
  editText.value = text
  reactMenuId.value = null
}
function saveEdit() {
  if (activeChat.value && editingId.value && editText.value.trim()) {
    store.editMessage(activeChat.value.id, editingId.value, editText.value.trim())
  }
  editingId.value = null
}
function cancelEdit() {
  editingId.value = null
}
async function del(msgId: string) {
  if (activeChat.value) await store.deleteMessage(activeChat.value.id, msgId)
}

async function deleteConversation() {
  const chat = activeChat.value
  if (!chat) return
  if (!confirm(`Xóa cuộc trò chuyện với ${chat.targetUser.name}?`)) return
  showChatMenu.value = false
  activeChatId.value = null
  await store.deleteConversation(chat.id)
}
function pickReact(msgId: string, emoji: string) {
  if (activeChat.value) store.reactMessage(activeChat.value.id, msgId, emoji)
  reactMenuId.value = null
}

async function copyMessage(msg: Message) {
  const content = msg.text || msg.image || msg.location?.label || ''
  try {
    if (import.meta.client && navigator.clipboard) await navigator.clipboard.writeText(content)
    store.showToast('Đã sao chép nội dung tin nhắn 📋')
  } catch {
    store.showToast('Trình duyệt không cho phép sao chép.')
  }
  reactMenuId.value = null
}

function waitForFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

async function scrollToBottom() {
  await nextTick()
  if (import.meta.client) {
    await waitForFrame()
    await waitForFrame()
  }
  if (scrollEl.value) {
    scrollEl.value.scrollTop = scrollEl.value.scrollHeight
    showJumpToLatest.value = false
    hasNewInActiveChat.value = false
    if (activeChat.value) store.markChatRead(activeChat.value.id)
  }
}

function isNearBottom(offset = 96) {
  const el = scrollEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight <= offset
}

function onMessagesScroll() {
  if (isNearBottom()) {
    showJumpToLatest.value = false
    hasNewInActiveChat.value = false
    if (activeChat.value) store.markChatRead(activeChat.value.id)
  }
}

function onMessageMediaLoaded() {
  if (!isNearBottom(220)) return
  scrollToBottom()
}

function isMediaLoaded(msgId: string) {
  return loadedMediaIds.value.has(msgId)
}

function markMediaLoaded(msgId: string) {
  if (!loadedMediaIds.value.has(msgId)) {
    loadedMediaIds.value = new Set([...loadedMediaIds.value, msgId])
  }
  onMessageMediaLoaded()
}

// ---------- Gửi tin nhắn ----------
function botContext(extra: Partial<Message>): string {
  switch (extra.kind) {
    case 'image': return '[Tôi vừa gửi một hình ảnh]'
    case 'video': return '[Tôi vừa gửi một video]'
    case 'audio': return '[Tôi vừa gửi một tệp âm thanh]'
    case 'gif': return '[Tôi vừa gửi một ảnh GIF vui]'
    case 'sticker': return `[Tôi vừa gửi một nhãn dán: ${extra.text || ''}]`
    case 'voice': return '[Tôi vừa gửi một tin nhắn thoại]'
    case 'location': return '[Tôi vừa chia sẻ vị trí của mình]'
    default: return ''
  }
}

async function botReply(chat: Chat, contextText: string) {
  isBotTyping.value = true
  try {
    const data = await $fetch<{ text?: string; error?: string }>('/api/gemini/comment-reply', {
      method: 'POST',
      body: {
        postContent: contextText,
        authorName: currentUser.value.name,
        botPersona: {
          name: chat.targetUser.name,
          bio: chat.targetUser.bio,
          commentStyle: chat.targetUser.commentStyle || 'thân thiện, gần gũi',
        },
      },
    })
    const reply = !data.error && data.text
      ? data.text
      : 'Cảm ơn bạn đã nhắn tin! Mình sẽ phản hồi chi tiết sớm nhé 😊 (cấu hình NUXT_GEMINI_API_KEY để bot trả lời thông minh hơn)'
    store.receiveBotReply(chat.id, reply)
  } catch {
    store.receiveBotReply(chat.id, 'Mình đã nhận được tin nhắn của bạn rồi nha! 💬')
  } finally {
    isBotTyping.value = false
  }
}

async function send() {
  const chat = activeChat.value
  const text = draft.value.trim()
  if (!chat || !text) return
  store.sendMessage(chat.id, text)
  draft.value = ''
  closePanels()
  await scrollToBottom()
  // Chỉ bot AI mới tự trả lời; hội thoại thật (UUID) đi qua API/WebSocket.
  if (!isUuid(chat.id)) botReply(chat, text)
}

// Gửi đính kèm (ảnh / gif / sticker / vị trí / thoại)
function pushAttachment(text: string, extra: Partial<Message>) {
  const chat = activeChat.value
  if (!chat) return
  store.sendMessage(chat.id, text, extra)
  closePanels()
  scrollToBottom()
  if (!isUuid(chat.id)) botReply(chat, text || botContext(extra))
}

// ---------- Media từ thiết bị + dán ảnh ----------
function triggerMediaPick() {
  closePanels()
  fileInput.value?.click()
}
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) sendMediaFile(file)
  input.value = ''
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function mediaKindFromFile(file: File): 'image' | 'video' | 'audio' | 'gif' | null {
  if (file.type.startsWith('image/')) return file.type === 'image/gif' ? 'gif' : 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return null
}

function mediaLabel(kind: 'image' | 'video' | 'audio' | 'gif') {
  if (kind === 'video') return 'video'
  if (kind === 'audio') return 'audio'
  if (kind === 'gif') return 'GIF'
  return 'ảnh'
}

// Ảnh vẫn fallback base64 cho bản demo cũ. Video/audio bắt buộc đi qua S3.
async function uploadMedia(file: File, kind: 'image' | 'video' | 'audio' | 'gif'): Promise<string> {
  const token = useAuthStore().getAccessToken()
  if (token) {
    try {
      const res = await useMxhApi().media.upload(token, file)
      const url = extractMediaUrl(res)
      if (url) return url
      console.warn('Upload S3 không trả về URL.')
    } catch (err) {
      console.warn(`Upload ${mediaLabel(kind)} lên S3 thất bại:`, err)
    }
  }
  if (kind === 'video' || kind === 'audio') {
    throw new Error('Media phải upload lên S3 trước khi gửi.')
  }
  return fileToDataUrl(file)
}

async function sendMediaFile(file: File) {
  const kind = mediaKindFromFile(file)
  if (!activeChat.value || !kind) {
    store.showToast('Chỉ hỗ trợ ảnh, video hoặc audio.')
    return
  }
  isUploading.value = true
  uploadingLabel.value = mediaLabel(kind)
  store.showToast(`Đang tải ${uploadingLabel.value} lên S3...`)
  try {
    const url = await uploadMedia(file, kind)
    pushAttachment('', { kind, image: url })
  } catch {
    store.showToast(`Không tải được ${uploadingLabel.value} lên S3.`)
  } finally {
    isUploading.value = false
  }
}
function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const it of items) {
    if (it.type.startsWith('image/')) {
      const file = it.getAsFile()
      if (file) {
        e.preventDefault()
        sendMediaFile(file)
      }
      break
    }
  }
}

// ---------- Sticker / GIF ----------
async function loadMediaLibrary() {
  mediaLibraryLoading.value = true
  try {
    const res = await $fetch<{ items: MediaLibraryItem[] }>('/api/media-library', {
      query: {
        kind: stickerTab.value,
        q: mediaLibraryQuery.value.trim() || undefined,
      },
    })
    mediaLibraryItems.value = res.items || []
  } catch {
    mediaLibraryItems.value = []
    store.showToast('Không tải được thư viện GIF/sticker.')
  } finally {
    mediaLibraryLoading.value = false
  }
}

function onMediaLibrarySearch() {
  if (mediaLibraryDebounce) clearTimeout(mediaLibraryDebounce)
  mediaLibraryDebounce = setTimeout(() => {
    loadMediaLibrary()
  }, 350)
}

function setStickerTab(tab: 'sticker' | 'gif') {
  stickerTab.value = tab
  mediaLibraryQuery.value = ''
  mediaLibraryItems.value = []
  loadMediaLibrary()
}

function toggleStickerPanel(tab: 'sticker' | 'gif') {
  showAttachMenu.value = false
  if (showStickerPanel.value && stickerTab.value === tab) {
    showStickerPanel.value = false
  } else {
    setStickerTab(tab)
    showStickerPanel.value = true
  }
}
function sendSticker(url: string) {
  pushAttachment('', { kind: 'sticker', image: url })
}
function sendGif(url: string) {
  pushAttachment('', { kind: 'gif', image: url })
}

// ---------- Vị trí ----------
function shareLocation() {
  closePanels()
  const fallback = () => pushAttachment('', { kind: 'location', location: { label: 'Vị trí hiện tại của tôi' } })
  if (import.meta.client && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => pushAttachment('', {
        kind: 'location',
        location: { label: 'Vị trí hiện tại của tôi', lat: pos.coords.latitude, lng: pos.coords.longitude },
      }),
      fallback,
      { timeout: 8000 },
    )
  } else {
    fallback()
  }
}
function mapHref(loc?: Message['location']) {
  if (loc?.lat != null && loc?.lng != null) return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`
  return 'https://www.google.com/maps'
}

// ---------- Ghi âm (giả lập) ----------
function startRecording() {
  closePanels()
  if (!activeChat.value) return
  isRecording.value = true
  recordSeconds.value = 0
  recordTimer = setInterval(() => { recordSeconds.value += 1 }, 1000)
}
function cancelRecording() {
  if (recordTimer) clearInterval(recordTimer)
  recordTimer = null
  isRecording.value = false
  recordSeconds.value = 0
}
function stopRecordingAndSend() {
  const secs = recordSeconds.value
  cancelRecording()
  if (secs < 1) return
  pushAttachment('', { kind: 'voice', voiceDuration: secs })
}

// ---------- Gọi video (WebRTC) ----------
function startCall() {
  if (!activeChat.value || !isUuid(activeChat.value.id)) return
  closePanels()
  store.startCall(
    activeChat.value.targetUser.id,
    activeChat.value.targetUser.name,
    activeChat.value.targetUser.avatar,
  )
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function timeLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function messageTextParts(text: string) {
  const parts: Array<{ text: string; href?: string }> = []
  const urlPattern = /((https?:\/\/|www\.)[^\s<]+)/gi
  let cursor = 0
  for (const match of text.matchAll(urlPattern)) {
    const value = match[0]
    const index = match.index ?? 0
    if (index > cursor) parts.push({ text: text.slice(cursor, index) })
    const clean = value.replace(/[),.;!?]+$/g, '')
    const suffix = value.slice(clean.length)
    parts.push({ text: clean, href: clean.startsWith('http') ? clean : `https://${clean}` })
    if (suffix) parts.push({ text: suffix })
    cursor = index + value.length
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) })
  return parts
}

watch(activeChatId, async (id) => {
  showJumpToLatest.value = false
  hasNewInActiveChat.value = false
  if (id) store.setActiveChatInMessenger(id)
  if (id) await scrollToBottom()
})

watch(visibleChats, (items) => {
  if (activeChatId.value && items.some((chat) => chat.id === activeChatId.value)) return
  activeChatId.value = items[0]?.id ?? null
})

watch(showHiddenChats, (isHiddenList) => {
  closeChatActions()
  if (isHiddenList) {
    activeChatId.value = null
    store.setActiveChatInMessenger(null)
    return
  }
  if (!activeChatId.value) activeChatId.value = visibleChats.value[0]?.id ?? null
})

watch(
  () => activeChat.value?.messages.length ?? 0,
  async (len, oldLen) => {
    if (!activeChat.value || !oldLen || len <= oldLen) return
    const latest = activeChat.value.messages[activeChat.value.messages.length - 1]
    const wasNearBottom = isNearBottom()
    await nextTick()
    if (latest?.sender === 'me' || wasNearBottom) {
      await scrollToBottom()
      return
    }
    showJumpToLatest.value = true
    hasNewInActiveChat.value = true
  },
)

onMounted(async () => {
  if (import.meta.client) document.addEventListener('click', onDocumentClick)
  await store.syncChatsFromApi()
  store.connectWebSocket()
  const firstId = visibleChats.value[0]?.id ?? null
  if (!activeChatId.value && firstId) {
    activeChatId.value = firstId
    store.setActiveChatInMessenger(firstId)
  }
  if (activeChatId.value) await scrollToBottom()
})
onUnmounted(() => {
  if (import.meta.client) document.removeEventListener('click', onDocumentClick)
  store.setActiveChatInMessenger(null)
  if (recordTimer) clearInterval(recordTimer)
  if (searchDebounce) clearTimeout(searchDebounce)
  if (mediaLibraryDebounce) clearTimeout(mediaLibraryDebounce)
})
</script>

<template>
  <div class="w-full max-w-5xl mx-auto h-full p-0 md:p-4 flex">
    <div class="flex flex-1 min-h-0 overflow-hidden md:rounded-3xl border-0 md:border border-slate-800 bg-slate-800/40">
      <!-- Chat list -->
      <div
        class="w-full md:w-72 shrink-0 border-r border-slate-800 flex-col min-h-0"
        :class="activeChat && 'hidden md:flex' || 'flex'"
      >
        <div class="px-4 py-3.5 border-b border-slate-800 shrink-0 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-slate-100">{{ showHiddenChats ? 'Đã ẩn' : 'Tin nhắn' }}</h2>
            <p v-if="showHiddenChats" class="mt-0.5 text-[10px] font-semibold text-slate-500">Chọn một cuộc trò chuyện để hiện lại</p>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="hiddenChats.length"
              class="flex h-7 items-center gap-1.5 rounded-full px-2 text-[10px] font-bold transition"
              :class="showHiddenChats ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'"
              :title="showHiddenChats ? 'Quay lại tin nhắn' : 'Xem cuộc trò chuyện đã ẩn'"
              @click="showHiddenChats = !showHiddenChats"
            >
              <EyeOff class="h-3.5 w-3.5" />
              {{ hiddenChats.length }}
            </button>
            <button
              class="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition"
              title="Tạo nhóm chat"
              @click="openGroupModal"
            >
              <Users class="h-4 w-4" />
            </button>
            <button
              class="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition"
              title="Nhắn tin mới"
              @click="openSearch"
            >
              <SquarePen class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Tìm người dùng để nhắn tin mới -->
        <div v-if="showSearch || showGroupModal" class="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div class="p-3 border-b border-slate-800 shrink-0">
            <div v-if="showGroupModal" class="mb-2 space-y-2">
              <input
                v-model="groupName"
                type="text"
                placeholder="Tên nhóm chat"
                class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none"
              >
              <div v-if="groupMembers.length" class="flex flex-wrap gap-1.5">
                <button
                  v-for="member in groupMembers"
                  :key="member.id"
                  class="flex items-center gap-1 rounded-full bg-indigo-950/60 px-2 py-1 text-[10px] font-bold text-indigo-200"
                  @click="toggleGroupMember(member)"
                >
                  <span>@{{ member.username }}</span>
                  <X class="h-3 w-3" />
                </button>
              </div>
            </div>
            <div class="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 focus-within:border-indigo-500/50">
              <Search class="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="showGroupModal ? 'Tìm username để thêm vào nhóm...' : 'Tìm người dùng...'"
                class="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                @input="onSearchInput"
                @keyup.esc="showGroupModal ? closeGroupModal() : closeSearch()"
              >
              <button class="text-slate-500 hover:text-slate-300" @click="showGroupModal ? closeGroupModal() : closeSearch()">
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              v-if="showGroupModal"
              class="mt-2 w-full rounded-xl bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-indigo-500 disabled:opacity-40"
              :disabled="!groupMembers.length"
              @click="createGroup"
            >
              Tạo nhóm chat
            </button>
          </div>
          <div class="flex-1 overflow-y-auto thin-scrollbar min-h-0">
            <div v-if="searchLoading" class="flex items-center justify-center py-8 text-slate-500 text-xs gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:0ms" />
              <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:150ms" />
              <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:300ms" />
            </div>
            <div v-else-if="searchQuery.trim() && !searchResults.length" class="py-8 text-center text-slate-500 text-xs">
              Không tìm thấy người dùng nào
            </div>
            <button
              v-for="user in searchResults"
              :key="user.id"
              class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/60 border-b border-slate-800/50 transition"
              @click="showGroupModal ? toggleGroupMember(user) : startChatWith(user)"
            >
              <img
                :src="user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'"
                :alt="user.name"
                class="h-10 w-10 rounded-full object-cover shrink-0"
                referrerpolicy="no-referrer"
              >
              <div class="flex-1 overflow-hidden">
                <p class="text-xs font-semibold text-slate-100 truncate">{{ user.name || user.username }}</p>
                <p class="text-[10px] text-slate-400 truncate">@{{ user.username }}</p>
              </div>
              <Check v-if="showGroupModal && groupMembers.some(member => member.id === user.id)" class="h-4 w-4 text-indigo-300" />
            </button>
          </div>
        </div>

        <!-- Danh sách hội thoại -->
        <div v-else class="flex-1 overflow-y-auto thin-scrollbar min-h-0">
          <div v-if="!listedChats.length" class="px-5 py-10 text-center">
            <p class="text-xs font-bold text-slate-300">
              {{ showHiddenChats ? 'Chưa có cuộc trò chuyện nào bị ẩn' : 'Chưa có cuộc trò chuyện nào' }}
            </p>
            <button
              v-if="showHiddenChats"
              class="mt-3 rounded-full bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-slate-700"
              @click="showHiddenChats = false"
            >
              Quay lại tin nhắn
            </button>
          </div>
          <button
            v-for="chat in listedChats"
            :key="chat.id"
            class="flex w-full items-center gap-3 px-4 py-3 text-left border-b border-slate-800/50 transition"
            :class="activeChatId === chat.id ? 'bg-indigo-950/30' : 'hover:bg-slate-800/60'"
            @click="showHiddenChats ? unhideChat(chat.id) : selectChat(chat.id)"
          >
            <div class="relative">
              <img :src="chat.targetUser.avatar" :alt="chat.targetUser.name" class="h-11 w-11 rounded-full object-cover" referrerpolicy="no-referrer">
              <span
                v-if="!chat.isGroup"
                class="absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-slate-900 transition-colors"
                :class="store.isUserOnline(chat.targetUser.id) ? 'bg-emerald-500' : 'bg-slate-600'"
              />
              <span v-else class="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 ring-2 ring-slate-900">
                <Users class="h-2.5 w-2.5 text-white" />
              </span>
            </div>
            <div class="flex-1 overflow-hidden">
              <div class="flex items-center justify-between">
                <p
                  class="text-xs truncate"
                  :class="chat.unreadCount > 0 ? 'font-extrabold text-white' : 'font-bold text-slate-100'"
                >{{ chat.targetUser.name }}</p>
                <span class="text-[9px] text-slate-500 shrink-0">{{ chat.lastMessageTime }}</span>
              </div>
              <p
                class="text-[11px] truncate"
                :class="chat.unreadCount > 0 ? 'font-semibold text-slate-200' : 'text-slate-400'"
              >{{ chat.lastMessage }}</p>
            </div>
            <span v-if="chat.unreadCount > 0" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shrink-0">
              {{ chat.unreadCount }}
            </span>
            <div class="relative shrink-0" data-messenger-popover @click.stop>
              <button class="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-700 hover:text-slate-100" @click="chatActionMenuId = chatActionMenuId === chat.id ? null : chat.id">
                <MoreVertical class="h-4 w-4" />
              </button>
              <div v-if="chatActionMenuId === chat.id" class="absolute right-0 top-full z-30 mt-1 w-44 rounded-2xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
                <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:bg-slate-800" @click="markRead(chat.id)">
                  <CheckCheck class="h-4 w-4 text-emerald-400" /> Đánh dấu đã đọc
                </button>
                <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:bg-slate-800" @click="markUnread(chat.id)">
                  <MailOpen class="h-4 w-4 text-indigo-400" /> Đánh dấu chưa đọc
                </button>
                <button v-if="!showHiddenChats" class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:bg-slate-800" @click="hideChat(chat.id)">
                  <EyeOff class="h-4 w-4 text-amber-400" /> Ẩn cuộc trò chuyện
                </button>
                <button v-else class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:bg-slate-800" @click="unhideChat(chat.id)">
                  <Eye class="h-4 w-4 text-emerald-400" /> Hiện lại cuộc trò chuyện
                </button>
                <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-300 transition hover:bg-rose-950/40" @click="deleteChat(chat.id)">
                  <Trash2 class="h-4 w-4" /> Xóa cuộc trò chuyện
                </button>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Active chat -->
      <div class="flex-1 flex-col min-h-0 relative" :class="activeChat ? 'flex' : 'hidden md:flex'">
        <template v-if="activeChat">
          <!-- Header -->
          <div
            class="flex items-center gap-3 px-4 py-3 border-b border-slate-800 shrink-0 transition"
            :class="hasNewInActiveChat ? 'bg-indigo-950/20 shadow-[0_0_32px_rgba(99,102,241,0.12)]' : ''"
          >
            <button class="md:hidden text-slate-400" @click="activeChatId = null">
              <ArrowLeft class="h-5 w-5" />
            </button>
            <img :src="activeChat.targetUser.avatar" :alt="activeChat.targetUser.name" class="h-9 w-9 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-400/40 transition" referrerpolicy="no-referrer" @click="store.viewProfile(activeChat.targetUser.id)">
            <div class="flex-1 cursor-pointer" @click="store.viewProfile(activeChat.targetUser.id)">
              <p class="text-xs font-bold text-slate-100 hover:text-indigo-400 transition">{{ activeChat.targetUser.name }}</p>
              <p
                class="text-[10px] transition"
                :class="store.isUserOnline(activeChat.targetUser.id) ? 'text-emerald-400' : 'text-slate-500'"
              >
                {{ store.getUserStatusLabel(activeChat.targetUser.id, activeChat.targetUser.lastSeenAt) }}
              </p>
            </div>
            <!-- Gọi video -->
            <button class="flex h-9 w-9 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-950/40 transition disabled:opacity-40 disabled:cursor-not-allowed" title="Gọi video" :disabled="inCall" @click="startCall">
              <Video class="h-5 w-5" />
            </button>
            <!-- Menu cuộc hội thoại -->
            <div class="relative">
              <button
                class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                title="Tùy chọn"
                @click="showChatMenu = !showChatMenu"
              >
                <MoreVertical class="h-4 w-4" />
              </button>
              <div v-if="showChatMenu" class="absolute right-0 top-full mt-1 w-44 rounded-2xl border border-slate-700 bg-slate-900 p-1 shadow-xl z-30">
                <button
                  class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-950/40 transition"
                  @click="deleteConversation"
                >
                  <Trash2 class="h-3.5 w-3.5" /> Xóa cuộc trò chuyện
                </button>
              </div>
            </div>
          </div>

          <!-- Messages -->
          <div
            ref="scrollEl"
            class="flex-1 overflow-y-auto thin-scrollbar min-h-0 p-4 space-y-3"
            @click="closePanels"
            @scroll="onMessagesScroll"
          >
            <div v-for="msg in activeChat.messages" :key="msg.id">
              <div class="group/msg flex items-end gap-1.5" :class="msg.sender === 'me' ? 'justify-end' : 'justify-start'">
                <img
                  v-if="msg.sender === 'them'"
                  :src="activeChat.targetUser.avatar"
                  :alt="activeChat.targetUser.name"
                  class="h-7 w-7 shrink-0 rounded-full object-cover"
                  referrerpolicy="no-referrer"
                >
                <!-- Hành động (trái) cho tin của mình -->
                <div v-if="msg.sender === 'me' && editingId !== msg.id" class="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition self-center">
                  <div class="relative" data-messenger-popover>
                    <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-700 hover:text-slate-200" title="Biểu cảm" @click="reactMenuId = reactMenuId === msg.id ? null : msg.id">
                      <SmilePlus class="h-3.5 w-3.5" />
                    </button>
                    <div v-if="reactMenuId === msg.id" class="absolute bottom-full right-0 mb-1 flex gap-1 rounded-2xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl z-20">
                      <button v-for="e in quickEmojis" :key="e" class="text-lg transition hover:scale-125" @click="pickReact(msg.id, e)">{{ e }}</button>
                    </div>
                  </div>
                  <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-700 hover:text-slate-200" title="Sao chép" @click="copyMessage(msg)">
                    <Copy class="h-3.5 w-3.5" />
                  </button>
                  <button v-if="!msg.kind || msg.kind === 'text'" class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-700 hover:text-slate-200" title="Sửa" @click="startEdit(msg.id, msg.text)">
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                  <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-rose-950/50 hover:text-rose-400" title="Xóa" @click="del(msg.id)">
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>

                <!-- Bubble / nội dung -->
                <div class="relative max-w-[78%]">
                  <!-- Form sửa -->
                  <div v-if="editingId === msg.id" class="flex items-center gap-1.5 rounded-2xl bg-slate-950 border border-indigo-500/40 px-2.5 py-1.5">
                    <input v-model="editText" type="text" class="w-48 bg-transparent text-xs text-slate-100 focus:outline-none" @keyup.enter="saveEdit" @keyup.esc="cancelEdit">
                    <button class="text-emerald-400 hover:text-emerald-300" @click="saveEdit"><Check class="h-4 w-4" /></button>
                    <button class="text-slate-500 hover:text-slate-300" @click="cancelEdit"><X class="h-4 w-4" /></button>
                  </div>

                  <!-- Sticker -->
                  <div v-else-if="msg.kind === 'sticker' && msg.image" class="relative overflow-hidden rounded-2xl bg-slate-900/80 p-1">
                    <div v-if="!isMediaLoaded(msg.id)" class="flex h-28 w-28 items-center justify-center rounded-xl bg-slate-950/70 text-[10px] font-bold text-slate-500">
                      <span class="h-3 w-3 rounded-full border-2 border-slate-500/40 border-t-indigo-400 animate-spin" />
                    </div>
                    <img
                      :src="msg.image"
                      alt="Nhãn dán"
                      class="h-28 w-28 object-contain transition-opacity duration-150"
                      :class="isMediaLoaded(msg.id) ? 'opacity-100' : 'absolute inset-1 opacity-0'"
                      referrerpolicy="no-referrer"
                      @load="markMediaLoaded(msg.id)"
                      @error="markMediaLoaded(msg.id)"
                    >
                  </div>
                  <div v-else-if="msg.kind === 'sticker'" class="text-5xl leading-none py-1">
                    {{ msg.text }}
                  </div>

                  <!-- Ảnh / GIF -->
                  <div v-else-if="(msg.kind === 'image' || msg.kind === 'gif') && msg.image" class="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900">
                    <div v-if="!isMediaLoaded(msg.id)" class="flex h-44 w-[230px] max-w-full items-center justify-center bg-slate-950/70 text-[11px] font-bold text-slate-400">
                      <span class="mr-2 h-3 w-3 rounded-full border-2 border-slate-500/40 border-t-indigo-400 animate-spin" />
                      Đang tải ảnh...
                    </div>
                    <img
                      :src="msg.image"
                      alt="Hình ảnh"
                      class="max-w-[230px] w-full object-cover transition-opacity duration-150"
                      :class="isMediaLoaded(msg.id) ? 'opacity-100' : 'absolute inset-0 opacity-0'"
                      referrerpolicy="no-referrer"
                      @load="markMediaLoaded(msg.id)"
                      @error="markMediaLoaded(msg.id)"
                    >
                    <p class="px-2 py-1 text-[9px] text-right text-slate-400 bg-slate-900/60">{{ timeLabel(msg.createdAt) }}</p>
                  </div>

                  <!-- Video -->
                  <div v-else-if="msg.kind === 'video' && msg.image" class="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950">
                    <div v-if="!isMediaLoaded(msg.id)" class="flex h-40 w-[260px] max-w-full items-center justify-center bg-slate-950 text-[11px] font-bold text-slate-400">
                      <span class="mr-2 h-3 w-3 rounded-full border-2 border-slate-500/40 border-t-indigo-400 animate-spin" />
                      Đang tải video...
                    </div>
                    <video
                      :src="msg.image"
                      class="block max-h-64 w-[260px] max-w-full bg-black object-contain transition-opacity duration-150"
                      :class="isMediaLoaded(msg.id) ? 'opacity-100' : 'absolute inset-0 opacity-0'"
                      controls
                      playsinline
                      preload="metadata"
                      @loadedmetadata="markMediaLoaded(msg.id)"
                      @error="markMediaLoaded(msg.id)"
                    />
                    <p class="px-2 py-1 text-[9px] text-right text-slate-400 bg-slate-900/60">{{ timeLabel(msg.createdAt) }}</p>
                  </div>

                  <!-- Audio -->
                  <div
                    v-else-if="msg.kind === 'audio' && msg.image"
                    class="min-w-56 rounded-2xl border border-slate-700/50 px-3 py-2.5"
                    :class="msg.sender === 'me' ? 'bg-indigo-600/90' : 'bg-slate-800'"
                  >
                    <div class="mb-2 flex items-center gap-2 text-xs font-bold" :class="msg.sender === 'me' ? 'text-white' : 'text-slate-200'">
                      <Mic class="h-4 w-4" />
                      <span>Âm thanh</span>
                    </div>
                    <audio :src="msg.image" class="h-9 w-56 max-w-full" controls preload="metadata" @loadedmetadata="markMediaLoaded(msg.id)" />
                    <p class="mt-1 text-right text-[9px] opacity-60">{{ timeLabel(msg.createdAt) }}</p>
                  </div>

                  <!-- Tin nhắn thoại -->
                  <div
                    v-else-if="msg.kind === 'voice'"
                    class="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5"
                    :class="msg.sender === 'me' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'"
                  >
                    <Mic class="h-4 w-4 shrink-0 opacity-80" />
                    <span class="flex items-end gap-0.5 h-4">
                      <span v-for="i in 18" :key="i" class="w-0.5 rounded-full bg-current opacity-60" :style="{ height: `${4 + ((i * 7) % 12)}px` }" />
                    </span>
                    <span class="text-[10px] font-mono opacity-90">{{ fmtDur(msg.voiceDuration || 0) }}</span>
                  </div>

                  <!-- Vị trí -->
                  <a
                    v-else-if="msg.kind === 'location'"
                    :href="mapHref(msg.location)"
                    target="_blank"
                    rel="noopener"
                    class="block w-56 overflow-hidden rounded-2xl border border-slate-700/60"
                  >
                    <div class="relative h-24 bg-gradient-to-br from-emerald-700/40 via-slate-800 to-indigo-800/40">
                      <div class="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:14px_14px] opacity-40" />
                      <MapPin class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 text-rose-400 drop-shadow" />
                    </div>
                    <div class="px-3 py-2 bg-slate-900/70">
                      <p class="text-xs font-bold text-slate-100">{{ msg.location?.label }}</p>
                      <p v-if="msg.location?.lat != null" class="text-[9px] text-slate-400">
                        {{ msg.location.lat.toFixed(4) }}, {{ msg.location.lng?.toFixed(4) }}
                      </p>
                      <p class="text-[9px] text-indigo-400 mt-0.5">Mở trong Google Maps →</p>
                    </div>
                  </a>

                  <!-- Tin nhắn văn bản -->
                  <div
                    v-else
                    class="rounded-2xl px-3.5 py-2 text-xs leading-relaxed"
                    :class="msg.sender === 'me' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'"
                  >
                    <p class="whitespace-pre-wrap break-words">
                      <template v-for="(part, index) in messageTextParts(msg.text)" :key="`${msg.id}-${index}`">
                        <a
                          v-if="part.href"
                          :href="part.href"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="font-extrabold underline decoration-white/40 underline-offset-2 transition hover:decoration-current"
                          :class="msg.sender === 'me' ? 'text-white' : 'text-indigo-300'"
                          @click.stop
                        >{{ part.text }}</a>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </p>
                    <p class="mt-1 text-[9px] opacity-60 text-right">
                      <span v-if="msg.edited">đã sửa · </span>{{ timeLabel(msg.createdAt) }}
                    </p>
                  </div>

                  <!-- Badge biểu cảm -->
                  <span v-if="msg.reaction" class="absolute -bottom-2 rounded-full bg-slate-900 border border-slate-700 px-1 text-xs shadow z-10" :class="msg.sender === 'me' ? 'right-2' : 'left-2'">
                    {{ msg.reaction }}
                  </span>
                </div>

                <!-- Hành động (phải) cho tin của người khác -->
                <div v-if="msg.sender === 'them'" class="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition self-center">
                  <div class="relative" data-messenger-popover>
                    <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-700 hover:text-slate-200" title="Biểu cảm" @click="reactMenuId = reactMenuId === msg.id ? null : msg.id">
                      <SmilePlus class="h-3.5 w-3.5" />
                    </button>
                    <div v-if="reactMenuId === msg.id" class="absolute bottom-full left-0 mb-1 flex gap-1 rounded-2xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl z-20">
                      <button v-for="e in quickEmojis" :key="e" class="text-lg transition hover:scale-125" @click="pickReact(msg.id, e)">{{ e }}</button>
                    </div>
                  </div>
                  <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-700 hover:text-slate-200" title="Sao chép" @click="copyMessage(msg)">
                    <Copy class="h-3.5 w-3.5" />
                  </button>
                  <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-rose-950/50 hover:text-rose-400" title="Xóa" @click="del(msg.id)">
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
                <img
                  v-if="msg.sender === 'me'"
                  :src="currentUser.avatar"
                  :alt="currentUser.name"
                  class="h-7 w-7 shrink-0 rounded-full object-cover"
                  referrerpolicy="no-referrer"
                >
              </div>

              <!-- Trạng thái Đã xem / Đã gửi (dưới tin cuối của mình) -->
              <div v-if="msg.sender === 'me' && msg.id === lastMyMsgId" class="mt-1 flex items-center justify-end gap-1 pr-1">
                <template v-if="lastMyMsgSeen">
                  <img :src="activeChat.targetUser.avatar" :alt="activeChat.targetUser.name" class="h-3.5 w-3.5 rounded-full object-cover" referrerpolicy="no-referrer">
                  <span class="text-[9px] text-slate-400">Đã xem</span>
                </template>
                <span v-else class="text-[9px] text-slate-500">Đã gửi</span>
              </div>
            </div>

            <!-- Đang tải media lên S3 -->
            <div v-if="isUploading" class="flex justify-end">
              <div class="flex items-center gap-2 rounded-2xl bg-indigo-600/40 px-3.5 py-2 text-xs text-slate-100">
                <span class="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Đang tải {{ uploadingLabel }} lên S3...
              </div>
            </div>

            <!-- Bot đang gõ -->
            <div v-if="isBotTyping" class="flex justify-start">
              <div class="rounded-2xl bg-slate-800 px-4 py-2.5 text-xs text-slate-400">
                <span class="inline-flex gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:0ms" />
                  <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:150ms" />
                  <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:300ms" />
                </span>
              </div>
            </div>
          </div>

          <button
            v-if="showJumpToLatest"
            class="absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-2xl shadow-indigo-950/60 transition hover:bg-indigo-500"
            @click="() => scrollToBottom()"
          >
            <ArrowDown class="h-4 w-4" />
            <span>Tin nhắn mới</span>
          </button>

          <!-- Bảng sticker / gif -->
          <div v-if="showStickerPanel" class="shrink-0 border-t border-slate-800 bg-slate-900/60 px-3 pt-2 pb-1" data-messenger-popover>
            <div class="mb-2 flex items-center gap-2">
              <button class="rounded-full px-3 py-1 text-[11px] font-bold transition" :class="stickerTab === 'sticker' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'" @click="setStickerTab('sticker')">Nhãn dán</button>
              <button class="rounded-full px-3 py-1 text-[11px] font-bold transition" :class="stickerTab === 'gif' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'" @click="setStickerTab('gif')">GIF</button>
              <div class="ml-auto flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5">
                <Search class="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <input
                  v-model="mediaLibraryQuery"
                  type="text"
                  :placeholder="stickerTab === 'gif' ? 'Tìm GIF...' : 'Tìm nhãn dán...'"
                  class="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-slate-200 placeholder-slate-500 focus:outline-none"
                  @input="onMediaLibrarySearch"
                >
              </div>
            </div>
            <div v-if="mediaLibraryLoading" class="flex h-28 items-center justify-center gap-2 text-xs font-bold text-slate-500">
              <span class="h-4 w-4 rounded-full border-2 border-slate-500/30 border-t-indigo-400 animate-spin" />
              Đang tải thư viện...
            </div>
            <div v-else-if="!mediaLibraryItems.length" class="flex h-28 items-center justify-center text-center text-xs font-bold text-slate-500">
              Không có kết quả
            </div>
            <div v-else class="grid max-h-44 grid-cols-4 gap-1.5 overflow-y-auto thin-scrollbar pb-1">
              <button
                v-for="item in mediaLibraryItems"
                :key="item.id"
                class="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 transition hover:border-indigo-500/50 hover:bg-slate-800"
                @click="stickerTab === 'gif' ? sendGif(item.url) : sendSticker(item.url)"
              >
                <img :src="item.url" :alt="item.title || stickerTab" class="h-20 w-full object-contain" referrerpolicy="no-referrer">
              </button>
            </div>
          </div>

          <!-- Khu nhập tin nhắn -->
          <div class="border-t border-slate-800 p-3 shrink-0">
            <!-- Thanh ghi âm -->
            <div v-if="isRecording" class="flex items-center gap-3 rounded-2xl bg-slate-950 border border-rose-500/40 px-3.5 py-2.5">
              <span class="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span class="text-xs text-slate-300">Đang ghi âm...</span>
              <span class="text-xs font-mono text-rose-400">{{ fmtDur(recordSeconds) }}</span>
              <div class="flex-1" />
              <button class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-200" title="Hủy" @click="cancelRecording">
                <X class="h-4.5 w-4.5" />
              </button>
              <button class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500" title="Gửi" @click="stopRecordingAndSend">
                <Send class="h-4 w-4" />
              </button>
            </div>

            <!-- Thanh nhập bình thường -->
            <div v-else class="flex items-center gap-1.5">
              <!-- Menu đính kèm -->
              <div class="relative shrink-0" data-messenger-popover>
                <button class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition" title="Đính kèm" @click="showAttachMenu = !showAttachMenu; showStickerPanel = false">
                  <Plus class="h-5 w-5" />
                </button>
                <div v-if="showAttachMenu" class="absolute bottom-full left-0 mb-2 w-44 rounded-2xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl z-30">
                  <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 transition" @click="triggerMediaPick">
                    <ImageIcon class="h-4 w-4 text-indigo-400" /> Ảnh / video / audio
                  </button>
                  <button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 transition" @click="shareLocation">
                    <MapPin class="h-4 w-4 text-emerald-400" /> Chia sẻ vị trí
                  </button>
                </div>
              </div>

              <button class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition shrink-0" title="Nhãn dán" data-messenger-popover @click="toggleStickerPanel('sticker')">
                <Smile class="h-5 w-5" />
              </button>
              <button class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition shrink-0" title="GIF" data-messenger-popover @click="toggleStickerPanel('gif')">
                <Film class="h-5 w-5" />
              </button>

              <div class="flex flex-1 items-center gap-2 rounded-2xl bg-slate-950 border border-slate-800 px-3.5 py-2 focus-within:border-indigo-500/40 min-w-0">
                <input
                  v-model="draft"
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  class="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none min-w-0"
                  @keyup.enter="send"
                  @paste="onPaste"
                  @focus="onInputFocus"
                >
              </div>

              <!-- Mic khi rỗng / Gửi khi có chữ -->
              <button v-if="!draft.trim()" class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition shrink-0" title="Tin nhắn thoại" @click="startRecording">
                <Mic class="h-5 w-5" />
              </button>
              <button v-else class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition shrink-0" title="Gửi" @click="send">
                <Send class="h-4 w-4" />
              </button>
            </div>

            <input ref="fileInput" type="file" accept="image/*,video/*,audio/*" class="hidden" @change="onFileChange">
          </div>
        </template>

        <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-500">
          <MessageCircle class="h-12 w-12 mb-3 opacity-40" />
          <p class="text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
        </div>

        <!-- VideoCall overlay (WebRTC) — rendered via index.vue globally -->
      </div>
    </div>
  </div>
</template>
