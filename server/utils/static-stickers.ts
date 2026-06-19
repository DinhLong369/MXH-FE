export type StaticSticker = {
  id: string
  title: string
  mood: 'happy' | 'love' | 'kiss' | 'sleep' | 'sad' | 'angry' | 'confused' | 'hug' | 'wow' | 'cool' | 'work' | 'wave'
  prop?: 'heart' | 'pizza' | 'blanket' | 'sparkle' | 'question' | 'flower' | 'laptop' | 'coffee'
  tags: string[]
}

export const STATIC_STICKERS: StaticSticker[] = [
  { id: 'ham-love', title: 'Ôm tim', mood: 'love', prop: 'heart', tags: ['love', 'yeu', 'tim', 'heart', 'hug'] },
  { id: 'ham-hug', title: 'Ôm bạn', mood: 'hug', prop: 'heart', tags: ['hug', 'om', 'thuong', 'yeu'] },
  { id: 'ham-kiss', title: 'Hôn gió', mood: 'kiss', prop: 'heart', tags: ['kiss', 'hon', 'yeu', 'cute'] },
  { id: 'ham-happy', title: 'Vui quá', mood: 'happy', prop: 'sparkle', tags: ['happy', 'vui', 'haha', 'cuoi'] },
  { id: 'ham-wave', title: 'Xin chào', mood: 'wave', tags: ['hello', 'hi', 'chao', 'wave'] },
  { id: 'ham-pizza', title: 'Ăn pizza', mood: 'happy', prop: 'pizza', tags: ['pizza', 'an', 'doi', 'food'] },
  { id: 'ham-sleep', title: 'Buồn ngủ', mood: 'sleep', prop: 'blanket', tags: ['sleep', 'ngu', 'met', 'zzz'] },
  { id: 'ham-sad', title: 'Buồn xíu', mood: 'sad', tags: ['sad', 'buon', 'khoc'] },
  { id: 'ham-angry', title: 'Giận rồi', mood: 'angry', tags: ['angry', 'gian', 'tuc'] },
  { id: 'ham-wow', title: 'Bất ngờ', mood: 'wow', prop: 'sparkle', tags: ['wow', 'bat ngo', 'ngac nhien'] },
  { id: 'ham-confused', title: 'Không hiểu', mood: 'confused', prop: 'question', tags: ['confused', 'hoi', 'khong hieu'] },
  { id: 'ham-cool', title: 'Ngầu nha', mood: 'cool', tags: ['cool', 'ngau', 'ok'] },
  { id: 'ham-flower', title: 'Tặng hoa', mood: 'love', prop: 'flower', tags: ['flower', 'hoa', 'tang', 'yeu'] },
  { id: 'ham-work', title: 'Đang làm', mood: 'work', prop: 'laptop', tags: ['work', 'lam viec', 'code', 'may tinh'] },
  { id: 'ham-coffee', title: 'Cà phê', mood: 'happy', prop: 'coffee', tags: ['coffee', 'ca phe', 'tinh tao'] },
  { id: 'ham-shy', title: 'Ngại quá', mood: 'love', tags: ['shy', 'ngai', 'do mat'] },
  { id: 'ham-cry', title: 'Khóc rồi', mood: 'sad', prop: 'question', tags: ['cry', 'khoc', 'buon'] },
  { id: 'ham-star', title: 'Lấp lánh', mood: 'happy', prop: 'sparkle', tags: ['sparkle', 'sao', 'xinh', 'hay'] },
]

export function getStaticSticker(id: string) {
  return STATIC_STICKERS.find((sticker) => sticker.id === id)
}

export function searchStaticStickers(search: string) {
  const q = search.toLowerCase()
  return STATIC_STICKERS
    .filter((item) => !q || item.title.toLowerCase().includes(q) || item.tags.some((tag) => tag.includes(q)))
    .map((item) => ({
      id: item.id,
      title: item.title,
      url: `/api/static-sticker/${item.id}.svg`,
    }))
}

