import { getStaticSticker, renderStickerSvg } from '../../utils/static-stickers'

export default defineEventHandler((event) => {
  const rawId = getRouterParam(event, 'id') || ''
  const id = rawId.replace(/\.svg$/i, '')
  const sticker = getStaticSticker(id)

  if (!sticker) {
    throw createError({ statusCode: 404, statusMessage: 'Sticker not found' })
  }

  setHeader(event, 'content-type', 'image/svg+xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return renderStickerSvg(sticker)
})
