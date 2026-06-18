<script setup lang="ts">
const store = useSocialStore()
const { currentTab, isGlobalLoading, isCreateModalOpen } = storeToRefs(store)

// App dựa hoàn toàn vào localStorage → hydrate phía client
onMounted(() => store.hydrate())

const showRightBar = computed(() =>
  ['home', 'explore', 'profile'].includes(currentTab.value),
)
</script>

<template>
  <div class="min-h-screen bg-[#0a0f1d] text-slate-200 antialiased flex flex-col relative overflow-hidden">
    <!-- Ambient animated blobs -->
    <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
      <div class="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 blur-[130px] animate-blob-1" />
      <div class="absolute top-[40%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-violet-600 to-sky-500 blur-[150px] animate-blob-2" />
      <div class="absolute bottom-[10%] left-[20%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-fuchsia-600 to-slate-800 blur-[120px] animate-blob-3" />
      <div class="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
    </div>

    <!-- Global loading bar -->
    <div v-if="isGlobalLoading" class="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-indigo-500 via-orange-500 to-violet-500 animate-pulse" />

    <ClientOnly>
      <div class="flex-grow w-full max-w-7xl mx-auto flex flex-col md:flex-row items-stretch relative z-10">
        <Sidebar />

        <main class="flex-1 flex justify-center pb-24 md:pb-6 overflow-y-auto min-h-screen thin-scrollbar">
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

      <!-- Create post modal -->
      <AnimatePresence>
        <CreatePostModal v-if="isCreateModalOpen" />
      </AnimatePresence>

      <!-- SSR/loading fallback -->
      <template #fallback>
        <div class="flex min-h-screen items-center justify-center relative z-10">
          <div class="flex flex-col items-center gap-3 text-slate-400">
            <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
            <p class="text-sm font-semibold">Đang tải VietSocial...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
