export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  website: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  postsCount?: number;
  createdAt: string;
}

export interface AuthorSnippet {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  verified: boolean;
}

export interface CommentView {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
  author: AuthorSnippet;
}

export interface PostView {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaKind: 'photo' | 'reel';
  caption: string;
  altText: string;
  location: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  contentWarning: string | null;
  guardrailStatus: 'clean' | 'flagged';
  createdAt: string;
  author: AuthorSnippet;
  comments: CommentView[];
}

export interface StoryItem {
  id: string;
  userId: string;
  mediaUrl: string;
  caption: string;
  isViewed: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroupView {
  author: AuthorSnippet;
  hasUnseen: boolean;
  stories: StoryItem[];
}

export interface MessageRecord {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  partner: AuthorSnippet;
  lastMessage: MessageRecord;
  unreadCount: number;
}

export interface NotificationView {
  id: string;
  userId: string;
  actorId: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'guardrail';
  postId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
  actor: AuthorSnippet;
}

export interface CreatorStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalReach: number;
  engagementRate: number;
  followersCount: number;
  followingCount: number;
  guardrailHealth: {
    cleanPosts: number;
    flaggedPosts: number;
    openReportsAgainstUser: number;
  };
  topTags: Array<{ tag: string; count: number }>;
}

export interface GuardrailDecision {
  allowed: boolean;
  status: 'clean' | 'flagged' | 'blocked';
  code?: string;
  reason?: string;
  sanitizedText: string;
  tags: string[];
  contentWarning: string | null;
}
