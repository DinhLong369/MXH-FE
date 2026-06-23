<script setup lang="ts">
// Apply saved theme on page load — no UI, theme picker lives in Settings.vue
const STORAGE_KEY = 'longhieu_theme'
const VALID = ['cosmic', 'daylight', 'mint']

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  document.documentElement.dataset.theme = (saved && VALID.includes(saved)) ? saved : 'cosmic'
})
</script>

<template />
