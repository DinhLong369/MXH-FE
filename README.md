# VietSocial — Mạng xã hội thông minh (Nuxt 4)

Mạng xã hội tích hợp trợ lý AI (Gemini): viết bài bằng AI, bot tự động bình luận & nhắn tin theo ngữ cảnh. Chuyển thể từ bản React sang **Nuxt 4 + Pinia**.

## Stack

- **Nuxt 4** (srcDir `app/`) + Vue 3 + TypeScript
- **Pinia** — quản lý toàn bộ state, persist qua `localStorage`
- **Tailwind CSS** — giao diện dark (slate + indigo)
- **motion-v** — animation (thay `motion/react`)
- **lucide-vue-next** — icon (thay `lucide-react`)
- **Nitro server routes** — `/api/gemini/*` gọi Google Gemini

## Cấu trúc

```
app/
├── app.vue
├── assets/css/main.css
├── components/        # Sidebar, RightBar, Feed, Explore, Messenger, Profile, Notifications, CreatePostModal
├── data/index.ts      # Seed: ME_USER, AI_BOTS, INITIAL_POSTS
├── pages/index.vue    # Canvas chính (tabs + modal)
├── stores/social.ts   # Pinia store — toàn bộ logic nghiệp vụ
└── types/index.ts     # Post, UserProfile, Chat, Message, AppNotification...
server/
├── api/gemini/generate-post.post.ts   # AI viết bài
├── api/gemini/comment-reply.post.ts   # AI bình luận / trả lời DM
└── utils/gemini.ts                     # Client gọi Gemini REST
```

## Kiến trúc chuyển đổi React → Nuxt

| React (cũ)                     | Nuxt (mới)                          |
| ------------------------------ | ----------------------------------- |
| `useState` trong `App.tsx`     | Pinia store `useSocialStore`        |
| `useEffect` hydrate localStorage | `store.hydrate()` trong `onMounted` |
| `fetch("/api/gemini/...")`     | Nitro routes `server/api/gemini/*`  |
| props drilling                 | component đọc store trực tiếp        |
| `motion/react`, `lucide-react` | `motion-v`, `lucide-vue-next`       |

## Bắt đầu

```bash
cp .env.example .env       # điền NUXT_GEMINI_API_KEY (tùy chọn)
npm install
npm run dev                # http://localhost:3000
```

> Không có `NUXT_GEMINI_API_KEY`: app vẫn chạy bình thường, các tính năng AI dùng nội dung fallback.

## Tính năng

- 📝 Đăng bài (ảnh + hashtag), AI hỗ trợ viết/tối ưu bản thảo
- 🤖 Bot AI tự động bình luận bài mới & trả lời tin nhắn theo ngữ cảnh
- ❤️ Multi-reaction, lưu bài, xóa bài, bình luận
- 🧭 Khám phá theo hashtag, 💬 Messenger, 🔔 Thông báo, 👤 Hồ sơ (sửa profile)
- 💾 Dữ liệu lưu `localStorage` (giữ nguyên hành vi bản React)

## Docker

```bash
docker compose up -d --build
# hoặc
docker build -t vietsocial . && docker run -p 3000:3000 --env-file .env vietsocial
```

## Lệnh

| Lệnh                | Mô tả               |
| ------------------- | ------------------- |
| `npm run dev`       | Môi trường dev      |
| `npm run build`     | Build production    |
| `npm run preview`   | Preview bản build   |
| `npm run lint`      | Kiểm tra lint       |
