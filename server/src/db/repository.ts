import {
  CommentRecord,
  CommentView,
  ConversationSummary,
  CreatorStats,
  MessageRecord,
  NotificationRecord,
  NotificationView,
  PostRecord,
  PostView,
  PublicUser,
  ReportRecord,
  StoryGroupView,
  StoryRecord,
  UserRecord,
} from './types.js';

export interface DataRepository {
  readonly driver: 'sqlite' | 'mongodb';
  init(): Promise<void>;
  close(): Promise<void>;
  countUsers(): Promise<number>;

  // Users
  createUser(user: UserRecord): Promise<UserRecord>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  listUsers(search?: string): Promise<UserRecord[]>;
  updateUserProfile(
    userId: string,
    patch: Partial<Pick<UserRecord, 'displayName' | 'bio' | 'website' | 'avatarUrl'>>
  ): Promise<UserRecord | null>;
  toggleFollow(followerId: string, targetUserId: string): Promise<{ following: boolean; followersCount: number }>;
  toggleSavePost(userId: string, postId: string): Promise<{ saved: boolean }>;

  // Posts & Comments
  createPost(post: PostRecord): Promise<PostRecord>;
  findPostById(id: string): Promise<PostRecord | null>;
  deletePost(id: string): Promise<boolean>;
  listPosts(options: {
    viewerId?: string | null;
    tab?: 'for-you' | 'following' | 'saved' | 'reels' | 'user';
    targetUserId?: string;
    tag?: string;
    search?: string;
    limit?: number;
  }): Promise<PostView[]>;
  getPostView(postId: string, viewerId?: string | null): Promise<PostView | null>;
  toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }>;
  addComment(comment: CommentRecord): Promise<CommentView>;
  deleteComment(commentId: string, requesterId: string): Promise<boolean>;

  // Stories
  createStory(story: StoryRecord): Promise<StoryRecord>;
  listActiveStoryGroups(viewerId?: string | null): Promise<StoryGroupView[]>;
  markStoryViewed(storyId: string, viewerId: string): Promise<void>;

  // Direct Messages
  createMessage(msg: MessageRecord): Promise<MessageRecord>;
  listConversations(userId: string): Promise<ConversationSummary[]>;
  listThreadMessages(userId: string, partnerId: string): Promise<MessageRecord[]>;
  markThreadRead(userId: string, partnerId: string): Promise<void>;

  // Notifications & Guardrail Reports
  createNotification(note: NotificationRecord): Promise<NotificationRecord>;
  listNotifications(userId: string): Promise<NotificationView[]>;
  markAllNotificationsRead(userId: string): Promise<void>;
  createReport(report: ReportRecord): Promise<ReportRecord>;
  listReports(): Promise<ReportRecord[]>;
  getCreatorStats(userId: string): Promise<CreatorStats | null>;
}

export function toPublicUser(
  user: UserRecord,
  viewerId?: string | null,
  postsCount?: number
): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    website: user.website,
    verified: user.verified,
    followersCount: user.followers.length,
    followingCount: user.following.length,
    isFollowing: viewerId ? user.followers.includes(viewerId) : false,
    postsCount,
    createdAt: user.createdAt,
  };
}
