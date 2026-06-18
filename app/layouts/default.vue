<template>
  <div class="layout">
    <header class="layout__header">
      <strong>Nuxt Base</strong>
    </header>
    <main class="layout__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, sans-serif;
}
.layout__header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eee;
}
.layout__main {
  flex: 1;
  padding: 1.5rem;
}
</style>
