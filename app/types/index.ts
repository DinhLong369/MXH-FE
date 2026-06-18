// ============================================================
// Kiểu dữ liệu dùng chung cho toàn ứng dụng VietSocial
// ============================================================

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
  // Phong cách bình luận của bot (dùng cho prompt AI)
  commentStyle?: string
}

export interface PostComment {
  id: string
  postId: string
  authorName: string
  authorAvatar: string
  content: string
  createdAt: string
  likesCount: number
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

export interface Message {
  id: string
  chatId: string
  sender: 'me' | 'them'
  text: string
  createdAt: string
}

export interface Chat {
  id: string
  targetUser: UserProfile
  unreadCount: number
  messages: Message[]
  lastMessage: string
  lastMessageTime: string
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
