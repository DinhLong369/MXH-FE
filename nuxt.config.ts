// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    'motion-v/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  // Public/private runtime config driven by .env
  runtimeConfig: {
    // Server-only (never exposed to client)
    geminiApiKey: process.env.NUXT_GEMINI_API_KEY || '',
    apiSecret: process.env.NUXT_API_SECRET || '',
    public: {
      // Exposed to the client
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api',
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'LongHieu Chanel',
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'LongHieu Chanel — Mạng xã hội thông minh',
    },
  },
})
