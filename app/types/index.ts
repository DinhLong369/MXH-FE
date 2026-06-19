// ============================================================
// Kiểu dữ liệu dùng chung cho toàn ứng dụng LongHieu Chanel
// ============================================================

export * from './api'

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'

export interface PostReaction {
  like: number
  love: number
  haha: number
  wow: number
  sad: number
  angry: number
}

export interface UserProfile {
  id: string
  name: string
  username: string
  avatar: string
  cover: string
  bio: string
  followersCount: number
  followingCount: number
  postsCount: number
  isFollowed?: boolean
  commentStyle?: string
  isAI?: boolean
  lastSeenAt?: string
}

export interface PostComment {
  id: string
  postId: string
  authorId?: string
  authorName: string
  authorAvatar: string
  content: string
  createdAt: string
  likesCount: number
  myReaction?: ReactionType
  hidden?: boolean
  replies: PostComment[]
}

export interface Post {
  id: string
  userId: string
  authorName: string
  authorUsername: string
  authorAvatar: string
  content: string
  imageUrl?: string
  likesCount: number
  commentsCount: number
  sharesCount: number
  reactions: PostReaction
  isLiked: boolean
  isSaved: boolean
  myReaction?: ReactionType
  tags: string[]
  comments: PostComment[]
  createdAt: string
}

export type MessageKind = 'text' | 'image' | 'video' | 'audio' | 'gif' | 'sticker' | 'location' | 'voice'

export interface Message {
  id: string
  chatId: string
  sender: 'me' | 'them'
  text: string
  createdAt: string
  reaction?: string
  edited?: boolean
  // Loại tin nhắn (mặc định 'text')
  kind?: MessageKind
  // Media URL: ảnh / video / audio / GIF / sticker (URL S3 hoặc URL ngoài)
  image?: string
  // Tin nhắn thoại (giả lập): thời lượng tính bằng giây
  voiceDuration?: number
  // Vị trí chia sẻ
  location?: { label: string; lat?: number; lng?: number }
  // Đã xem (người nhận đã đọc)
  seen?: boolean
}

export interface Chat {
  id: string
  targetUser: UserProfile
  unreadCount: number
  messages: Message[]
  lastMessage: string
  lastMessageTime: string
  lastSeenAt?: string  // Thời điểm người kia cuối cùng đã đọc conversation này
  hidden?: boolean
  isGroup?: boolean
  members?: UserProfile[]
}

export interface Group {
  id: string
  name: string
  description: string
  tag: string
  avatar: string
  membersCount: number
  joined: boolean
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  senderName: string
  senderAvatar: string
  message: string
  read: boolean
  createdAt: string
  targetPostId?: string
}
