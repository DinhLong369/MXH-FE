import { defineStore } from 'pinia'
import type {
  AppNotification,
  Chat,
  Message,
  Post,
  PostComment,
  ReactionType,
  UserProfile,
} from '~/types'
import { AI_BOTS, INITIAL_POSTS, ME_USER } from '~/data'

// Khóa localStorage
const LS = {
  user: 'vs_currentUser',
  bots: 'vs_bots',
  posts: 'vs_posts',
  notifs: 'vs_notifications',
  chats: 'vs_chats',
}

function readLS<T>(key: string): T | null {
  if (!import.meta.client) return null
  const raw = localStorage.getItem(key)
  return raw ? (JSON.parse(raw) as T) : null
}

function writeLS(key: string, value: unknown) {
  if (!import.meta.client) return
  localStorage.setItem(key, JSON.stringify(value))
}

interface SocialState {
  currentTab: string
  posts: Post[]
  currentUser: UserProfile
  bots: UserProfile[]
  chats: Chat[]
  notifications: AppNotification[]
  selectedTag: string | null
  isCreateModalOpen: boolean
  aiPreFillContent: string
  isGlobalLoading: boolean
  hydrated: boolean
  viewingUserId: string | null
  highlightPostId: string | null
  toast: string | null
}

export const useSocialStore = defineStore('social', {
  state: (): SocialState => ({
    currentTab: 'home',
    posts: [],
    currentUser: { ...ME_USER },
    bots: [],
    chats: [],
    notifications: [],
    selectedTag: null,
    isCreateModalOpen: false,
    aiPreFillContent: '',
    isGlobalLoading: false,
    hydrated: false,
    viewingUserId: null,
    highlightPostId: null,
    toast: null,
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

      this.hydrated = true
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

    // ========================================================
    // Điều hướng tab
    // ========================================================
    setTab(tab: string) {
      this.currentTab = tab
      // Reset hồ sơ đang xem khi điều hướng (vào tab profile = xem bản thân)
      this.viewingUserId = null
      // Vào messenger thì xóa badge chưa đọc
      if (tab === 'messenger') {
        this.saveChats(this.chats.map((c) => ({ ...c, unreadCount: 0 })))
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
    sendMessage(chatId: string, text: string) {
      const msg: Message = {
        id: `msg-${Date.now()}`,
        chatId,
        sender: 'me',
        text,
        createdAt: new Date().toISOString(),
      }
      this.saveChats(
        this.chats.map((c) =>
          c.id === chatId
            ? { ...c, messages: [...c.messages, msg], lastMessage: text, lastMessageTime: 'Vừa xong' }
            : c,
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
                messages: [...c.messages, botMessage],
                lastMessage: replyText,
                lastMessageTime: 'Vừa xong',
                unreadCount: isInChatTab ? 0 : c.unreadCount + 1,
              }
            : c,
        ),
      )

      if (!isInChatTab) {
        const activeChat = this.chats.find((c) => c.id === chatId)
        if (activeChat) {
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
  },
})
