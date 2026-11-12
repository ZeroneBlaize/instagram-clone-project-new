export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  avatarUrl: string;
  bio: string;
  website: string;
  verified: boolean;
  followers: string[];
  following: string[];
  savedPostIds: string[];
  createdAt: string;
}

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

export interface CommentRecord {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface CommentView extends CommentRecord {
  author: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'verified'>;
}

export interface PostRecord {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaKind: 'photo' | 'reel';
  caption: string;
  altText: string;
  location: string;
  tags: string[];
  likes: string[];
  contentWarning: string | null;
  guardrailStatus: 'clean' | 'flagged';
  createdAt: string;
}

export interface PostView extends PostRecord {
  author: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'verified'>;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  comments: CommentView[];
}

export interface StoryRecord {
  id: string;
  userId: string;
  mediaUrl: string;
  caption: string;
  viewedBy: string[];
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroupView {
  author: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'verified'>;
  hasUnseen: boolean;
  stories: Array<StoryRecord & { isViewed: boolean }>;
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
  partner: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'verified'>;
  lastMessage: MessageRecord;
  unreadCount: number;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  actorId: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'guardrail';
  postId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationView extends NotificationRecord {
  actor: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'verified'>;
}

export interface ReportRecord {
  id: string;
  postId: string;
  reporterId: string;
  reason: 'spam' | 'harassment' | 'misinformation' | 'sensitive' | 'copyright';
  details: string;
  status: 'open' | 'reviewed';
  createdAt: string;
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
