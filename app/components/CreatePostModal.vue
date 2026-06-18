<script setup lang="ts">
import { X, Sparkles, Image as ImageIcon, RefreshCw, Hash, AlertCircle } from 'lucide-vue-next'

const store = useSocialStore()
const { aiPreFillContent } = storeToRefs(store)

const PRESET_MOCK_IMAGES = [
  { id: 'img-none', name: 'Không ảnh', url: '' },
  { id: 'img-tech', name: 'Công nghệ', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80' },
  { id: 'img-travel', name: 'Du lịch', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80' },
  { id: 'img-food', name: 'Ẩm thực', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80' },
  { id: 'img-art', name: 'Thiết kế & Nghệ thuật', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80' },
]

const content = ref('')
const selectedPresetImage = ref('')
const customImageUrl = ref('')
const showImageInput = ref(false)
const hashTagsInput = ref('')
const isAiProcessing = ref(false)
const aiTone = ref('truyền cảm hứng')
const errorMessage = ref('')

// Đổ nội dung AI prefill (nếu có) vào textarea khi mở modal
watch(
  aiPreFillContent,
  (val) => {
    if (val) {
      content.value = val
      store.setAiPreFillContent('')
    }
  },
  { immediate: true },
)

function close() {
  store.closeCreateModal()
}

async function handleAiPolish() {
  if (!content.value.trim()) {
    errorMessage.value = 'Vui lòng nhập trước vài từ hoặc chủ đề cần AI xử lý nhé!'
    return
  }
  isAiProcessing.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch<{ text?: string; error?: string }>('/api/gemini/generate-post', {
      method: 'POST',
      body: { prompt: content.value, tone: aiTone.value, category: 'Chung' },
    })
    if (data.error) throw new Error(data.error)
    if (data.text) content.value = data.text
  } catch {
    errorMessage.value = 'Không thể kết nối trợ lý AI. Vui lòng kiểm tra API Key.'
  } finally {
    isAiProcessing.value = false
  }
}

function handleSubmit() {
  if (!content.value.trim()) return
  const tags: string[] = []
  const bodyTags = content.value.match(/#\w+/g)
  bodyTags?.forEach((t) => {
    const cleaned = t.replace('#', '').toLowerCase().trim()
    if (cleaned && !tags.includes(cleaned)) tags.push(cleaned)
  })
  if (hashTagsInput.value.trim()) {
    hashTagsInput.value.split(',').forEach((t) => {
      const cleaned = t.replace('#', '').replace(/\s+/g, '').toLowerCase().trim()
      if (cleaned && !tags.includes(cleaned)) tags.push(cleaned)
    })
  }
  const finalImage = customImageUrl.value || selectedPresetImage.value
  store.addPost(content.value, finalImage || undefined, tags)
  close()
}

function pickPreset(url: string) {
  selectedPresetImage.value = url
  customImageUrl.value = ''
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
    <Motion
      :initial="{ opacity: 0, scale: 0.95, y: 15 }"
      :animate="{ opacity: 1, scale: 1, y: 0 }"
      :exit="{ opacity: 0, scale: 0.95, y: 15 }"
      :transition="{ type: 'spring', damping: 25, stiffness: 350 }"
      class="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-800/50">
        <div class="flex items-center gap-2">
          <h2 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Tạo bài đăng mới</h2>
          <span class="rounded bg-indigo-950/60 px-2 py-0.5 text-[8px] font-bold text-indigo-400 border border-indigo-500/20">Bảng tin</span>
        </div>
        <button class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white transition" @click="close">
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Body -->
      <form class="p-5" @submit.prevent="handleSubmit">
        <!-- AI tone bar -->
        <div class="mb-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-950/15 border border-amber-900/40 p-3">
          <div class="flex items-center gap-2">
            <Sparkles class="h-4 w-4 text-amber-400" />
            <div>
              <span class="block text-xs font-bold text-slate-200">Tối ưu hóa bản thảo bằng AI</span>
              <span class="block text-[10px] text-slate-400">Giúp bài viết cuốn hút và dễ lan tỏa hơn</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <select v-model="aiTone" class="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400">
              <option value="truyền cảm hứng">Truyền cảm hứng</option>
              <option value="vui vẻ, hóm hỉnh">Hài hước hóm hỉnh</option>
              <option value="chuyên nghiệp">Chuyên nghiệp</option>
              <option value="sâu sắc, lắng đọng">Triết lý sâu lắng</option>
            </select>
            <button
              type="button"
              :disabled="isAiProcessing"
              class="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-[11px] font-bold text-slate-950 px-3 py-1.5 transition disabled:opacity-50 shadow-lg shadow-amber-950/20"
              @click="handleAiPolish"
            >
              <RefreshCw v-if="isAiProcessing" class="h-3.5 w-3.5 animate-spin" />
              <Sparkles v-else class="h-3.5 w-3.5" />
              <span>AI Hỗ Trợ</span>
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="mb-3 flex items-start gap-2 rounded-lg bg-rose-950/20 p-2.5 text-xs text-rose-400 border border-rose-900/30">
          <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <textarea
          v-model="content"
          placeholder="Tìm kiếm cảm hứng? Viết vài chủ đề hay ho vào đây rồi bấm nút 'AI Hỗ Trợ' phía trên nhé..."
          rows="5"
          class="w-full resize-none border-0 p-0 text-sm text-slate-100 bg-transparent placeholder-slate-500 focus:outline-none focus:ring-0 leading-relaxed"
        />

        <!-- Image picker -->
        <div class="mt-4 border-t border-slate-800 pt-3.5">
          <button type="button" class="flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-400 transition" @click="showImageInput = !showImageInput">
            <ImageIcon class="h-4 w-4" />
            <span>Thêm ảnh minh họa bài viết</span>
          </button>

          <div v-if="showImageInput" class="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
            <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Ảnh mẫu theo chủ đề</label>
            <div class="flex flex-wrap gap-2 mb-3">
              <button
                v-for="img in PRESET_MOCK_IMAGES"
                :key="img.id"
                type="button"
                class="rounded-lg px-2.5 py-1.5 text-xs font-semibold border-2 transition"
                :class="(selectedPresetImage === img.url && selectedPresetImage !== '') || (img.id === 'img-none' && selectedPresetImage === '' && !customImageUrl)
                  ? 'border-indigo-500 bg-indigo-950/30 text-indigo-400'
                  : 'border-slate-800 bg-slate-800/55 text-slate-300 hover:bg-slate-800 hover:text-white'"
                @click="pickPreset(img.url)"
              >
                {{ img.name }}
              </button>
            </div>

            <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1.5">Hoặc dán URL ảnh tùy chỉnh</label>
            <input
              v-model="customImageUrl"
              type="text"
              placeholder="https://images.unsplash.com/your-own-photo-link"
              class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              @input="selectedPresetImage = ''"
            >

            <div v-if="selectedPresetImage || customImageUrl" class="mt-3 relative h-24 w-max min-w-[120px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img :src="customImageUrl || selectedPresetImage" alt="Xem trước" class="h-full w-auto object-cover">
              <button type="button" class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-white" @click="selectedPresetImage = ''; customImageUrl = ''">
                <X class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div class="mt-3 flex items-center gap-2 border-t border-slate-800 pt-3.5">
          <Hash class="h-4 w-4 text-slate-500" />
          <input
            v-model="hashTagsInput"
            type="text"
            placeholder="Tag phụ thêm (cách nhau bằng dấu phẩy, vd: congnghe, hanoi)"
            class="flex-1 border-0 p-0 text-xs text-slate-200 placeholder-slate-500 bg-transparent focus:ring-0 focus:outline-none"
          >
        </div>

        <!-- Actions -->
        <div class="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button type="button" class="rounded-xl border border-slate-800 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold px-4 py-2.5 transition" @click="close">
            Hủy bỏ
          </button>
          <button type="submit" :disabled="!content.trim() || isAiProcessing" class="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-bold text-white px-5 py-2.5 shadow-lg shadow-indigo-900/40 transition">
            Chia sẻ lên bảng tin
          </button>
        </div>
      </form>
    </Motion>
  </div>
</template>
