import mongoose, { Schema } from 'mongoose';
import { DataRepository } from './repository.js';
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
  ReportRecord,
  StoryGroupView,
  StoryRecord,
  UserRecord,
} from './types.js';

const userSchema = new Schema<UserRecord>(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    bio: { type: String, default: '' },
    website: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    followers: { type: [String], default: [] },
    following: { type: [String], default: [] },
    savedPostIds: { type: [String], default: [] },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const postSchema = new Schema<PostRecord>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    mediaUrl: { type: String, required: true },
    mediaKind: { type: String, enum: ['photo', 'reel'], default: 'photo' },
    caption: { type: String, required: true },
    altText: { type: String, default: '' },
    location: { type: String, default: '' },
    tags: { type: [String], default: [] },
    likes: { type: [String], default: [] },
    contentWarning: { type: String, default: null },
    guardrailStatus: { type: String, enum: ['clean', 'flagged'], default: 'clean' },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const commentSchema = new Schema<CommentRecord>(
  {
    id: { type: String, required: true, unique: true },
    postId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const storySchema = new Schema<StoryRecord>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    mediaUrl: { type: String, required: true },
    caption: { type: String, default: '' },
    viewedBy: { type: [String], default: [] },
    createdAt: { type: String, required: true },
    expiresAt: { type: String, required: true },
  },
  { versionKey: false }
);

const messageSchema = new Schema<MessageRecord>(
  {
    id: { type: String, required: true, unique: true },
    senderId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const notificationSchema = new Schema<NotificationRecord>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    type: { type: String, enum: ['like', 'comment', 'follow', 'message', 'guardrail'], required: true },
    postId: { type: String, default: null },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const reportSchema = new Schema<ReportRecord>(
  {
    id: { type: String, required: true, unique: true },
    postId: { type: String, required: true },
    reporterId: { type: String, required: true },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'misinformation', 'sensitive', 'copyright'],
      required: true,
    },
    details: { type: String, default: '' },
    status: { type: String, enum: ['open', 'reviewed'], default: 'open' },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const UserModel: mongoose.Model<UserRecord> =
  (mongoose.models.User as mongoose.Model<UserRecord>) || mongoose.model<UserRecord>('User', userSchema);
const PostModel: mongoose.Model<PostRecord> =
  (mongoose.models.Post as mongoose.Model<PostRecord>) || mongoose.model<PostRecord>('Post', postSchema);
const CommentModel: mongoose.Model<CommentRecord> =
  (mongoose.models.Comment as mongoose.Model<CommentRecord>) ||
  mongoose.model<CommentRecord>('Comment', commentSchema);
const StoryModel: mongoose.Model<StoryRecord> =
  (mongoose.models.Story as mongoose.Model<StoryRecord>) || mongoose.model<StoryRecord>('Story', storySchema);
const MessageModel: mongoose.Model<MessageRecord> =
  (mongoose.models.Message as mongoose.Model<MessageRecord>) ||
  mongoose.model<MessageRecord>('Message', messageSchema);
const NotificationModel: mongoose.Model<NotificationRecord> =
  (mongoose.models.Notification as mongoose.Model<NotificationRecord>) ||
  mongoose.model<NotificationRecord>('Notification', notificationSchema);
const ReportModel: mongoose.Model<ReportRecord> =
  (mongoose.models.Report as mongoose.Model<ReportRecord>) || mongoose.model<ReportRecord>('Report', reportSchema);

export class MongoRepository implements DataRepository {
  public readonly driver = 'mongodb' as const;

  constructor(private readonly uri: string) {}

  async init(): Promise<void> {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(this.uri);
    }
  }

  async close(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  private authorSnippet(u: UserRecord) {
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      verified: u.verified,
    };
  }

  async countUsers(): Promise<number> {
    return UserModel.countDocuments();
  }

  async createUser(user: UserRecord): Promise<UserRecord> {
    await UserModel.create({
      ...user,
      username: user.username.toLowerCase(),
      email: user.email.toLowerCase(),
    });
    return (await this.findUserById(user.id))!;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return UserModel.findOne({ id }).lean();
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    return UserModel.findOne({ username: username.toLowerCase() }).lean();
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).lean();
  }

  async listUsers(search?: string): Promise<UserRecord[]> {
    const query = search?.trim()
      ? {
          $or: [
            { username: { $regex: search.trim(), $options: 'i' } },
            { displayName: { $regex: search.trim(), $options: 'i' } },
          ],
        }
      : {};
    return UserModel.find(query).sort({ createdAt: -1 }).limit(30).lean();
  }

  async updateUserProfile(
    userId: string,
    patch: Partial<Pick<UserRecord, 'displayName' | 'bio' | 'website' | 'avatarUrl'>>
  ): Promise<UserRecord | null> {
    return UserModel.findOneAndUpdate({ id: userId }, { $set: patch }, { new: true }).lean();
  }

  async toggleFollow(
    followerId: string,
    targetUserId: string
  ): Promise<{ following: boolean; followersCount: number }> {
    const follower = await this.findUserById(followerId);
    const target = await this.findUserById(targetUserId);
    if (!follower || !target) throw new Error('User not found');

    const already = target.followers.includes(followerId);
    const nextFollowers = already
      ? target.followers.filter((x) => x !== followerId)
      : [...new Set([...target.followers, followerId])];
    const nextFollowing = already
      ? follower.following.filter((x) => x !== targetUserId)
      : [...new Set([...follower.following, targetUserId])];

    await UserModel.updateOne({ id: targetUserId }, { $set: { followers: nextFollowers } });
    await UserModel.updateOne({ id: followerId }, { $set: { following: nextFollowing } });
    return { following: !already, followersCount: nextFollowers.length };
  }

  async toggleSavePost(userId: string, postId: string): Promise<{ saved: boolean }> {
    const user = await this.findUserById(userId);
    if (!user) throw new Error('User not found');
    const already = user.savedPostIds.includes(postId);
    const next = already
      ? user.savedPostIds.filter((x) => x !== postId)
      : [...new Set([postId, ...user.savedPostIds])];
    await UserModel.updateOne({ id: userId }, { $set: { savedPostIds: next } });
    return { saved: !already };
  }

  async createPost(post: PostRecord): Promise<PostRecord> {
    await PostModel.create(post);
    return post;
  }

  async findPostById(id: string): Promise<PostRecord | null> {
    return PostModel.findOne({ id }).lean();
  }

  async deletePost(id: string): Promise<boolean> {
    const res = await PostModel.deleteOne({ id });
    await CommentModel.deleteMany({ postId: id });
    return res.deletedCount > 0;
  }

  private async hydratePosts(posts: PostRecord[], viewerId?: string | null): Promise<PostView[]> {
    const users = await this.listUsers();
    const userMap = new Map(users.map((u) => [u.id, u]));
    const viewer = viewerId ? userMap.get(viewerId) ?? (await this.findUserById(viewerId)) : null;

    const views: PostView[] = [];
    for (const p of posts) {
      const author = userMap.get(p.userId) ?? (await this.findUserById(p.userId));
      if (!author) continue;
      const rawComments = await CommentModel.find({ postId: p.id }).sort({ createdAt: 1 }).lean();
      const comments: CommentView[] = [];
      for (const c of rawComments) {
        const cAuthor = userMap.get(c.userId) ?? (await this.findUserById(c.userId));
        if (!cAuthor) continue;
        comments.push({ ...c, author: this.authorSnippet(cAuthor) });
      }
      views.push({
        ...p,
        author: this.authorSnippet(author),
        likesCount: p.likes.length,
        commentsCount: comments.length,
        isLiked: viewerId ? p.likes.includes(viewerId) : false,
        isSaved: viewer ? viewer.savedPostIds.includes(p.id) : false,
        comments,
      });
    }
    return views;
  }

  async listPosts(options: {
    viewerId?: string | null;
    tab?: 'for-you' | 'following' | 'saved' | 'reels' | 'user';
    targetUserId?: string;
    tag?: string;
    search?: string;
    limit?: number;
  }): Promise<PostView[]> {
    let posts = await PostModel.find({}).sort({ createdAt: -1 }).lean();
    const viewer = options.viewerId ? await this.findUserById(options.viewerId) : null;

    if (options.tab === 'following' && viewer) {
      const allowed = new Set([viewer.id, ...viewer.following]);
      posts = posts.filter((p) => allowed.has(p.userId));
    } else if (options.tab === 'saved' && viewer) {
      const savedSet = new Set(viewer.savedPostIds);
      posts = posts.filter((p) => savedSet.has(p.id));
    } else if (options.tab === 'reels') {
      posts = posts.filter((p) => p.mediaKind === 'reel');
    } else if (options.tab === 'user' && options.targetUserId) {
      posts = posts.filter((p) => p.userId === options.targetUserId);
    }

    if (options.tag) {
      const targetTag = options.tag.toLowerCase().replace(/^#/, '');
      posts = posts.filter((p) => p.tags.includes(targetTag));
    }

    let hydrated = await this.hydratePosts(posts, options.viewerId);
    if (options.search?.trim()) {
      const q = options.search.trim().toLowerCase();
      hydrated = hydrated.filter(
        (p) =>
          p.caption.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.author.username.toLowerCase().includes(q) ||
          p.author.displayName.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q))
      );
    }
    return hydrated.slice(0, options.limit ?? 50);
  }

  async getPostView(postId: string, viewerId?: string | null): Promise<PostView | null> {
    const post = await this.findPostById(postId);
    if (!post) return null;
    const views = await this.hydratePosts([post], viewerId);
    return views[0] ?? null;
  }

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const post = await this.findPostById(postId);
    if (!post) throw new Error('Post not found');
    const already = post.likes.includes(userId);
    const nextLikes = already
      ? post.likes.filter((x) => x !== userId)
      : [...new Set([...post.likes, userId])];
    await PostModel.updateOne({ id: postId }, { $set: { likes: nextLikes } });
    return { liked: !already, likesCount: nextLikes.length };
  }

  async addComment(comment: CommentRecord): Promise<CommentView> {
    await CommentModel.create(comment);
    const author = await this.findUserById(comment.userId);
    if (!author) throw new Error('Author not found');
    return { ...comment, author: this.authorSnippet(author) };
  }

  async deleteComment(commentId: string, requesterId: string): Promise<boolean> {
    const existing = await CommentModel.findOne({ id: commentId }).lean();
    if (!existing) return false;
    if (existing.userId !== requesterId) throw new Error('FORBIDDEN');
    const res = await CommentModel.deleteOne({ id: commentId });
    return res.deletedCount > 0;
  }

  async createStory(story: StoryRecord): Promise<StoryRecord> {
    await StoryModel.create(story);
    return story;
  }

  async listActiveStoryGroups(viewerId?: string | null): Promise<StoryGroupView[]> {
    const nowIso = new Date().toISOString();
    const stories = await StoryModel.find({ expiresAt: { $gt: nowIso } })
      .sort({ createdAt: -1 })
      .lean();
    const grouped = new Map<string, StoryRecord[]>();
    for (const s of stories) {
      const list = grouped.get(s.userId) ?? [];
      list.push(s);
      grouped.set(s.userId, list);
    }

    const out: StoryGroupView[] = [];
    for (const [uid, items] of grouped.entries()) {
      const author = await this.findUserById(uid);
      if (!author) continue;
      const mapped = items.map((s) => ({
        ...s,
        isViewed: viewerId ? s.viewedBy.includes(viewerId) : false,
      }));
      out.push({
        author: this.authorSnippet(author),
        hasUnseen: mapped.some((s) => !s.isViewed),
        stories: mapped,
      });
    }
    return out;
  }

  async markStoryViewed(storyId: string, viewerId: string): Promise<void> {
    await StoryModel.updateOne({ id: storyId }, { $addToSet: { viewedBy: viewerId } });
  }

  async createMessage(msg: MessageRecord): Promise<MessageRecord> {
    await MessageModel.create(msg);
    return msg;
  }

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const msgs = await MessageModel.find({
      $or: [{ senderId: userId }, { recipientId: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const map = new Map<string, { last: MessageRecord; unread: number }>();
    for (const m of msgs) {
      const partnerId = m.senderId === userId ? m.recipientId : m.senderId;
      const existing = map.get(partnerId);
      const unread = m.recipientId === userId && !m.read ? 1 : 0;
      if (!existing) map.set(partnerId, { last: m, unread });
      else existing.unread += unread;
    }

    const out: ConversationSummary[] = [];
    for (const [partnerId, info] of map.entries()) {
      const partner = await this.findUserById(partnerId);
      if (!partner) continue;
      out.push({
        partner: this.authorSnippet(partner),
        lastMessage: info.last,
        unreadCount: info.unread,
      });
    }
    return out;
  }

  async listThreadMessages(userId: string, partnerId: string): Promise<MessageRecord[]> {
    return MessageModel.find({
      $or: [
        { senderId: userId, recipientId: partnerId },
        { senderId: partnerId, recipientId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();
  }

  async markThreadRead(userId: string, partnerId: string): Promise<void> {
    await MessageModel.updateMany({ recipientId: userId, senderId: partnerId }, { $set: { read: true } });
  }

  async createNotification(note: NotificationRecord): Promise<NotificationRecord> {
    await NotificationModel.create(note);
    return note;
  }

  async listNotifications(userId: string): Promise<NotificationView[]> {
    const notes = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(40).lean();
    const out: NotificationView[] = [];
    for (const n of notes) {
      const actor = await this.findUserById(n.actorId);
      if (!actor) continue;
      out.push({ ...n, actor: this.authorSnippet(actor) });
    }
    return out;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await NotificationModel.updateMany({ userId }, { $set: { read: true } });
  }

  async createReport(report: ReportRecord): Promise<ReportRecord> {
    await ReportModel.create(report);
    return report;
  }

  async listReports(): Promise<ReportRecord[]> {
    return ReportModel.find({}).sort({ createdAt: -1 }).lean();
  }

  async getCreatorStats(userId: string): Promise<CreatorStats | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    const posts = await PostModel.find({ userId }).lean();
    let totalLikes = 0;
    let totalComments = 0;
    let cleanPosts = 0;
    let flaggedPosts = 0;
    const tagCounts = new Map<string, number>();

    for (const p of posts) {
      totalLikes += p.likes.length;
      totalComments += await CommentModel.countDocuments({ postId: p.id });
      if (p.guardrailStatus === 'flagged') flaggedPosts++;
      else cleanPosts++;
      for (const t of p.tags) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }

    const postIds = new Set(posts.map((p) => p.id));
    const reports = await this.listReports();
    const openReportsAgainstUser = reports.filter((r) => r.status === 'open' && postIds.has(r.postId)).length;
    const followerBase = Math.max(user.followers.length, 1);
    const totalReach = posts.length * 140 + totalLikes * 12 + totalComments * 18;
    const engagementRate =
      posts.length > 0
        ? Number((((totalLikes + totalComments) / (posts.length * followerBase)) * 100).toFixed(1))
        : 0;

    return {
      totalPosts: posts.length,
      totalLikes,
      totalComments,
      totalReach,
      engagementRate,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      guardrailHealth: { cleanPosts, flaggedPosts, openReportsAgainstUser },
      topTags: [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag, count]) => ({ tag, count })),
    };
  }
}
