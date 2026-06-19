import { searchStaticStickers } from '../utils/static-stickers'

type GiphyImage = {
  url?: string
  webp?: string
  mp4?: string
}

type GiphyItem = {
  id?: string
  title?: string
  images?: {
    fixed_height?: GiphyImage
    fixed_width?: GiphyImage
    downsized_medium?: GiphyImage
    original?: GiphyImage
  }
}

type GiphyResponse = {
  data?: GiphyItem[]
}

type TenorItem = {
  id?: string
  title?: string
  media?: Array<{
    gif?: { url?: string }
    tinygif?: { url?: string }
    mediumgif?: { url?: string }
  }>
}

type TenorResponse = {
  results?: TenorItem[]
}

function pickGifUrl(item: GiphyItem) {
  return (
    item.images?.fixed_height?.webp ||
    item.images?.fixed_height?.url ||
    item.images?.fixed_width?.webp ||
    item.images?.fixed_width?.url ||
    item.images?.downsized_medium?.url ||
    item.images?.original?.webp ||
    item.images?.original?.url ||
    ''
  )
}

function pickTenorUrl(item: TenorItem) {
  const media = item.media?.[0]
  return media?.tinygif?.url || media?.gif?.url || media?.mediumgif?.url || ''
}

async function fetchGiphyItems(kind: 'gifs' | 'stickers', endpoint: 'search' | 'trending', apiKey: string, search: string) {
  const response = await $fetch<GiphyResponse>(`https://api.giphy.com/v1/${kind}/${endpoint}`, {
    query: {
      api_key: apiKey,
      q: search || undefined,
      limit: 24,
      rating: 'pg-13',
      lang: 'vi',
    },
  })

  return (response.data || [])
    .map((item) => ({
      id: item.id || pickGifUrl(item),
      title: item.title || '',
      url: pickGifUrl(item),
    }))
    .filter((item) => item.url)
}

async function fetchTenorItems(kind: 'gifs' | 'stickers', search: string) {
  const q = search || (kind === 'stickers' ? 'funny sticker' : 'funny')
  const response = await $fetch<TenorResponse>('https://g.tenor.com/v1/search', {
    query: {
      key: 'LIVDSRZULELA',
      q,
      limit: 24,
      media_filter: 'minimal',
      contentfilter: 'medium',
      locale: 'vi_VN',
    },
  })

  return (response.results || [])
    .map((item) => ({
      id: item.id || pickTenorUrl(item),
      title: item.title || '',
      url: pickTenorUrl(item),
    }))
    .filter((item) => item.url)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.giphyApiKey
  const query = getQuery(event)
  const isSticker = query.kind === 'sticker'
  const kind = isSticker ? 'stickers' : 'gifs'
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const endpoint = search ? 'search' : 'trending'

  if (isSticker) {
    return { items: searchStaticStickers(search), provider: 'static' }
  }

  if (apiKey) {
    try {
      const items = await fetchGiphyItems(kind, endpoint, apiKey, search)
      if (items.length) return { items, provider: 'giphy' }
    } catch (error) {
      console.warn('Cannot load GIPHY library:', error)
    }
  }

  const items = await fetchTenorItems(kind, search)
  return { items, provider: 'tenor' }
})
