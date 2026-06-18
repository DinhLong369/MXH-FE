<script setup lang="ts">
import { CornerDownRight, EyeOff, Eye, Send } from 'lucide-vue-next'
import type { PostComment, ReactionType } from '~/types'

const props = withDefaults(
  defineProps<{
    comment: PostComment
    postId: string
    depth?: number
  }>(),
  { depth: 0 },
)

const store = useSocialStore()

const reactionEmojis: { type: ReactionType; label: string; icon: string }[] = [
  { type: 'like', label: 'Thích', icon: '👍' },
  { type: 'love', label: 'Yêu thích', icon: '❤️' },
  { type: 'haha', label: 'Haha', icon: '😆' },
  { type: 'wow', label: 'Wow', icon: '😮' },
  { type: 'sad', label: 'Buồn', icon: '😢' },
  { type: 'angry', label: 'Phẫn nộ', icon: '😡' },
]

const showPicker = ref(false)
const showReplyBox = ref(false)
const replyText = ref('')

const myReactionIcon = computed(
  () => reactionEmojis.find((r) => r.type === props.comment.myReaction)?.icon,
)
const myReactionLabel = computed(
  () => reactionEmojis.find((r) => r.type === props.comment.myReaction)?.label || 'Thích',
)

function react(type: ReactionType) {
  store.reactComment(props.postId, props.comment.id, type)
  showPicker.value = false
}

function sendReply() {
  if (!replyText.value.trim()) return
  store.addReply(props.postId, props.comment.id, replyText.value)
  replyText.value = ''
  showReplyBox.value = false
}

function openAuthor() {
  if (props.comment.authorId) store.viewProfile(props.comment.authorId)
}

function relTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    if (mins < 1) return 'Vừa xong'
    if (mins < 60) return `${mins} phút`
    if (hours < 24) return `${hours} giờ`
    return `${Math.floor(hours / 24)} ngày`
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="flex items-start gap-2.5">
    <img
      :src="comment.authorAvatar"
      :alt="comment.authorName"
      class="h-8 w-8 rounded-full object-cover shrink-0"
      :class="comment.authorId ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400/40' : ''"
      referrerpolicy="no-referrer"
      @click="openAuthor"
    >
    <div class="flex-1 min-w-0">
      <!-- Đã ẩn -->
      <div v-if="comment.hidden" class="flex items-center gap-2 text-[11px] text-slate-500 italic py-1">
        <span>Bình luận đã được ẩn</span>
        <button class="flex items-center gap-1 not-italic font-semibold text-indigo-400 hover:text-indigo-300" @click="store.hideComment(postId, comment.id)">
          <Eye class="h-3 w-3" /> Hiện
        </button>
      </div>

      <template v-else>
        <div class="rounded-2xl bg-slate-950/70 px-3.5 py-2 border border-slate-800">
          <div class="flex items-center gap-1.5">
            <span
              class="text-xs font-bold text-slate-200"
              :class="comment.authorId ? 'cursor-pointer hover:text-indigo-400 hover:underline' : ''"
              @click="openAuthor"
            >{{ comment.authorName }}</span>
            <span class="text-[9px] text-slate-500">· {{ relTime(comment.createdAt) }}</span>
          </div>
          <p class="text-[13px] text-slate-300 mt-0.5 leading-relaxed break-words">{{ comment.content }}</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 mt-1 pl-1.5 text-[11px] font-semibold text-slate-500">
          <div class="relative">
            <button
              class="transition hover:text-indigo-400"
              :class="comment.myReaction ? 'text-indigo-400' : ''"
              @click="store.reactComment(postId, comment.id, comment.myReaction)"
              @mouseenter="showPicker = true"
            >
              <span v-if="myReactionIcon">{{ myReactionIcon }} {{ myReactionLabel }}</span>
              <span v-else>Thích</span>
            </button>
            <AnimatePresence>
              <Motion
                v-if="showPicker"
                :initial="{ opacity: 0, y: 6, scale: 0.9 }"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :exit="{ opacity: 0, y: 6, scale: 0.9 }"
                class="absolute bottom-full left-0 mb-1.5 flex gap-1 rounded-2xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl z-20"
                @mouseleave="showPicker = false"
              >
                <button v-for="r in reactionEmojis" :key="r.type" :title="r.label" class="text-xl transition hover:scale-125" @click="react(r.type)">{{ r.icon }}</button>
              </Motion>
            </AnimatePresence>
          </div>

          <span v-if="comment.likesCount > 0" class="text-slate-500">{{ comment.likesCount }} biểu cảm</span>

          <button v-if="depth === 0" class="flex items-center gap-1 hover:text-indigo-400 transition" @click="showReplyBox = !showReplyBox">
            <CornerDownRight class="h-3 w-3" /> Trả lời
          </button>

          <button class="flex items-center gap-1 hover:text-amber-400 transition" @click="store.hideComment(postId, comment.id)">
            <EyeOff class="h-3 w-3" /> Ẩn
          </button>
        </div>

        <!-- Reply input -->
        <div v-if="showReplyBox" class="mt-2 flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-1.5 border border-slate-800 focus-within:border-indigo-500/40">
          <input
            v-model="replyText"
            type="text"
            :placeholder="`Trả lời ${comment.authorName}...`"
            class="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            @keyup.enter="sendReply"
          >
          <button class="text-indigo-400 hover:text-indigo-300 disabled:opacity-40" :disabled="!replyText.trim()" @click="sendReply">
            <Send class="h-4 w-4" />
          </button>
        </div>

        <!-- Replies -->
        <div v-if="comment.replies.length" class="mt-2.5 space-y-2.5 border-l-2 border-slate-800 pl-3">
          <CommentItem
            v-for="reply in comment.replies"
            :key="reply.id"
            :comment="reply"
            :post-id="postId"
            :depth="depth + 1"
          />
        </div>
      </template>
    </div>
  </div>
</template>
