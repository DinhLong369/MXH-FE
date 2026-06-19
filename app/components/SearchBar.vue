<script setup lang="ts">
import { Search, X, Users, UserRound, FileText } from 'lucide-vue-next'
import type { ApiUserResult } from '~/types/api'

const store = useSocialStore()

const query = ref('')
const open = ref(false)
const remoteUsers = ref<ApiUserResult[]>([])
const isSearchingUsers = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const results = computed(() => store.searchAll(query.value))
const peopleResults = computed(() => {
  const localPeople = results.value.people
  const localKeys = new Set(localPeople.flatMap((u) => [u.id, u.username.toLowerCase()]))
  const remotePeople = remoteUsers.value.filter((u) => {
    const username = (u.username || '').toLowerCase()
    return !localKeys.has(u.id) && !localKeys.has(username)
  })
  return { localPeople, remotePeople }
})
const hasResults = computed(
  () =>
    peopleResults.value.localPeople.length > 0 ||
    peopleResults.value.remotePeople.length > 0 ||
    results.value.groups.length > 0 ||
    results.value.posts.length > 0,
)
const showDropdown = computed(() => open.value && query.value.trim().length > 0)

watch(query, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  const q = value.trim()
  remoteUsers.value = []
  if (!q) return
  searchTimer = setTimeout(async () => {
    isSearchingUsers.value = true
    try {
      remoteUsers.value = await store.searchUsersFromApi(q)
    } finally {
      isSearchingUsers.value = false
    }
  }, 280)
})

function close() {
  open.value = false
}
function reset() {
  query.value = ''
  open.value = false
  remoteUsers.value = []
}

function goPerson(id: string) {
  store.viewProfile(id)
  reset()
}
function goRemotePerson(user: ApiUserResult) {
  store.viewRemoteProfile(user)
  reset()
}
function goGroup(id: string) {
  store.openGroup(id)
  reset()
}
function goPost(id: string) {
  store.jumpToPost(id)
  reset()
}

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="relative w-full max-w-xl">
    <!-- Input -->
    <div class="app-search-box relative z-40 flex items-center gap-2 rounded-full border px-4 py-2.5 transition">
      <Search class="app-search-icon h-4.5 w-4.5 shrink-0" />
      <input
        v-model="query"
        type="text"
        placeholder="Tìm bạn bè, nhóm, bài viết..."
        class="app-search-input flex-1 bg-transparent text-sm font-bold focus:outline-none"
        @focus="open = true"
      >
      <button v-if="query" class="app-search-clear shrink-0" @click="reset">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Backdrop để đóng khi bấm ra ngoài -->
    <div v-if="showDropdown" class="fixed inset-0 z-30" @click="close" />

    <!-- Dropdown kết quả -->
    <AnimatePresence>
      <Motion
        v-if="showDropdown"
        :initial="{ opacity: 0, y: 8 }"
        :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0, y: 8 }"
        class="app-search-dropdown absolute left-0 right-0 mt-2 z-40 max-h-[70vh] overflow-y-auto thin-scrollbar rounded-2xl border p-2"
      >
        <p v-if="isSearchingUsers && !hasResults" class="px-3 py-6 text-center text-xs text-slate-500">
          Đang tìm username...
        </p>
        <p v-else-if="!hasResults" class="px-3 py-6 text-center text-xs text-slate-500">
          Không tìm thấy kết quả cho "<b class="text-slate-300">{{ query }}</b>"
        </p>

        <!-- Người dùng -->
        <div v-if="peopleResults.localPeople.length || peopleResults.remotePeople.length" class="mb-1">
          <p class="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <UserRound class="h-3 w-3" /> Người dùng
          </p>
          <button
            v-for="u in peopleResults.localPeople.slice(0, 5)"
            :key="u.id"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-800 transition"
            @click="goPerson(u.id)"
          >
            <img :src="u.avatar" :alt="u.name" class="h-9 w-9 rounded-full object-cover" referrerpolicy="no-referrer">
            <div class="overflow-hidden">
              <p class="text-base font-extrabold text-slate-100 truncate">{{ u.name }}</p>
              <p class="text-[11px] text-slate-500 truncate">@{{ u.username }}</p>
            </div>
          </button>
          <button
            v-for="u in peopleResults.remotePeople.slice(0, Math.max(0, 5 - peopleResults.localPeople.length))"
            :key="u.id"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-800 transition"
            @click="goRemotePerson(u)"
          >
            <img
              :src="u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'"
              :alt="u.name || u.username"
              class="h-9 w-9 rounded-full object-cover"
              referrerpolicy="no-referrer"
            >
            <div class="overflow-hidden">
              <p class="text-base font-extrabold text-slate-100 truncate">{{ u.name || u.username }}</p>
              <p class="text-[11px] text-slate-500 truncate">@{{ u.username }}</p>
            </div>
            <span class="ml-auto shrink-0 rounded-full bg-indigo-950/70 px-2 py-1 text-[9px] font-extrabold text-indigo-300">API</span>
          </button>
        </div>

        <!-- Nhóm -->
        <div v-if="results.groups.length" class="mb-1">
          <p class="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <Users class="h-3 w-3" /> Nhóm
          </p>
          <button
            v-for="g in results.groups.slice(0, 5)"
            :key="g.id"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-800 transition"
            @click="goGroup(g.id)"
          >
            <img :src="g.avatar" :alt="g.name" class="h-9 w-9 rounded-lg object-cover" referrerpolicy="no-referrer">
            <div class="flex-1 overflow-hidden">
              <p class="text-base font-extrabold text-slate-100 truncate">{{ g.name }}</p>
              <p class="text-[11px] text-slate-500 truncate">{{ g.membersCount.toLocaleString() }} thành viên</p>
            </div>
            <span v-if="g.joined" class="text-[10px] font-bold text-emerald-400 shrink-0">Đã tham gia</span>
          </button>
        </div>

        <!-- Bài viết -->
        <div v-if="results.posts.length">
          <p class="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <FileText class="h-3 w-3" /> Bài viết
          </p>
          <button
            v-for="p in results.posts.slice(0, 5)"
            :key="p.id"
            class="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-800 transition"
            @click="goPost(p.id)"
          >
            <img :src="p.authorAvatar" :alt="p.authorName" class="h-9 w-9 rounded-full object-cover shrink-0" referrerpolicy="no-referrer">
            <div class="overflow-hidden">
              <p class="text-sm font-extrabold text-slate-100">{{ p.authorName }}</p>
              <p class="text-xs text-slate-200 line-clamp-2 leading-snug">{{ p.content }}</p>
            </div>
          </button>
        </div>
      </Motion>
    </AnimatePresence>
  </div>
</template>