export function renderStickerSvg(sticker: StaticSticker) {
  const face = {
    happy: '<path d="M70 93q20 22 40 0" fill="none" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/><circle cx="67" cy="78" r="5" fill="#6f5547"/><circle cx="113" cy="78" r="5" fill="#6f5547"/>',
    love: '<path d="M70 91q20 20 40 0" fill="none" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/><path d="M61 70c-5-9-18-4-15 7 2 8 15 15 15 15s13-7 15-15c3-11-10-16-15-7z" fill="#fb7185"/><path d="M119 70c5-9 18-4 15 7-2 8-15 15-15 15s-13-7-15-15c-3-11 10-16 15-7z" fill="#fb7185"/>',
    kiss: '<circle cx="68" cy="78" r="5" fill="#6f5547"/><path d="M110 77q8-8 16 0" fill="none" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/><path d="M82 98q8-7 16 0q-8 9-16 0z" fill="#ef4444"/>',
    sleep: '<path d="M62 80h18M106 80h18" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/><path d="M80 98q10 8 20 0" fill="none" stroke="#6f5547" stroke-width="4" stroke-linecap="round"/>',
    sad: '<circle cx="67" cy="80" r="5" fill="#6f5547"/><circle cx="113" cy="80" r="5" fill="#6f5547"/><path d="M76 103q14-13 28 0" fill="none" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/><path d="M122 85c8 12 1 18-4 18s-8-6 4-18z" fill="#93c5fd"/>',
    angry: '<path d="M55 72l24 8M125 72l-24 8" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/><circle cx="68" cy="84" r="5" fill="#6f5547"/><circle cx="112" cy="84" r="5" fill="#6f5547"/><path d="M78 103h24" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/>',
    confused: '<circle cx="67" cy="80" r="5" fill="#6f5547"/><circle cx="113" cy="80" r="5" fill="#6f5547"/><path d="M80 101q12-6 28 2" fill="none" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/>',
    hug: '<path d="M67 80q0 0 1 0M113 80q0 0 1 0" stroke="#6f5547" stroke-width="9" stroke-linecap="round"/><path d="M74 98q16 18 32 0" fill="none" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/>',
    wow: '<circle cx="67" cy="78" r="6" fill="#6f5547"/><circle cx="113" cy="78" r="6" fill="#6f5547"/><ellipse cx="90" cy="102" rx="10" ry="13" fill="#6f5547"/>',
    cool: '<path d="M50 72h35l-8 18H58zM95 72h35l-8 18h-19z" fill="#1f2937"/><path d="M84 78h12" stroke="#1f2937" stroke-width="5"/><path d="M76 103q14 13 28 0" fill="none" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/>',
    work: '<circle cx="67" cy="78" r="5" fill="#6f5547"/><circle cx="113" cy="78" r="5" fill="#6f5547"/><path d="M80 100h20" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/>',
    wave: '<circle cx="67" cy="80" r="5" fill="#6f5547"/><circle cx="113" cy="80" r="5" fill="#6f5547"/><path d="M74 98q16 15 32 0" fill="none" stroke="#6f5547" stroke-width="5" stroke-linecap="round"/>',
  }[sticker.mood]

  const prop = {
    heart: '<path d="M132 51c-8-14-29-7-25 11 4 15 25 27 25 27s21-12 25-27c4-18-17-25-25-11z" fill="#fb7185" stroke="#9f6b63" stroke-width="4"/>',
    pizza: '<path d="M42 121l50-20-13 45z" fill="#facc15" stroke="#9f6b63" stroke-width="4" stroke-linejoin="round"/><circle cx="66" cy="122" r="4" fill="#ef4444"/><circle cx="77" cy="113" r="4" fill="#ef4444"/><circle cx="71" cy="135" r="4" fill="#ef4444"/>',
    blanket: '<path d="M35 111h110v38H45q-10 0-10-10z" fill="#fef3c7" stroke="#9f6b63" stroke-width="4"/><path d="M55 111v38M81 111v38M107 111v38" stroke="#fde68a" stroke-width="5"/>',
    sparkle: '<path d="M38 45l6 13 13 6-13 6-6 13-6-13-13-6 13-6zM137 32l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#facc15"/>',
    question: '<text x="137" y="57" fill="#60a5fa" font-size="34" font-weight="800" font-family="Arial">?</text><text x="44" y="57" fill="#22c55e" font-size="24" font-weight="800" font-family="Arial">?</text>',
    flower: '<circle cx="132" cy="96" r="8" fill="#facc15"/><circle cx="132" cy="82" r="10" fill="#f9a8d4"/><circle cx="146" cy="96" r="10" fill="#f9a8d4"/><circle cx="132" cy="110" r="10" fill="#f9a8d4"/><circle cx="118" cy="96" r="10" fill="#f9a8d4"/><path d="M116 116q-22 14-29 30" stroke="#22c55e" stroke-width="5" fill="none" stroke-linecap="round"/>',
    laptop: '<rect x="54" y="113" width="72" height="38" rx="6" fill="#94a3b8" stroke="#64748b" stroke-width="4"/><path d="M44 151h92" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>',
    coffee: '<path d="M117 113h22q10 0 10 10t-10 10h-22" fill="none" stroke="#9f6b63" stroke-width="5"/><rect x="58" y="105" width="64" height="42" rx="12" fill="#f5f5dc" stroke="#9f6b63" stroke-width="4"/><path d="M74 96q-8-10 2-20M92 96q-8-10 2-20" stroke="#c4a484" stroke-width="4" fill="none" stroke-linecap="round"/>',
  }[sticker.prop || 'sparkle'] || ''

  const armWave = sticker.mood === 'wave'
    ? '<path d="M127 96q26-33 35-4" fill="none" stroke="#fff7ed" stroke-width="17" stroke-linecap="round"/><path d="M127 96q26-33 35-4" fill="none" stroke="#9f6b63" stroke-width="4" stroke-linecap="round"/>'
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="none"/><ellipse cx="90" cy="160" rx="46" ry="8" fill="rgba(111,85,71,.16)"/>${prop}<circle cx="55" cy="56" r="19" fill="#fff7ed" stroke="#9f6b63" stroke-width="5"/><circle cx="125" cy="56" r="19" fill="#fff7ed" stroke="#9f6b63" stroke-width="5"/><ellipse cx="90" cy="96" rx="57" ry="61" fill="#fff7ed" stroke="#9f6b63" stroke-width="5"/><ellipse cx="90" cy="116" rx="34" ry="27" fill="#fff1e6"/><circle cx="60" cy="96" r="8" fill="#fecdd3" opacity=".7"/><circle cx="120" cy="96" r="8" fill="#fecdd3" opacity=".7"/>${face}<path d="M56 120q-20 5-23 22M124 120q20 5 23 22" fill="none" stroke="#9f6b63" stroke-width="5" stroke-linecap="round"/>${armWave}</svg>`
}
