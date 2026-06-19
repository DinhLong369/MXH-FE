import { defineStore } from 'pinia'
import type {
  AppNotification,
  Chat,
  Group,
  Message,
  Post,
  PostComment,
  ReactionType,
  UserProfile,
} from '~/types'
import type { ApiUserResult } from '~/types/api'
import { AI_BOTS, GROUPS, INITIAL_POSTS, ME_USER } from '~/data'

// WebSocket connection (module-level, not reactive)
let wsConn: WebSocket | null = null

function isUuidFormat(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// Khóa localStorage
const LS = {
  user: 'vs_currentUser',
  bots: 'vs_bots',
  posts: 'vs_posts',
  notifs: 'vs_notifications',
  chats: 'vs_chats',
  groups: 'vs_groups',
  tab: 'vs_currentTab',
}

const VALID_TABS = ['home', 'explore', 'messenger', 'notifications', 'profile']

function readLS<T>(key: string): T | null {
  if (!import.meta.client) return null
  const raw = localStorage.getItem(key)
  return raw ? (JSON.parse(raw) as T) : null
}

function writeLS(key: string, value: unknown) {
  if (!import.meta.client) return
  localStorage.setItem(key, JSON.stringify(value))
}

type RemoteRecord = Record<string, unknown>

function asRecord(value: unknown): RemoteRecord | null {
  return typeof value === 'object' && value !== null ? (value as RemoteRecord) : null
}

function getString(source: RemoteRecord | null, keys: string[], fallback = '') {
  if (!source) return fallback
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

function getArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  const nested = record?.items || record?.conversations || record?.messages || record?.data
  return Array.isArray(nested) ? nested : []
}

// Nếu nội dung tin nhắn là 1 URL ảnh (gửi qua S3) thì nhận diện loại để render ảnh
// thay vì hiển thị link text.
function detectMediaKind(text: string): 'image' | 'gif' | null {
  const t = text.trim()
  if (!/^https?:\/\/\S+$/i.test(t)) return null
  const clean = t.split('?')[0]!.toLowerCase()
  if (clean.endsWith('.gif')) return 'gif'
  if (/\.(jpe?g|png|webp|avif|bmp|svg)$/.test(clean)) return 'image'
  return null
}

interface SocialState {
  currentTab: string
  posts: Post[]
  currentUser: UserProfile
  bots: UserProfile[]
  chats: Chat[]
  notifications: AppNotification[]
  groups: Group[]
  selectedTag: string | null
  isCreateModalOpen: boolean
  aiPreFillContent: string
  isGlobalLoading: boolean
  hydrated: boolean
  viewingUserId: string | null
  highlightPostId: string | null
  toast: string | null
  activeChatInMessenger: string | null
}

export const useSocialStore = defineStore('social', {
  state: (): SocialState => ({
    currentTab: 'home',
    posts: [],
    currentUser: { ...ME_USER },
    bots: [],
    chats: [],
    notifications: [],
    groups: [],
    selectedTag: null,
    isCreateModalOpen: false,
    aiPreFillContent: '',
    isGlobalLoading: false,
    hydrated: false,
    viewingUserId: null,
    highlightPostId: null,
    toast: null,
    activeChatInMessenger: null,
  }),

  getters: {
    unreadMessagesCount: (s) => s.chats.reduce((acc, c) => acc + c.unreadCount, 0),
    unreadNotificationsCount: (s) => s.notifications.filter((n) => !n.read).length,
    followedBots: (s) => s.bots.filter((b) => b.isFollowed),
    filteredPosts: (s) =>
      s.selectedTag ? s.posts.filter((p) => p.tags.includes(s.selectedTag!)) : s.posts,

    // Hồ sơ đang xem (bản thân, bot, hoặc suy ra từ tác giả bài viết)
    viewedUser(s): UserProfile {
      if (!s.viewingUserId || s.viewingUserId === s.currentUser.id) return s.currentUser
      const bot = s.bots.find((b) => b.id === s.viewingUserId)
      if (bot) return bot
      const p = s.posts.find((x) => x.userId === s.viewingUserId)
      if (p) {
        return {
          id: p.userId,
          name: p.authorName,
          username: p.authorUsername,
          avatar: p.authorAvatar,
          cover:
            'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
          bio: 'Thành viên của LongHieu Chanel.',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
        }
      }
      return s.currentUser
    },
    isViewingSelf: (s) => !s.viewingUserId || s.viewingUserId === s.currentUser.id,

    // Tìm kiếm tổng hợp: người dùng + nhóm + bài viết
    searchAll: (s) => (query: string) => {
      const q = query.trim().toLowerCase()
      if (!q) return { people: [], groups: [], posts: [] }

      const people = [s.currentUser, ...s.bots].filter(
        (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
      )
      const groups = s.groups.filter(
        (g) => g.name.toLowerCase().includes(q) || g.tag.toLowerCase().includes(q),
      )
      const posts = s.posts.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      )
      return { people, groups, posts }
    },
  },

  actions: {
    // ========================================================
    // Hydrate từ localStorage (gọi 1 lần khi mount phía client)
    // ========================================================
    hydrate() {
      if (this.hydrated || !import.meta.client) return

      // A. User
      const localUser = readLS<UserProfile>(LS.user)
      if (localUser) this.currentUser = localUser
      else writeLS(LS.user, ME_USER)

      // B. Bots
      const localBots = readLS<UserProfile[]>(LS.bots)
      if (localBots) {
        this.bots = localBots
      } else {
        this.bots = AI_BOTS.map((b) => ({ ...b, isFollowed: false }))
        writeLS(LS.bots, this.bots)
      }

      // C. Posts
      const localPosts = readLS<Post[]>(LS.posts)
      if (localPosts) {
        this.posts = localPosts
      } else {
        this.posts = INITIAL_POSTS
        writeLS(LS.posts, INITIAL_POSTS)
      }

      // D. Notifications
      const localNotifs = readLS<AppNotification[]>(LS.notifs)
      if (localNotifs) {
        this.notifications = localNotifs
      } else {
        const welcome: AppNotification = {
          id: 'sys-welcome',
          type: 'system',
          senderName: 'Trợ lý Hệ thống LongHieu Chanel',
          senderAvatar:
            'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=150&q=80',
          message:
            'Chào mừng bạn gia nhập LongHieu Chanel! Đây là mạng xã hội thông minh tích hợp Trợ lý Sáng tạo và các nhân vật tương tác tự động AI hàng đầu.',
          read: false,
          createdAt: new Date().toISOString(),
        }
        this.notifications = [welcome]
        writeLS(LS.notifs, this.notifications)
      }

      // E. Chats (seed DM với từng bot)
      const localChats = readLS<Chat[]>(LS.chats)
      if (localChats) {
        this.chats = localChats
      } else {
        this.chats = this.seedChats()
        writeLS(LS.chats, this.chats)
      }

      // F. Groups
      const localGroups = readLS<Group[]>(LS.groups)
      if (localGroups) {
        this.groups = localGroups
      } else {
        this.groups = GROUPS
        writeLS(LS.groups, GROUPS)
      }

      // G. Tab đang mở (reload thì giữ nguyên trang)
      const savedTab = import.meta.client ? localStorage.getItem(LS.tab) : null
      if (savedTab && VALID_TABS.includes(savedTab)) this.currentTab = savedTab

      this.hydrated = true
    },

    // Đọc lại user hiện tại từ localStorage (sau khi login/register đổi tài khoản).
    // hydrate() bị chốt `hydrated` nên không tự cập nhật khi điều hướng SPA.
    syncCurrentUser() {
      if (!import.meta.client) return
      const localUser = readLS<UserProfile>(LS.user)
      if (localUser && localUser.id !== this.currentUser.id) {
        this.currentUser = localUser
        // Đổi tài khoản → bỏ trạng thái đang xem hồ sơ người khác
        this.viewingUserId = null
      } else if (localUser) {
        this.currentUser = localUser
      }
    },

    seedChats(): Chat[] {
      return AI_BOTS.map((bot, index) => {
        let greetings: string[]
        if (bot.id === 'bot-tritech') {
          greetings = [
            'Chào Hải Nam! Tôi là Minh Trí từ ban cố vấn công nghệ.',
            'Tôi vừa hoàn tất báo cáo phân tích về Chip điện toán NPU thế hệ mới. Bạn đã đọc bài đăng mới trên Feed của tôi chưa? Hãy cùng thảo luận nhé!',
          ]
        } else if (bot.id === 'bot-vy_wanderlust') {
          greetings = [
            'Hé lô cuộc sống tươi đẹp! Vy đang ngồi nhìn sương sớm bay lơ lửng trên thung lũng Sapa đây.',
            'Nam đã có kế hoạch xách balo đi trốn bụi thành phố vào kỳ nghỉ tới chưa? Nhắn Vy tưới thêm năng lượng nhé! 🏔️✨',
          ]
        } else if (bot.id === 'bot-chefhao') {
          greetings = [
            'Cơm nước gì chưa người ơi? 👨‍🍳 Bếp Trưởng Hùng vừa nếm thử mẻ kho quẹt chấm rau luộc thơm nức.',
            'Cần công thức bí truyền cho bữa tiệc gia đình hay nấu cho người yêu thì cứ hú Hùng nhé, luôn sẵn lòng chia sẻ ngọt bùi!',
          ]
        } else {
          greetings = [
            'Xin chào Hải Nam! Rất vui được kết nối thiết kế.',
            'Bố cục visual mượt mà của mạng xã hội LongHieu Chanel này thực sự truyền cảm hứng cho tôi. Cùng tôi tinh chỉnh các xu hướng typography tối giản nhé!',
          ]
        }

        const messages: Message[] = greetings.map((g, gi) => ({
          id: `msg-seed-${bot.id}-${gi}`,
          chatId: `chat-${bot.id}`,
          sender: 'them',
          text: g,
          createdAt: new Date(Date.now() - 3600000 * (4 - gi)).toISOString(),
        }))

        return {
          id: `chat-${bot.id}`,
          targetUser: bot,
          unreadCount: index === 0 ? 0 : 1,
          messages,
          lastMessage: greetings[greetings.length - 1]!,
          lastMessageTime: '2 giờ trước',
        }
      })
    },

    // ========================================================
    // Helpers đồng bộ state + localStorage
    // ========================================================
    savePosts(newPosts: Post[]) {
      this.posts = newPosts
      writeLS(LS.posts, newPosts)
    },
    saveChats(newChats: Chat[]) {
      this.chats = newChats
      writeLS(LS.chats, newChats)
    },
    saveNotifs(newNotifs: AppNotification[]) {
      this.notifications = newNotifs
      writeLS(LS.notifs, newNotifs)
    },
    saveBots(newBots: UserProfile[]) {
      this.bots = newBots
      writeLS(LS.bots, newBots)
    },
    saveGroups(newGroups: Group[]) {
      this.groups = newGroups
      writeLS(LS.groups, newGroups)
    },

    // Tham gia / rời nhóm
    toggleJoinGroup(groupId: string) {
      this.saveGroups(
        this.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                joined: !g.joined,
                membersCount: g.joined ? Math.max(0, g.membersCount - 1) : g.membersCount + 1,
              }
            : g,
        ),
      )
    },

    // Mở nhóm → lọc feed theo tag của nhóm
    openGroup(groupId: string) {
      const g = this.groups.find((x) => x.id === groupId)
      if (g) this.filterTagAndNavigate(g.tag)
    },

    // ========================================================
    // Điều hướng tab
    // ========================================================
    setTab(tab: string) {
      this.currentTab = tab
      if (import.meta.client) localStorage.setItem(LS.tab, tab)
      // Reset hồ sơ đang xem khi điều hướng (vào tab profile = xem bản thân)
      this.viewingUserId = null
      // Vào messenger thì xóa badge chưa đọc + xin quyền thông báo thiết bị
      if (tab === 'messenger') {
        this.saveChats(this.chats.map((c) => ({ ...c, unreadCount: 0 })))
        this.ensureNotificationPermission()
      }
    },

    // Xin quyền hiển thị thông báo kiểu thiết bị (gọi từ thao tác người dùng)
    ensureNotificationPermission() {
      if (
        import.meta.client &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'default'
      ) {
        Notification.requestPermission().catch(() => {})
      }
    },

    // Bắn thông báo hệ thống (OS/trình duyệt) khi có tin nhắn mới
    pushDeviceNotification(opts: { title: string; body: string; icon?: string; tag?: string }) {
      if (import.meta.client) this.showToast(`💬 ${opts.title}: ${opts.body.slice(0, 60)}`)
      if (
        !import.meta.client ||
        typeof Notification === 'undefined' ||
        Notification.permission !== 'granted'
      ) {
        return
      }
      try {
        const notif = new Notification(opts.title, {
          body: opts.body,
          icon: opts.icon,
          tag: opts.tag,
        })
        notif.onclick = () => {
          window.focus()
          this.setTab('messenger')
          notif.close()
        }
      } catch {
        // một số trình duyệt yêu cầu ServiceWorkerRegistration.showNotification — bỏ qua
      }
    },

    // Xem hồ sơ của người khác (hoặc bản thân)
    viewProfile(userId: string) {
      this.viewingUserId = userId === this.currentUser.id ? null : userId
      this.currentTab = 'profile'
    },

    // Bấm thông báo → nhảy tới bài viết
    jumpToPost(postId: string) {
      this.selectedTag = null
      this.viewingUserId = null
      this.currentTab = 'home'
      this.highlightPostId = postId
    },
    clearHighlight() {
      this.highlightPostId = null
    },

    // Toast ngắn
    showToast(msg: string) {
      this.toast = msg
      if (import.meta.client) {
        setTimeout(() => {
          if (this.toast === msg) this.toast = null
        }, 2500)
      }
    },
    setSelectedTag(tag: string | null) {
      this.selectedTag = tag
    },
    filterTagAndNavigate(tag: string | null) {
      this.selectedTag = tag
      this.currentTab = 'home'
    },
    openCreateModal() {
      this.isCreateModalOpen = true
    },
    closeCreateModal() {
      this.isCreateModalOpen = false
    },

    // ========================================================
    // A. Thêm bài viết + bot AI tự bình luận
    // ========================================================
    addPost(content: string, imageUrl?: string, selectedTags?: string[]) {
      const newPost: Post = {
        id: `post-${Date.now()}`,
        userId: this.currentUser.id,
        authorName: this.currentUser.name,
        authorUsername: this.currentUser.username,
        authorAvatar: this.currentUser.avatar,
        content,
        imageUrl,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
        isLiked: false,
        isSaved: false,
        tags: selectedTags || [],
        comments: [],
        createdAt: new Date().toISOString(),
      }

      this.savePosts([newPost, ...this.posts])
      this.currentTab = 'home'
      this.selectedTag = null

      // Bot AI phản hồi sau ~4.5s
      setTimeout(() => this.triggerBotReply(newPost, content, selectedTags), 4500)
    },

    async triggerBotReply(newPost: Post, content: string, selectedTags?: string[]) {
      // Chọn bot phù hợp theo tag
      let bot = this.bots[0] || AI_BOTS[0]!
      const has = (t: string) => selectedTags?.includes(t)
      if (selectedTags && selectedTags.length > 0) {
        if (has('amthuc') || has('vietnamesefood') || has('monngon')) {
          bot = this.bots.find((b) => b.id === 'bot-chefhao') || bot
        } else if (has('dulich') || has('hanoi') || has('chualanh')) {
          bot = this.bots.find((b) => b.id === 'bot-vy_wanderlust') || bot
        } else if (has('thietke') || has('creative')) {
          bot = this.bots.find((b) => b.id === 'bot-andystudio') || bot
        } else if (has('congnghe') || has('ai')) {
          bot = this.bots.find((b) => b.id === 'bot-tritech') || bot
        } else {
          bot = this.bots[Math.floor(Math.random() * this.bots.length)] || bot
        }
      } else {
        bot = this.bots[Math.floor(Math.random() * this.bots.length)] || bot
      }

      try {
        const data = await $fetch<{ text?: string; error?: string }>(
          '/api/gemini/comment-reply',
          {
            method: 'POST',
            body: {
              postContent: content,
              authorName: this.currentUser.name,
              botPersona: {
                name: bot.name,
                bio: bot.bio,
                commentStyle: bot.commentStyle || 'Bình luận vui tươi',
              },
            },
          },
        )
        if (data.error) throw new Error(data.error)
        if (data.text) {
          this.appendBotComment(newPost.id, bot, data.text)
          this.saveNotifs([
            {
              id: `notif-${Date.now()}`,
              type: 'comment',
              senderName: bot.name,
              senderAvatar: bot.avatar,
              targetPostId: newPost.id,
              message: `đã bình luận vào bài viết mới của bạn: "${data.text.slice(0, 40)}..."`,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...this.notifications,
          ])
        }
      } catch (err) {
        console.error('Failed to generate companion bot response:', err)
        this.appendBotComment(
          newPost.id,
          bot,
          'Bài viết của Hải Nam hay và nhiều tâm huyết quá! Like mạng lưới kết nối này nhen 👍',
        )
      }
    },

    appendBotComment(postId: string, bot: UserProfile, text: string) {
      const comment: PostComment = {
        id: `comment-reply-${Date.now()}`,
        postId,
        authorId: bot.id,
        authorName: bot.name,
        authorAvatar: bot.avatar,
        content: text,
        createdAt: new Date().toISOString(),
        likesCount: 5,
        replies: [],
      }
      const updated = this.posts.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, comment], commentsCount: p.commentsCount + 1 }
          : p,
      )
      this.savePosts(updated)
    },

    // ========================================================
    // B. Like / Multi-reaction
    // ========================================================
    likePost(postId: string, reactionType?: ReactionType) {
      const rx = reactionType || 'like'
      const mapped = this.posts.map((p) => {
        if (p.id !== postId) return p
        const rStats = { ...p.reactions }

        if (p.isLiked) {
          if (p.myReaction === rx) {
            rStats[rx] = Math.max(0, (rStats[rx] || 1) - 1)
            return {
              ...p,
              isLiked: false,
              myReaction: undefined,
              likesCount: Math.max(0, p.likesCount - 1),
              reactions: rStats,
            }
          }
          if (p.myReaction) rStats[p.myReaction] = Math.max(0, (rStats[p.myReaction] || 1) - 1)
          rStats[rx] = (rStats[rx] || 0) + 1
          return { ...p, myReaction: rx, reactions: rStats }
        }

        rStats[rx] = (rStats[rx] || 0) + 1
        // Thông báo giả lập khi like bài của bot
        if (p.userId !== this.currentUser.id) {
          setTimeout(() => {
            this.saveNotifs([
              {
                id: `notif-rx-${Date.now()}`,
                type: 'like',
                senderName: p.authorName,
                senderAvatar: p.authorAvatar,
                message: 'thích hành động tương tác của bạn trên bài viết của anh ấy.',
                read: false,
                createdAt: new Date().toISOString(),
              },
              ...this.notifications,
            ])
          }, 1500)
        }
        return {
          ...p,
          isLiked: true,
          myReaction: rx,
          likesCount: p.likesCount + 1,
          reactions: rStats,
        }
      })
      this.savePosts(mapped)
    },

    // ========================================================
    // C/D. Save & Delete
    // ========================================================
    savePost(postId: string) {
      this.savePosts(this.posts.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p)))
    },
    deletePost(postId: string) {
      this.savePosts(this.posts.filter((p) => p.id !== postId))
    },

    // ========================================================
    // E. Follow / Unfollow bot
    // ========================================================
    toggleFollow(botId: string) {
      const updated = this.bots.map((b) => {
        if (b.id !== botId) return b
        const isNowFollowed = !b.isFollowed
        if (isNowFollowed) {
          this.saveNotifs([
            {
              id: `notif-follow-${Date.now()}`,
              type: 'follow',
              senderName: b.name,
              senderAvatar: b.avatar,
              message:
                'đã bắt đầu theo dõi lại bạn nồng nhiệt! Rất vui được đồng hành cùng Hải Nam.',
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...this.notifications,
          ])
        }
        return {
          ...b,
          isFollowed: isNowFollowed,
          followersCount: isNowFollowed ? b.followersCount + 1 : Math.max(0, b.followersCount - 1),
        }
      })
      this.saveBots(updated)
    },

    // ========================================================
    // F. Người dùng bình luận
    // ========================================================
    addComment(postId: string, commentText: string) {
      const comment: PostComment = {
        id: `comment-${Date.now()}`,
        postId,
        authorId: this.currentUser.id,
        authorName: this.currentUser.name,
        authorAvatar: this.currentUser.avatar,
        content: commentText,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        replies: [],
      }
      const updated = this.posts.map((p) =>
        p.id === postId
          ? { ...p, commentsCount: p.commentsCount + 1, comments: [...p.comments, comment] }
          : p,
      )
      this.savePosts(updated)
    },

    // Cập nhật 1 bình luận (kể cả reply 1 cấp) trong 1 bài viết
    updateCommentInPost(
      postId: string,
      commentId: string,
      updater: (c: PostComment) => PostComment,
    ) {
      const applyList = (list: PostComment[]): PostComment[] =>
        list.map((c) => {
          if (c.id === commentId) return updater(c)
          if (c.replies.length) return { ...c, replies: applyList(c.replies) }
          return c
        })
      this.savePosts(
        this.posts.map((p) => (p.id === postId ? { ...p, comments: applyList(p.comments) } : p)),
      )
    },

    // Biểu cảm cho bình luận / reply
    reactComment(postId: string, commentId: string, reactionType?: ReactionType) {
      const rx = reactionType || 'like'
      this.updateCommentInPost(postId, commentId, (c) => {
        if (c.myReaction === rx) {
          return { ...c, myReaction: undefined, likesCount: Math.max(0, c.likesCount - 1) }
        }
        const delta = c.myReaction ? 0 : 1
        return { ...c, myReaction: rx, likesCount: c.likesCount + delta }
      })
    },

    // Ẩn / hiện bình luận
    hideComment(postId: string, commentId: string) {
      this.updateCommentInPost(postId, commentId, (c) => ({ ...c, hidden: !c.hidden }))
    },

    // Trả lời 1 bình luận (reply 1 cấp)
    addReply(postId: string, commentId: string, text: string) {
      const reply: PostComment = {
        id: `reply-${Date.now()}`,
        postId,
        authorId: this.currentUser.id,
        authorName: this.currentUser.name,
        authorAvatar: this.currentUser.avatar,
        content: text,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        replies: [],
      }
      this.savePosts(
        this.posts.map((p) => {
          if (p.id !== postId) return p
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: p.comments.map((c) =>
              c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c,
            ),
          }
        }),
      )
    },

    // Chia sẻ bài viết (tăng đếm + toast)
    sharePost(postId: string) {
      this.savePosts(
        this.posts.map((p) => (p.id === postId ? { ...p, sharesCount: p.sharesCount + 1 } : p)),
      )
      this.showToast('Đã sao chép liên kết bài viết vào clipboard 🔗')
    },

    // ========================================================
    // G/H. Messenger
    // ========================================================
    mapApiConversation(raw: unknown): Chat | null {
      const item = asRecord(raw)
      if (!item) return null

      const id = getString(item, ['id', '_id', 'conversation_id'])
      if (!id) return null

      // Find the other participant from the members array (exclude self)
      const auth = useAuthStore()
      const myUserId = auth.getApiUserId()

      let participant: RemoteRecord | null = null
      let targetId = ''
      const members = getArray(item.members || item.Members)
      for (const member of members) {
        const m = asRecord(member)
        if (!m) continue
        const uid = getString(m, ['user_id', 'UserID'])
        if (uid && uid !== myUserId) {
          participant = asRecord(m.user || m.User) || m
          targetId = uid
          break
        }
      }

      // Fallback to legacy field patterns
      if (!participant) {
        participant =
          asRecord(item.user) ||
          asRecord(item.target_user) ||
          asRecord(item.receiver) ||
          asRecord(item.participant) ||
          asRecord(item.other_user) ||
          null
        if (!targetId) {
          targetId = getString(participant, ['id', '_id', 'user_id'], getString(item, ['user_id']))
        }
      }

      const name = getString(participant, ['name', 'username', 'email'], 'Người dùng')
      const username = getString(participant, ['username', 'email'], name)
      const avatar = getString(
        participant,
        ['avatar', 'avatar_url', 'image'],
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      )
      const lastMessage = getString(item, ['last_message', 'lastMessage', 'message'], '')
      const updatedAt = getString(item, ['updated_at', 'last_message_at', 'created_at'])

      return {
        id,
        targetUser: {
          id: targetId || id,
          name,
          username,
          avatar,
          cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
          bio: 'Thành viên của LongHieu Chanel.',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
        },
        unreadCount: Number(item.unread_count || item.unreadCount || 0),
        messages: [],
        lastMessage,
        lastMessageTime: updatedAt ? new Date(updatedAt).toLocaleString('vi-VN') : 'Vừa xong',
      }
    },

    mapApiMessage(raw: unknown, chatId: string): Message | null {
      const item = asRecord(raw)
      if (!item) return null
      const id = getString(item, ['id', '_id', 'message_id'], `msg-api-${Date.now()}`)
      const text = getString(item, ['text', 'content', 'message', 'body'])
      if (!text) return null
      const senderId = getString(item, ['sender_id', 'user_id', 'from'])
      const auth = useAuthStore()
      const myId = auth.getApiUserId()
      const isMine = senderId !== '' && (senderId === myId || senderId === this.currentUser.id)
      const mediaKind = detectMediaKind(text)
      return {
        id,
        chatId,
        sender: isMine ? 'me' : 'them',
        text: mediaKind ? '' : text,
        kind: mediaKind || undefined,
        image: mediaKind ? text : undefined,
        createdAt: getString(item, ['created_at', 'updated_at'], new Date().toISOString()),
      }
    },

    async syncChatsFromApi() {
      const auth = useAuthStore()
      const accessToken = auth.getAccessToken()
      if (!accessToken) return

      try {
        const api = useMxhApi()
        const response = await api.chat.listConversations(accessToken)
        if (!response.status) {
          this.showToast(response.message || 'Không thể tải danh sách tin nhắn từ API.')
          return
        }

        const apiChats = getArray(response.data)
          .map((item) => this.mapApiConversation(item))
          .filter((chat): chat is Chat => Boolean(chat))
        if (!apiChats.length) return

        const chatsWithMessages = await Promise.all(
          apiChats.map(async (chat) => {
            // Giữ trạng thái đã đọc cục bộ: WS + markChatRead đã quản lý unread realtime,
            // nên không để unread_count cũ từ server "hồi sinh" badge đã đọc.
            const existing = this.chats.find((c) => c.id === chat.id)
            const merged = {
              ...chat,
              messages: existing?.messages.length ? existing.messages : chat.messages,
              unreadCount: existing ? existing.unreadCount : chat.unreadCount,
              lastSeenAt: existing?.lastSeenAt ?? chat.lastSeenAt,
            }
            try {
              const messages = await api.chat.listConversationMessages(accessToken, chat.id, {
                page: 1,
                limit: 50,
              })
              const apiMessages = getArray(messages.data)
                .map((item) => this.mapApiMessage(item, chat.id))
                .filter((message): message is Message => Boolean(message))
                .reverse() // API trả về DESC (mới→cũ), reverse để hiển thị đúng cũ→mới
              if (!apiMessages.length) return merged
              const last = apiMessages[apiMessages.length - 1]
              return {
                ...merged,
                messages: apiMessages,
                lastMessage: last?.text || merged.lastMessage,
                lastMessageTime: last ? 'Vừa xong' : merged.lastMessageTime,
              }
            } catch (error) {
              console.warn('Cannot load API messages:', error)
              return merged
            }
          }),
        )

        this.saveChats(chatsWithMessages)
      } catch (error) {
        console.warn('Cannot sync API conversations:', error)
      }
    },

    sendMessage(chatId: string, text: string, extra: Partial<Message> = {}) {
      const msg: Message = {
        id: `msg-${Date.now()}`,
        chatId,
        sender: 'me',
        text,
        createdAt: new Date().toISOString(),
        ...extra,
      }
      // Nhãn hiển thị trong danh sách chat theo loại tin
      const preview =
        text ||
        (msg.kind === 'image'
          ? '📷 Hình ảnh'
          : msg.kind === 'gif'
            ? 'GIF'
            : msg.kind === 'sticker'
              ? 'Nhãn dán'
              : msg.kind === 'voice'
                ? '🎤 Tin nhắn thoại'
                : msg.kind === 'location'
                  ? '📍 Vị trí'
                  : '')
      this.saveChats(
        this.chats.map((c) =>
          c.id === chatId
            ? { ...c, messages: [...c.messages, msg], lastMessage: preview, lastMessageTime: 'Vừa xong' }
            : c,
        ),
      )

      // Gửi qua WebSocket cho hội thoại thật (API). Ảnh đã upload S3 nên gửi URL,
      // còn lại gửi text (sticker gửi emoji).
      if (isUuidFormat(chatId) && wsConn?.readyState === WebSocket.OPEN) {
        wsConn.send(JSON.stringify({
          type: 'send_message',
          conversation_id: chatId,
          content: msg.image || text,
        }))
      }
    },

    // Đánh dấu mọi tin nhắn của mình trong cuộc trò chuyện là "đã xem"
    markChatSeen(chatId: string) {
      this.saveChats(
        this.chats.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.sender === 'me' && !m.seen ? { ...m, seen: true } : m,
                ),
              },
        ),
      )
    },

    receiveBotReply(chatId: string, replyText: string) {
      const botMessage: Message = {
        id: `msg-bot-${Date.now()}`,
        chatId,
        sender: 'them',
        text: replyText,
        createdAt: new Date().toISOString(),
      }
      const isInChatTab = this.currentTab === 'messenger'
      this.saveChats(
        this.chats.map((c) =>
          c.id === chatId
            ? {
                ...c,
                // Bot phản hồi ⇒ coi như đã xem hết tin của mình
                messages: [
                  ...c.messages.map((m) => (m.sender === 'me' && !m.seen ? { ...m, seen: true } : m)),
                  botMessage,
                ],
                lastMessage: replyText,
                lastMessageTime: 'Vừa xong',
                unreadCount: isInChatTab ? 0 : c.unreadCount + 1,
              }
            : c,
        ),
      )

      // Thông báo khi không ở trong cuộc trò chuyện, hoặc app đang chạy nền
      const appHidden = import.meta.client && document.hidden
      if (!isInChatTab || appHidden) {
        const activeChat = this.chats.find((c) => c.id === chatId)
        if (activeChat) {
          if (!isInChatTab) {
            this.saveNotifs([
              {
                id: `notif-dm-${Date.now()}`,
                type: 'system',
                senderName: activeChat.targetUser.name,
                senderAvatar: activeChat.targetUser.avatar,
                message: `vừa gửi cho bạn một tin nhắn trực tiếp mới: "${replyText.slice(0, 30)}..."`,
                read: false,
                createdAt: new Date().toISOString(),
              },
              ...this.notifications,
            ])
          }
          this.pushDeviceNotification({
            title: activeChat.targetUser.name,
            body: replyText,
            icon: activeChat.targetUser.avatar,
            tag: chatId,
          })
        }
      }
    },

    // Sửa nội dung tin nhắn
    editMessage(chatId: string, msgId: string, newText: string) {
      this.saveChats(
        this.chats.map((c) => {
          if (c.id !== chatId) return c
          const messages = c.messages.map((m) =>
            m.id === msgId ? { ...m, text: newText, edited: true } : m,
          )
          const last = messages[messages.length - 1]
          return { ...c, messages, lastMessage: last?.text ?? c.lastMessage }
        }),
      )
    },

    // Xóa tin nhắn (của mình hoặc của người khác)
    deleteMessage(chatId: string, msgId: string) {
      this.saveChats(
        this.chats.map((c) => {
          if (c.id !== chatId) return c
          const messages = c.messages.filter((m) => m.id !== msgId)
          const last = messages[messages.length - 1]
          return { ...c, messages, lastMessage: last?.text ?? '' }
        }),
      )
    },

    // Thả biểu cảm cho tin nhắn
    reactMessage(chatId: string, msgId: string, emoji: string) {
      this.saveChats(
        this.chats.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgId
                    ? { ...m, reaction: m.reaction === emoji ? undefined : emoji }
                    : m,
                ),
              },
        ),
      )
    },

    // ========================================================
    // I. Cập nhật hồ sơ
    // ========================================================
    updateProfile(name: string, bio: string, avatar: string, cover: string) {
      const oldId = this.currentUser.id
      this.currentUser = { ...this.currentUser, name, bio, avatar, cover }
      writeLS(LS.user, this.currentUser)

      this.savePosts(
        this.posts.map((p) =>
          p.userId === oldId ? { ...p, authorName: name, authorAvatar: avatar } : p,
        ),
      )

      this.saveNotifs([
        {
          id: `sys-notif-${Date.now()}`,
          type: 'system',
          senderName: 'Hệ thống LongHieu Chanel',
          senderAvatar: avatar,
          message:
            'đã cập nhật thành công thông tin hồ sơ cá nhân và ảnh đại diện của bạn rộng khắp hệ thống.',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...this.notifications,
      ])
    },

    // ========================================================
    // J. AI Draft Assistant (RightBar)
    // ========================================================
    async launchAIWriter(initialPrompt: string) {
      this.isGlobalLoading = true
      try {
        const data = await $fetch<{ text?: string; error?: string }>(
          '/api/gemini/generate-post',
          {
            method: 'POST',
            body: { prompt: initialPrompt, tone: 'vui vẻ, truyền cảm hứng', category: 'Chung' },
          },
        )
        if (data.error) throw new Error(data.error)
        if (data.text) {
          this.aiPreFillContent = data.text
          this.isCreateModalOpen = true
        }
      } catch (e) {
        console.error(e)
        this.aiPreFillContent = `🚀 Bản phác thảo ý tưởng về "${initialPrompt}":\n\nMạng xã hội kết nối cực thích! Hãy khởi tạo khóa Secrets NUXT_GEMINI_API_KEY để trợ lý tự động viết các bài văn sâu sắc một cách hoàn hảo nhé! ✨`
        this.isCreateModalOpen = true
      } finally {
        this.isGlobalLoading = false
      }
    },

    setAiPreFillContent(content: string) {
      this.aiPreFillContent = content
    },

    // ========================================================
    // K. Thông báo
    // ========================================================
    markAllAsRead() {
      this.saveNotifs(this.notifications.map((n) => ({ ...n, read: true })))
    },
    clearNotifications() {
      this.saveNotifs([])
    },

    // ========================================================
    // L. WebSocket realtime
    // ========================================================
    connectWebSocket() {
      if (!import.meta.client) return
      const auth = useAuthStore()
      const token = auth.getAccessToken()
      if (!token) return
      if (wsConn?.readyState === WebSocket.OPEN || wsConn?.readyState === WebSocket.CONNECTING) return

      const config = useRuntimeConfig()
      const base = (config.public.apiBaseUrl as string).replace(/\/$/, '').replace(/\/api$/, '')
      const wsBase = base.replace(/^https/, 'wss').replace(/^http/, 'ws')

      wsConn = new WebSocket(`${wsBase}/ws/chat?token=${encodeURIComponent(token)}`)

      wsConn.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as Record<string, unknown>
          this.handleWsEvent(data)
        } catch {
          // ignore parse errors
        }
      }

      wsConn.onerror = () => {
        wsConn = null
      }

      wsConn.onclose = () => {
        wsConn = null
      }
    },

    disconnectWebSocket() {
      if (wsConn) {
        wsConn.close()
        wsConn = null
      }
    },

    handleWsEvent(event: Record<string, unknown>) {
      const type = event.type as string

      // ── Tin nhắn mới ──
      if (type === 'message') {
        const data = asRecord(event.data)
        const conversationId = (event.conversation_id as string) || getString(data, ['conversation_id'])
        if (!data || !conversationId) return

        const auth = useAuthStore()
        const myId = auth.getApiUserId()
        const senderId = getString(data, ['sender_id'])

        // Bỏ qua echo tin của chính mình (đã thêm optimistically)
        if (senderId && senderId === myId) return

        const msg = this.mapApiMessage(data, conversationId)
        if (!msg) return

        const isActiveConversation =
          this.currentTab === 'messenger' && this.activeChatInMessenger === conversationId

        this.saveChats(
          this.chats.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: [...c.messages, msg],
              lastMessage: msg.text,
              lastMessageTime: 'Vừa xong',
              // Không tăng unread nếu đang xem conversation này
              unreadCount: isActiveConversation ? 0 : c.unreadCount + 1,
            }
          }),
        )

        // Nếu đang xem conversation → auto gửi seen
        if (isActiveConversation && wsConn?.readyState === WebSocket.OPEN) {
          wsConn.send(JSON.stringify({ type: 'seen', conversation_id: conversationId }))
        }

        // Thông báo toast nếu không đang xem conversation này
        if (!isActiveConversation) {
          const chat = this.chats.find((c) => c.id === conversationId)
          const senderName = chat?.targetUser.name || 'Tin nhắn mới'
          const preview = msg.text.length > 35 ? msg.text.slice(0, 35) + '…' : msg.text
          this.showToast(`💬 ${senderName}: ${preview}`)
        }
        return
      }

      // ── Đã xem ──
      if (type === 'seen') {
        const data = asRecord(event.data)
        const conversationId = event.conversation_id as string
        if (!conversationId) return

        const auth = useAuthStore()
        const myId = auth.getApiUserId()
        const userId = getString(data, ['user_id'])

        // Chỉ cập nhật khi người KHÁC đánh dấu đã xem
        if (userId && userId !== myId) {
          const time = getString(data, ['time']) || new Date().toISOString()
          this.saveChats(
            this.chats.map((c) =>
              c.id === conversationId ? { ...c, lastSeenAt: time } : c,
            ),
          )
        }
      }
    },

    // Đánh dấu đã đọc: xóa unread + gửi seen WS
    markChatRead(chatId: string) {
      this.saveChats(
        this.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
      )
      if (isUuidFormat(chatId) && wsConn?.readyState === WebSocket.OPEN) {
        wsConn.send(JSON.stringify({ type: 'seen', conversation_id: chatId }))
      }
    },

    // Ghi nhớ conversation đang mở trong Messenger
    setActiveChatInMessenger(chatId: string | null) {
      this.activeChatInMessenger = chatId
      if (chatId) this.markChatRead(chatId)
    },

    // ========================================================
    // M. Tìm kiếm người dùng + mở cuộc trò chuyện
    // ========================================================
    async searchUsersFromApi(query: string): Promise<ApiUserResult[]> {
      if (!import.meta.client) return []
      const auth = useAuthStore()
      const accessToken = auth.getAccessToken()
      if (!accessToken) return []
      try {
        const api = useMxhApi()
        const res = await api.users.search(accessToken, { q: query })
        if (!res.status) return []
        return Array.isArray(res.data) ? res.data : []
      } catch (error) {
        console.warn('searchUsersFromApi error:', error)
        return []
      }
    },

    async openOrCreateChat(userId: string, userInfo?: { name?: string; username?: string; avatar?: string }): Promise<string | undefined> {
      const auth = useAuthStore()
      const accessToken = auth.getAccessToken()
      if (!accessToken) {
        this.showToast('Vui lòng đăng nhập để nhắn tin.')
        return undefined
      }

      try {
        const api = useMxhApi()
        const res = await api.chat.createDirectConversation(accessToken, { user_id: userId })
        if (!res.status) {
          this.showToast('Không thể tạo cuộc trò chuyện.')
          return undefined
        }

        const convData = asRecord(res.data)
        if (!convData) return undefined

        const chatId = getString(convData, ['id'])
        if (!chatId) return undefined

        // If already in list, just return the id
        if (this.chats.some((c) => c.id === chatId)) {
          return chatId
        }

        // Try to map from API data
        let chat = this.mapApiConversation(convData)

        // If mapping failed or name is missing, build from userInfo
        if (!chat || chat.targetUser.name === 'Người dùng') {
          const name = userInfo?.name || chat?.targetUser.name || 'Người dùng'
          const username = userInfo?.username || chat?.targetUser.username || name
          const avatar = userInfo?.avatar || chat?.targetUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
          chat = {
            id: chatId,
            targetUser: {
              id: userId,
              name,
              username,
              avatar,
              cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
              bio: 'Thành viên của LongHieu Chanel.',
              followersCount: 0,
              followingCount: 0,
              postsCount: 0,
            },
            unreadCount: 0,
            messages: [],
            lastMessage: '',
            lastMessageTime: 'Vừa xong',
          }
        } else if (userInfo) {
          chat = {
            ...chat,
            targetUser: {
              ...chat.targetUser,
              name: userInfo.name || chat.targetUser.name,
              username: userInfo.username || chat.targetUser.username,
              avatar: userInfo.avatar || chat.targetUser.avatar,
            },
          }
        }

        this.saveChats([chat, ...this.chats.filter((c) => c.id !== chatId)])
        return chatId
      } catch (error) {
        console.error('openOrCreateChat error:', error)
        this.showToast('Không thể mở cuộc trò chuyện.')
        return undefined
      }
    },
  },
})
