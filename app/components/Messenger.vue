<script setup lang="ts">
import { Send, MessageCircle, ArrowLeft } from 'lucide-vue-next'

const store = useSocialStore()
const { chats, currentUser } = storeToRefs(store)

const activeChatId = ref<string | null>(chats.value[0]?.id ?? null)
const draft = ref('')
const isBotTyping = ref(false)
const scrollEl = ref<HTMLElement | null>(null)

const activeChat = computed(() => chats.value.find((c) => c.id === activeChatId.value) || null)

function selectChat(id: string) {
  activeChatId.value = id
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

  // Bot trả lời theo ngữ cảnh
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
      : 'Cảm ơn bạn đã nhắn tin! Mình sẽ phản hồi chi tiết sớm nhé 😊 (cấu hình NUXT_GEMINI_API_KEY để bot trả lời thông minh hơn)'
    store.receiveBotReply(chat.id, reply)
  } catch {
    store.receiveBotReply(chat.id, 'Mình đã nhận được tin nhắn của bạn rồi nha! 💬')
  } finally {
    isBotTyping.value = false
    await scrollToBottom()
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

watch(activeChatId, scrollToBottom)
onMounted(scrollToBottom)
</script>

<template>
  <div class="flex-1 max-w-5xl w-full px-2 py-4 md:px-0 md:py-6">
    <div class="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)] overflow-hidden rounded-3xl border border-slate-800 bg-slate-800/40">
      <!-- Chat list -->
      <div
        class="w-full md:w-72 shrink-0 border-r border-slate-800 flex-col"
        :class="activeChat && 'hidden md:flex' || 'flex'"
      >
        <div class="px-4 py-4 border-b border-slate-800">
          <h2 class="text-sm font-bold text-slate-100">Tin nhắn</h2>
        </div>
        <div class="flex-1 overflow-y-auto thin-scrollbar">
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
                <p class="text-xs font-bold text-slate-100 truncate">{{ chat.targetUser.name }}</p>
                <span class="text-[9px] text-slate-500 shrink-0">{{ chat.lastMessageTime }}</span>
              </div>
              <p class="text-[11px] text-slate-400 truncate">{{ chat.lastMessage }}</p>
            </div>
            <span v-if="chat.unreadCount > 0" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
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
            <img :src="activeChat.targetUser.avatar" :alt="activeChat.targetUser.name" class="h-9 w-9 rounded-full object-cover" referrerpolicy="no-referrer">
            <div>
              <p class="text-xs font-bold text-slate-100">{{ activeChat.targetUser.name }}</p>
              <p class="text-[10px] text-emerald-400">Đang hoạt động</p>
            </div>
          </div>

          <div ref="scrollEl" class="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-3">
            <div v-for="msg in activeChat.messages" :key="msg.id" class="flex" :class="msg.sender === 'me' ? 'justify-end' : 'justify-start'">
              <div
                class="max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed"
                :class="msg.sender === 'me' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'"
              >
                <p>{{ msg.text }}</p>
                <p class="mt-1 text-[9px] opacity-60 text-right">{{ timeLabel(msg.createdAt) }}</p>
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
