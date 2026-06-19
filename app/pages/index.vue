<script setup lang="ts">
const store = useSocialStore()
const { currentTab, isGlobalLoading, isCreateModalOpen, toast } = storeToRefs(store)

// App dựa hoàn toàn vào localStorage → hydrate phía client
onMounted(async () => {
  store.hydrate()
  await store.syncChatsFromApi()
  store.connectWebSocket()
})

onUnmounted(() => {
  store.disconnectWebSocket()
})

const showRightBar = computed(() =>
  ['home', 'explore', 'profile'].includes(currentTab.value),
)
</script>

<template>
  <div class="app-shell min-h-screen text-slate-200 antialiased flex flex-col relative overflow-hidden">
    <!-- Ambient animated blobs -->
    <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
      <div class="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 blur-[130px] animate-blob-1" />
      <div class="absolute top-[40%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-violet-600 to-sky-500 blur-[150px] animate-blob-2" />
      <div class="absolute bottom-[10%] left-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-fuchsia-600 to-slate-800 blur-[120px] animate-blob-3" />
      <div class="app-bg-pattern absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
    </div>

    <!-- Global loading bar -->
    <div v-if="isGlobalLoading" class="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-indigo-500 via-orange-500 to-violet-500 animate-pulse" />

    <ClientOnly>
      <div class="h-[100dvh] w-full max-w-7xl mx-auto flex flex-col relative z-10 overflow-hidden">
        <!-- Top search bar -->
        <header class="relative z-50 shrink-0 flex items-center gap-3 px-3 py-2 md:px-4 md:py-2.5 border-b border-slate-800/40">
          <!-- Logo mobile -->
          <div class="flex md:hidden items-center gap-2 shrink-0">
            <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <span class="text-white font-extrabold text-sm">L</span>
            </div>
          </div>
          <!-- Search bar: full-width on mobile, centered on desktop -->
          <div class="flex-1 flex justify-center">
            <SearchBar />
          </div>
        </header>

        <div class="app-main-layout flex-1 flex flex-row items-stretch overflow-hidden">
          <Sidebar />

          <main class="flex-1 flex justify-center pb-24 md:pb-6 h-full overflow-y-auto thin-scrollbar">
            <AnimatePresence mode="wait">
              <Motion
                :key="currentTab"
                :initial="{ opacity: 0, y: 10 }"
                :animate="{ opacity: 1, y: 0 }"
                :exit="{ opacity: 0, y: -10 }"
                :transition="{ duration: 0.2 }"
                class="w-full flex justify-center"
              >
                <Feed v-if="currentTab === 'home'" />
                <Explore v-else-if="currentTab === 'explore'" />
                <Messenger v-else-if="currentTab === 'messenger'" />
                <Notifications v-else-if="currentTab === 'notifications'" />
                <Profile v-else-if="currentTab === 'profile'" />
              </Motion>
            </AnimatePresence>
          </main>

          <RightBar v-if="showRightBar" />
        </div>
      </div>

      <!-- Create post modal -->
      <AnimatePresence>
        <CreatePostModal v-if="isCreateModalOpen" />
      </AnimatePresence>

      <ThemeSwitcher />

      <!-- Video call overlay (WebRTC) -->
      <VideoCall v-if="store.activeCall" />

      <!-- Incoming call banner -->
      <AnimatePresence>
        <Motion
          v-if="store.incomingCall"
          :initial="{ opacity: 0, y: -60 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, y: -60 }"
          class="fixed top-4 left-1/2 z-[300] -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur"
        >
          <img
            :src="store.incomingCall.callerAvatar"
            :alt="store.incomingCall.callerName"
            class="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-indigo-500/40"
          />
          <div class="flex-1 min-w-0">
            <p class="truncate text-sm font-bold text-slate-100">{{ store.incomingCall.callerName }}</p>
            <p class="text-xs text-slate-400 animate-pulse">Cuộc gọi video đến...</p>
          </div>
          <button
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-400 transition"
            title="Nghe máy"
            @click="store.acceptCall()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.5 19.79 19.79 0 0 1 1.71 1.87a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 6.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
          <button
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-500 transition"
            title="Từ chối"
            @click="store.rejectCall()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 rotate-135"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.5 19.79 19.79 0 0 1 1.71 1.87a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 6.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
        </Motion>
      </AnimatePresence>

      <!-- Toast -->
      <AnimatePresence>
        <Motion
          v-if="toast"
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, y: 20 }"
          class="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur px-4 py-2.5 text-xs font-semibold text-slate-100 shadow-2xl"
        >
          {{ toast }}
        </Motion>
      </AnimatePresence>

      <!-- SSR/loading fallback -->
      <template #fallback>
        <div class="flex min-h-screen items-center justify-center relative z-10">
          <div class="flex flex-col items-center gap-3 text-slate-400">
            <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
            <p class="text-sm font-semibold">Đang tải LongHieu Chanel...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
