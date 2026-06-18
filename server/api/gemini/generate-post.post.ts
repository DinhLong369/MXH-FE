// POST /api/gemini/generate-post
// Body: { prompt: string, tone?: string, category?: string }
export default defineEventHandler(async (event) => {
  const { prompt, tone = 'truyền cảm hứng', category = 'Chung' } = await readBody<{
    prompt?: string
    tone?: string
    category?: string
  }>(event)

  if (!prompt?.trim()) {
    return { error: 'Thiếu nội dung prompt.' }
  }

  const fullPrompt = [
    `Bạn là trợ lý sáng tạo nội dung mạng xã hội VietSocial.`,
    `Hãy viết một bài đăng tiếng Việt hấp dẫn, dễ lan tỏa dựa trên ý tưởng sau: "${prompt}".`,
    `Giọng văn: ${tone}. Chủ đề: ${category}.`,
    `Yêu cầu: 2-4 câu, có thể thêm emoji phù hợp và 2-3 hashtag ở cuối. Chỉ trả về nội dung bài đăng, không giải thích.`,
  ].join('\n')

  try {
    const text = await generateText(fullPrompt)
    return { text }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định'
    return { error: message }
  }
})
