<script setup lang="ts">
import { Send, MessageCircle, ArrowLeft, SmilePlus, Pencil, Trash2, Check, X, SquarePen, Search } from 'lucide-vue-next'
import type { ApiUserResult } from '~/types/api'

const store = useSocialStore()
const { chats, currentUser } = storeToRefs(store)

const activeChatId = ref<string | null>(chats.value[0]?.id ?? null)
const draft = ref('')
const isBotTyping = ref(false)
const scrollEl = ref<HTMLElement | null>(null)

// Sửa / biểu cảm tin nhắn
const editingId = ref<string | null>(null)
const editText = ref('')
const reactMenuId = ref<string | null>(null)
const quickEmojis = ['👍', '❤️', '😆', '😮', '😢', '🙏']

// Tìm kiếm người dùng mới
const showSearch = ref(false)
const searchQuery = ref('')
const searchResults = ref<ApiUserResult[]>([])
const searchLoading = ref(false)
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const activeChat = computed(() => chats.value.find((c) => c.id === activeChatId.value) || null)

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function selectChat(id: string) {
  activeChatId.value = id
  showSearch.value = false
  store.setActiveChatInMessenger(id)
}

function openSearch() {
  showSearch.value = true
  searchQuery.value = ''
  searchResults.value = []
}

