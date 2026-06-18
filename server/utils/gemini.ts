// Tiện ích gọi Google Gemini REST API từ phía server (Nitro)
const GEMINI_MODEL = 'gemini-2.0-flash'

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
  }>
  error?: { message?: string }
}

/**
 * Sinh văn bản từ Gemini. Trả về chuỗi text.
 * Ném lỗi nếu thiếu API key hoặc API trả lỗi — route bắt và trả { error }.
 */
export async function generateText(prompt: string): Promise<string> {
  const { geminiApiKey } = useRuntimeConfig()
  if (!geminiApiKey) {
    throw createError({ statusCode: 400, statusMessage: 'NO_API_KEY' })
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`

  const res = await $fetch<GeminiResponse>(url, {
    method: 'POST',
    body: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 512 },
    },
  })

  if (res.error) throw createError({ statusCode: 502, statusMessage: res.error.message })

  const text = res.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw createError({ statusCode: 502, statusMessage: 'EMPTY_RESPONSE' })
  return text
}
