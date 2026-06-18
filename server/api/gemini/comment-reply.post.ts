// POST /api/gemini/comment-reply
// Body: { postContent, authorName, botPersona: { name, bio, commentStyle } }
export default defineEventHandler(async (event) => {
  const { postContent, authorName, botPersona } = await readBody<{
    postContent?: string
    authorName?: string
    botPersona?: { name?: string; bio?: string; commentStyle?: string }
  }>(event)

  if (!postContent?.trim() || !botPersona?.name) {
    return { error: 'Thiếu dữ liệu để tạo bình luận.' }
  }

  const fullPrompt = [
    `Bạn đang đóng vai "${botPersona.name}" trên mạng xã hội LongHieu Chanel.`,
    `Tiểu sử: ${botPersona.bio || 'một người dùng thân thiện'}.`,
    `Phong cách bình luận: ${botPersona.commentStyle || 'vui tươi, gần gũi'}.`,
    `${authorName || 'Một người bạn'} vừa đăng bài: "${postContent}".`,
    `Hãy viết MỘT bình luận tiếng Việt ngắn (1-2 câu), tự nhiên, đúng phong cách nhân vật, có thể thêm emoji. Chỉ trả về nội dung bình luận.`,
  ].join('\n')

  try {
    const text = await generateText(fullPrompt)
    return { text }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định'
    return { error: message }
  }
})