function closeSearch() {
  showSearch.value = false
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
function del(msgId: string) {
  if (activeChat.value) store.deleteMessage(activeChat.value.id, msgId)
}
function pickReact(msgId: string, emoji: string) {
  if (activeChat.value) store.reactMessage(activeChat.value.id, msgId, emoji)
  reactMenuId.value = null
}

async function scrollToBottom() {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

async function send() {
  const chat = activeChat.value
  const text = draft.value.trim()
  if (!chat || !text) return

  store.sendMessage(chat.id, text)
  draft.value = ''
  await scrollToBottom()

  // Chỉ kích hoạt bot reply cho chat bot (không phải real API conversation)
  if (!isUuid(chat.id)) {
    isBotTyping.value = true
    try {
      const data = await $fetch<{ text?: string; error?: string }>('/api/gemini/comment-reply', {
        method: 'POST',
        body: {
          postContent: text,
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
        : 'Cảm ơn bạn đã nhắn tin! Mình sẽ phản hồi chi tiết sớm nhé 😊'
      store.receiveBotReply(chat.id, reply)
    } catch {
      store.receiveBotReply(chat.id, 'Mình đã nhận được tin nhắn của bạn rồi nha! 💬')
    } finally {
      isBotTyping.value = false
      await scrollToBottom()
    }
  }
}

function timeLabel(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

watch(activeChatId, (id) => {
  scrollToBottom()
  if (id) store.setActiveChatInMessenger(id)
})

onMounted(async () => {
  await store.syncChatsFromApi()
  store.connectWebSocket()
  const firstId = chats.value[0]?.id ?? null
  if (!activeChatId.value && firstId) {
    activeChatId.value = firstId
    store.setActiveChatInMessenger(firstId)
  }
  await scrollToBottom()
})

onUnmounted(() => {
  store.disconnectWebSocket()
  store.setActiveChatInMessenger(null)
  if (searchDebounce) clearTimeout(searchDebounce)
})
</script>

<template>
  <div class="flex-1 max-w-5xl w-full px-2 py-4 md:px-0 md:py-6">
    <div class="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)] overflow-hidden rounded-3xl border border-slate-800 bg-slate-800/40">
      <!-- Chat list -->
      <div
        class="w-full md:w-72 shrink-0 border-r border-slate-800 flex-col"
        :class="activeChat && 'hidden md:flex' || 'flex'"
      >
        <div class="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-100">Tin nhắn</h2>
          <button
            class="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition"
            title="Nhắn tin mới"
            @click="openSearch"
          >
            <SquarePen class="h-4 w-4" />
          </button>
        </div>

        <!-- Search panel -->
        <div v-if="showSearch" class="flex flex-col flex-1 overflow-hidden">
          <div class="p-3 border-b border-slate-800">
            <div class="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 focus-within:border-indigo-500/50">
              <Search class="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Tìm người dùng..."
                class="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                autofocus
                @input="onSearchInput"
                @keyup.esc="closeSearch"
              >
              <button class="text-slate-500 hover:text-slate-300" @click="closeSearch">
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto thin-scrollbar">
            <div v-if="searchLoading" class="flex items-center justify-center py-8 text-slate-500 text-xs gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:0ms" />
              <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:150ms" />
              <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:300ms" />
            </div>
            <div v-else-if="searchQuery.trim() && !searchResults.length && !searchLoading" class="py-8 text-center text-slate-500 text-xs">
              Không tìm thấy người dùng nào
            </div>
            <button
              v-for="user in searchResults"
              :key="user.id"
              class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/60 border-b border-slate-800/50 transition"
              @click="startChatWith(user)"
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
            </button>
          </div>
        </div>

        <!-- Normal chat list -->
        <div v-else class="flex-1 overflow-y-auto thin-scrollbar">
          <button
            v-for="chat in chats"
            :key="chat.id"
            class="flex w-full items-center gap-3 px-4 py-3 text-left border-b border-slate-800/50 transition"
            :class="activeChatId === chat.id ? 'bg-indigo-950/30' : 'hover:bg-slate-800/60'"
            @click="selectChat(chat.id)"
          >
            <div class="relative">
              <img :src="chat.targetUser.avatar" :alt="chat.targetUser.name" class="h-11 w-11 rounded-full object-cover" referrerpolicy="no-referrer">
              <span class="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
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
          </button>
        </div>
      </div>

      <!-- Active chat -->
      <div class="flex-1 flex-col" :class="activeChat ? 'flex' : 'hidden md:flex'">
        <template v-if="activeChat">
          <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
            <button class="md:hidden text-slate-400" @click="activeChatId = null">
              <ArrowLeft class="h-5 w-5" />
            </button>
            <img :src="activeChat.targetUser.avatar" :alt="activeChat.targetUser.name" class="h-9 w-9 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-400/40 transition" referrerpolicy="no-referrer" @click="store.viewProfile(activeChat.targetUser.id)">
            <div class="cursor-pointer" @click="store.viewProfile(activeChat.targetUser.id)">
              <p class="text-xs font-bold text-slate-100 hover:text-indigo-400 transition">{{ activeChat.targetUser.name }}</p>
              <p class="text-[10px] text-emerald-400">Đang hoạt động</p>
            </div>
          </div>

          <div ref="scrollEl" class="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-3">
            <div v-for="msg in activeChat.messages" :key="msg.id" class="group/msg flex items-end gap-1.5" :class="msg.sender === 'me' ? 'justify-end' : 'justify-start'">
              <!-- Hành động (trái) cho tin của mình -->
              <div v-if="msg.sender === 'me' && editingId !== msg.id" class="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition self-center">
                <div class="relative">
                  <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-700 hover:text-slate-200" title="Biểu cảm" @click="reactMenuId = reactMenuId === msg.id ? null : msg.id">
                    <SmilePlus class="h-3.5 w-3.5" />
                  </button>
                  <div v-if="reactMenuId === msg.id" class="absolute bottom-full right-0 mb-1 flex gap-1 rounded-2xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl z-20">
                    <button v-for="e in quickEmojis" :key="e" class="text-lg transition hover:scale-125" @click="pickReact(msg.id, e)">{{ e }}</button>
                  </div>
                </div>
                <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-700 hover:text-slate-200" title="Sửa" @click="startEdit(msg.id, msg.text)">
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-rose-950/50 hover:text-rose-400" title="Xóa" @click="del(msg.id)">
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>

              <!-- Bubble / form sửa -->
              <div class="relative max-w-[75%]">
                <!-- Form sửa -->
                <div v-if="editingId === msg.id" class="flex items-center gap-1.5 rounded-2xl bg-slate-950 border border-indigo-500/40 px-2.5 py-1.5">
                  <input v-model="editText" type="text" class="w-48 bg-transparent text-xs text-slate-100 focus:outline-none" @keyup.enter="saveEdit" @keyup.esc="cancelEdit">
                  <button class="text-emerald-400 hover:text-emerald-300" @click="saveEdit"><Check class="h-4 w-4" /></button>
                  <button class="text-slate-500 hover:text-slate-300" @click="cancelEdit"><X class="h-4 w-4" /></button>
                </div>

                <!-- Bubble thường -->
                <div
                  v-else
                  class="rounded-2xl px-3.5 py-2 text-xs leading-relaxed"
                  :class="msg.sender === 'me' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'"
                >
                  <p class="whitespace-pre-wrap break-words">{{ msg.text }}</p>
                  <p class="mt-1 text-[9px] opacity-60 text-right">
                    <span v-if="msg.edited">đã sửa · </span>{{ timeLabel(msg.createdAt) }}
                  </p>
                </div>

                <!-- Badge biểu cảm -->
                <span v-if="msg.reaction" class="absolute -bottom-2 rounded-full bg-slate-900 border border-slate-700 px-1 text-xs shadow" :class="msg.sender === 'me' ? 'right-2' : 'left-2'">
                  {{ msg.reaction }}
                </span>
              </div>

              <!-- Hành động (phải) cho tin của người khác: biểu cảm + xóa -->
              <div v-if="msg.sender === 'them'" class="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition self-center">
                <div class="relative">
                  <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-700 hover:text-slate-200" title="Biểu cảm" @click="reactMenuId = reactMenuId === msg.id ? null : msg.id">
                    <SmilePlus class="h-3.5 w-3.5" />
                  </button>
                  <div v-if="reactMenuId === msg.id" class="absolute bottom-full left-0 mb-1 flex gap-1 rounded-2xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl z-20">
                    <button v-for="e in quickEmojis" :key="e" class="text-lg transition hover:scale-125" @click="pickReact(msg.id, e)">{{ e }}</button>
                  </div>
                </div>
                <button class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-rose-950/50 hover:text-rose-400" title="Xóa" @click="del(msg.id)">
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div v-if="isBotTyping" class="flex justify-start">
              <div class="rounded-2xl bg-slate-800 px-4 py-2.5 text-xs text-slate-400">
                <span class="inline-flex gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:0ms" />
                  <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:150ms" />
                  <span class="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay:300ms" />
                </span>
              </div>
            </div>

            <!-- Đã xem: hiện ở cuối danh sách khi người kia đã đọc -->
            <div v-if="activeChat?.lastSeenAt" class="flex justify-end items-center gap-1 pt-0.5 pr-1">
              <span class="text-[9px] text-slate-500">Đã xem</span>
              <img
                :src="activeChat.targetUser.avatar"
                :alt="activeChat.targetUser.name"
                class="h-4 w-4 rounded-full object-cover ring-1 ring-slate-700"
                referrerpolicy="no-referrer"
              >
            </div>
          </div>

          <div class="border-t border-slate-800 p-3">
            <div class="flex items-center gap-2 rounded-2xl bg-slate-950 border border-slate-800 px-3.5 py-2 focus-within:border-indigo-500/40">
              <input
                v-model="draft"
                type="text"
                placeholder="Nhập tin nhắn..."
                class="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                @keyup.enter="send"
              >
              <button class="text-indigo-400 hover:text-indigo-300 disabled:opacity-40" :disabled="!draft.trim()" @click="send">
                <Send class="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </template>

        <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-500">
          <MessageCircle class="h-12 w-12 mb-3 opacity-40" />
          <p class="text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
        </div>
      </div>
    </div>
  </div>
</template>
