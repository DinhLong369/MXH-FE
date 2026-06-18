# Nuxt 4 Base

Base dự án Nuxt 4 với cấu trúc clean, sẵn `useApi`, Docker và env.

## Cấu trúc

```
.
├── app/                    # Source chính (Nuxt 4 srcDir)
│   ├── app.vue
│   ├── assets/
│   ├── components/
│   ├── composables/
│   │   └── useApi.ts       # Trung tâm gọi API + hàm cho từng endpoint
│   ├── layouts/
│   │   └── default.vue
│   └── pages/
│       └── index.vue
├── public/                 # File tĩnh
├── server/                 # API/route phía server (Nitro)
├── nuxt.config.ts
├── Dockerfile
├── docker-compose.yml
├── .env / .env.example
└── README.md
```

## Bắt đầu

```bash
npm install        # cài dependencies
npm run dev        # chạy dev tại http://localhost:3000
```

## Lệnh

| Lệnh                | Mô tả                       |
| ------------------- | --------------------------- |
| `npm run dev`       | Chạy môi trường dev         |
| `npm run build`     | Build production            |
| `npm run preview`   | Preview bản build           |
| `npm run lint`      | Kiểm tra lint               |
| `npm run typecheck` | Kiểm tra type               |

## Gọi API — `useApi`

Toàn bộ API gom trong [app/composables/useApi.ts](app/composables/useApi.ts).

```ts
const api = useApi()

// SSR-friendly
const { data: users } = await useAsyncData('users', () => api.users.list())

// Action
await api.auth.login({ email, password })
const me = await api.auth.me()
```

Thêm endpoint mới: tạo nhóm hàm mới (vd `posts`) trong `useApi.ts` rồi return ra.

## Env

Copy `.env.example` thành `.env`. Biến `NUXT_PUBLIC_*` expose ra client, còn lại chỉ ở server.

## Docker

```bash
docker compose up -d --build   # build & chạy
# hoặc
docker build -t nuxt-base .
docker run -p 3000:3000 --env-file .env nuxt-base
```
