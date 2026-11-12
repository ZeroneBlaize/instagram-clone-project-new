import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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

function parseJsonArray(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export class SqliteRepository implements DataRepository {
  public readonly driver = 'sqlite' as const;
  private db: DatabaseSync;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
  }

  async init(): Promise<void> {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        verified INTEGER NOT NULL DEFAULT 0,
        followers TEXT NOT NULL DEFAULT '[]',
        following TEXT NOT NULL DEFAULT '[]',
        saved_post_ids TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        media_url TEXT NOT NULL,
        media_kind TEXT NOT NULL DEFAULT 'photo',
        caption TEXT NOT NULL,
        alt_text TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        likes TEXT NOT NULL DEFAULT '[]',
        content_warning TEXT,
        guardrail_status TEXT NOT NULL DEFAULT 'clean',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        media_url TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        viewed_by TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        text TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        type TEXT NOT NULL,
        post_id TEXT,
        message TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        reporter_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL
      );
    `);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  private mapUser(row: Record<string, unknown> | undefined): UserRecord | null {
    if (!row) return null;
    return {
      id: String(row.id),
      username: String(row.username),
      displayName: String(row.display_name),
      email: String(row.email),
      passwordHash: String(row.password_hash),
      avatarUrl: String(row.avatar_url),
      bio: String(row.bio),
      website: String(row.website),
      verified: Boolean(row.verified),
      followers: parseJsonArray(row.followers),
      following: parseJsonArray(row.following),
      savedPostIds: parseJsonArray(row.saved_post_ids),
      createdAt: String(row.created_at),
    };
  }

  private mapPost(row: Record<string, unknown>): PostRecord {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      mediaUrl: String(row.media_url),
      mediaKind: row.media_kind === 'reel' ? 'reel' : 'photo',
      caption: String(row.caption),
      altText: String(row.alt_text),
      location: String(row.location),
      tags: parseJsonArray(row.tags),
      likes: parseJsonArray(row.likes),
      contentWarning: row.content_warning ? String(row.content_warning) : null,
      guardrailStatus: row.guardrail_status === 'flagged' ? 'flagged' : 'clean',
      createdAt: String(row.created_at),
    };
  }

  private authorSnippet(user: UserRecord) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      verified: user.verified,
    };
  }

  async countUsers(): Promise<number> {
    const row = this.db.prepare('SELECT COUNT(*) AS cnt FROM users').get() as { cnt: number };
    return Number(row.cnt);
  }

  async createUser(user: UserRecord): Promise<UserRecord> {
    this.db
      .prepare(
        `INSERT INTO users (id, username, display_name, email, password_hash, avatar_url, bio, website, verified, followers, following, saved_post_ids, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        user.id,
        user.username.toLowerCase(),
        user.displayName,
        user.email.toLowerCase(),
        user.passwordHash,
        user.avatarUrl,
        user.bio,
        user.website,
        user.verified ? 1 : 0,
        JSON.stringify(user.followers),
        JSON.stringify(user.following),
        JSON.stringify(user.savedPostIds),
        user.createdAt
      );
    return (await this.findUserById(user.id))!;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return this.mapUser(row);
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username) as
      | Record<string, unknown>
      | undefined;
    return this.mapUser(row);
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as
      | Record<string, unknown>
      | undefined;
    return this.mapUser(row);
  }

  async listUsers(search?: string): Promise<UserRecord[]> {
    const rows = search?.trim()
      ? (this.db
          .prepare(
            'SELECT * FROM users WHERE LOWER(username) LIKE ? OR LOWER(display_name) LIKE ? ORDER BY created_at DESC LIMIT 30'
          )
          .all(`%${search.trim().toLowerCase()}%`, `%${search.trim().toLowerCase()}%`) as Record<
          string,
          unknown
        >[])
      : (this.db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 30').all() as Record<
          string,
          unknown
        >[]);
    return rows.map((r) => this.mapUser(r)!).filter(Boolean);
  }

  async updateUserProfile(
    userId: string,
    patch: Partial<Pick<UserRecord, 'displayName' | 'bio' | 'website' | 'avatarUrl'>>
  ): Promise<UserRecord | null> {
    const current = await this.findUserById(userId);
    if (!current) return null;
    this.db
      .prepare('UPDATE users SET display_name = ?, bio = ?, website = ?, avatar_url = ? WHERE id = ?')
      .run(
        patch.displayName ?? current.displayName,
        patch.bio ?? current.bio,
        patch.website ?? current.website,
        patch.avatarUrl ?? current.avatarUrl,
        userId
      );
    return this.findUserById(userId);
  }

  async toggleFollow(
    followerId: string,
    targetUserId: string
  ): Promise<{ following: boolean; followersCount: number }> {
    const follower = await this.findUserById(followerId);
    const target = await this.findUserById(targetUserId);
    if (!follower || !target) throw new Error('User not found');

    const already = target.followers.includes(followerId);
    const nextTargetFollowers = already
      ? target.followers.filter((id) => id !== followerId)
      : [...new Set([...target.followers, followerId])];
    const nextFollowerFollowing = already
      ? follower.following.filter((id) => id !== targetUserId)
      : [...new Set([...follower.following, targetUserId])];

    this.db
      .prepare('UPDATE users SET followers = ? WHERE id = ?')
      .run(JSON.stringify(nextTargetFollowers), targetUserId);
    this.db
      .prepare('UPDATE users SET following = ? WHERE id = ?')
      .run(JSON.stringify(nextFollowerFollowing), followerId);

    return { following: !already, followersCount: nextTargetFollowers.length };
  }

  async toggleSavePost(userId: string, postId: string): Promise<{ saved: boolean }> {
    const user = await this.findUserById(userId);
    if (!user) throw new Error('User not found');
    const already = user.savedPostIds.includes(postId);
    const nextSaved = already
      ? user.savedPostIds.filter((id) => id !== postId)
      : [...new Set([postId, ...user.savedPostIds])];
    this.db
      .prepare('UPDATE users SET saved_post_ids = ? WHERE id = ?')
      .run(JSON.stringify(nextSaved), userId);
    return { saved: !already };
  }

  async createPost(post: PostRecord): Promise<PostRecord> {
    this.db
      .prepare(
        `INSERT INTO posts (id, user_id, media_url, media_kind, caption, alt_text, location, tags, likes, content_warning, guardrail_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        post.id,
        post.userId,
        post.mediaUrl,
        post.mediaKind,
        post.caption,
        post.altText,
        post.location,
        JSON.stringify(post.tags),
        JSON.stringify(post.likes),
        post.contentWarning,
        post.guardrailStatus,
        post.createdAt
      );
    return post;
  }

  async findPostById(id: string): Promise<PostRecord | null> {
    const row = this.db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.mapPost(row) : null;
  }

  async deletePost(id: string): Promise<boolean> {
    const info = this.db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    return Number(info.changes) > 0;
  }

  private async hydratePosts(posts: PostRecord[], viewerId?: string | null): Promise<PostView[]> {
    const allUsers = await this.listUsers();
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const viewer = viewerId ? userMap.get(viewerId) ?? (await this.findUserById(viewerId)) : null;

    const views: PostView[] = [];
    for (const post of posts) {
      const author = userMap.get(post.userId) ?? (await this.findUserById(post.userId));
      if (!author) continue;

      const commentRows = this.db
        .prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC')
        .all(post.id) as Record<string, unknown>[];

      const comments: CommentView[] = [];
      for (const c of commentRows) {
        const cAuthor = userMap.get(String(c.user_id)) ?? (await this.findUserById(String(c.user_id)));
        if (!cAuthor) continue;
        comments.push({
          id: String(c.id),
          postId: String(c.post_id),
          userId: String(c.user_id),
          text: String(c.text),
          createdAt: String(c.created_at),
          author: this.authorSnippet(cAuthor),
        });
      }

      views.push({
        ...post,
        author: this.authorSnippet(author),
        likesCount: post.likes.length,
        commentsCount: comments.length,
        isLiked: viewerId ? post.likes.includes(viewerId) : false,
        isSaved: viewer ? viewer.savedPostIds.includes(post.id) : false,
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
    const rows = this.db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all() as Record<
      string,
      unknown
    >[];
    let posts = rows.map((r) => this.mapPost(r));

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
      ? post.likes.filter((id) => id !== userId)
      : [...new Set([...post.likes, userId])];
    this.db.prepare('UPDATE posts SET likes = ? WHERE id = ?').run(JSON.stringify(nextLikes), postId);
    return { liked: !already, likesCount: nextLikes.length };
  }

  async addComment(comment: CommentRecord): Promise<CommentView> {
    this.db
      .prepare('INSERT INTO comments (id, post_id, user_id, text, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(comment.id, comment.postId, comment.userId, comment.text, comment.createdAt);
    const author = await this.findUserById(comment.userId);
    if (!author) throw new Error('Author not found');
    return { ...comment, author: this.authorSnippet(author) };
  }

  async deleteComment(commentId: string, requesterId: string): Promise<boolean> {
    const row = this.db.prepare('SELECT user_id FROM comments WHERE id = ?').get(commentId) as
      | { user_id: string }
      | undefined;
    if (!row) return false;
    if (row.user_id !== requesterId) throw new Error('FORBIDDEN');
    const info = this.db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    return Number(info.changes) > 0;
  }

  async createStory(story: StoryRecord): Promise<StoryRecord> {
    this.db
      .prepare(
        'INSERT INTO stories (id, user_id, media_url, caption, viewed_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        story.id,
        story.userId,
        story.mediaUrl,
        story.caption,
        JSON.stringify(story.viewedBy),
        story.createdAt,
        story.expiresAt
      );
    return story;
  }

  async listActiveStoryGroups(viewerId?: string | null): Promise<StoryGroupView[]> {
    const nowIso = new Date().toISOString();
    const rows = this.db
      .prepare('SELECT * FROM stories WHERE expires_at > ? ORDER BY created_at DESC')
      .all(nowIso) as Record<string, unknown>[];

    const grouped = new Map<string, StoryRecord[]>();
    for (const r of rows) {
      const s: StoryRecord = {
        id: String(r.id),
        userId: String(r.user_id),
        mediaUrl: String(r.media_url),
        caption: String(r.caption),
        viewedBy: parseJsonArray(r.viewed_by),
        createdAt: String(r.created_at),
        expiresAt: String(r.expires_at),
      };
      const arr = grouped.get(s.userId) ?? [];
      arr.push(s);
      grouped.set(s.userId, arr);
    }

    const result: StoryGroupView[] = [];
    for (const [uid, stories] of grouped.entries()) {
      const author = await this.findUserById(uid);
      if (!author) continue;
      const mapped = stories.map((s) => ({
        ...s,
        isViewed: viewerId ? s.viewedBy.includes(viewerId) : false,
      }));
      result.push({
        author: this.authorSnippet(author),
        hasUnseen: mapped.some((s) => !s.isViewed),
        stories: mapped,
      });
    }
    return result;
  }

  async markStoryViewed(storyId: string, viewerId: string): Promise<void> {
    const row = this.db.prepare('SELECT viewed_by FROM stories WHERE id = ?').get(storyId) as
      | { viewed_by: string }
      | undefined;
    if (!row) return;
    const viewed = parseJsonArray(row.viewed_by);
    if (!viewed.includes(viewerId)) {
      viewed.push(viewerId);
      this.db.prepare('UPDATE stories SET viewed_by = ? WHERE id = ?').run(JSON.stringify(viewed), storyId);
    }
  }

  async createMessage(msg: MessageRecord): Promise<MessageRecord> {
    this.db
      .prepare(
        'INSERT INTO messages (id, sender_id, recipient_id, text, read, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(msg.id, msg.senderId, msg.recipientId, msg.text, msg.read ? 1 : 0, msg.createdAt);
    return msg;
  }

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE sender_id = ? OR recipient_id = ? ORDER BY created_at DESC')
      .all(userId, userId) as Record<string, unknown>[];

    const byPartner = new Map<string, { last: MessageRecord; unread: number }>();
    for (const r of rows) {
      const msg: MessageRecord = {
        id: String(r.id),
        senderId: String(r.sender_id),
        recipientId: String(r.recipient_id),
        text: String(r.text),
        read: Boolean(r.read),
        createdAt: String(r.created_at),
      };
      const partnerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      const existing = byPartner.get(partnerId);
      const isUnread = msg.recipientId === userId && !msg.read ? 1 : 0;
      if (!existing) {
        byPartner.set(partnerId, { last: msg, unread: isUnread });
      } else {
        existing.unread += isUnread;
      }
    }

    const out: ConversationSummary[] = [];
    for (const [partnerId, info] of byPartner.entries()) {
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
    const rows = this.db
      .prepare(
        `SELECT * FROM messages
         WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
         ORDER BY created_at ASC`
      )
      .all(userId, partnerId, partnerId, userId) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      senderId: String(r.sender_id),
      recipientId: String(r.recipient_id),
      text: String(r.text),
      read: Boolean(r.read),
      createdAt: String(r.created_at),
    }));
  }

  async markThreadRead(userId: string, partnerId: string): Promise<void> {
    this.db
      .prepare('UPDATE messages SET read = 1 WHERE recipient_id = ? AND sender_id = ?')
      .run(userId, partnerId);
  }

  async createNotification(note: NotificationRecord): Promise<NotificationRecord> {
    this.db
      .prepare(
        'INSERT INTO notifications (id, user_id, actor_id, type, post_id, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        note.id,
        note.userId,
        note.actorId,
        note.type,
        note.postId,
        note.message,
        note.read ? 1 : 0,
        note.createdAt
      );
    return note;
  }

  async listNotifications(userId: string): Promise<NotificationView[]> {
    const rows = this.db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 40')
      .all(userId) as Record<string, unknown>[];

    const out: NotificationView[] = [];
    for (const r of rows) {
      const actor = await this.findUserById(String(r.actor_id));
      if (!actor) continue;
      out.push({
        id: String(r.id),
        userId: String(r.user_id),
        actorId: String(r.actor_id),
        type: String(r.type) as NotificationRecord['type'],
        postId: r.post_id ? String(r.post_id) : null,
        message: String(r.message),
        read: Boolean(r.read),
        createdAt: String(r.created_at),
        actor: this.authorSnippet(actor),
      });
    }
    return out;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    this.db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
  }

  async createReport(report: ReportRecord): Promise<ReportRecord> {
    this.db
      .prepare(
        'INSERT INTO reports (id, post_id, reporter_id, reason, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        report.id,
        report.postId,
        report.reporterId,
        report.reason,
        report.details,
        report.status,
        report.createdAt
      );
    return report;
  }

  async listReports(): Promise<ReportRecord[]> {
    const rows = this.db.prepare('SELECT * FROM reports ORDER BY created_at DESC').all() as Record<
      string,
      unknown
    >[];
    return rows.map((r) => ({
      id: String(r.id),
      postId: String(r.post_id),
      reporterId: String(r.reporter_id),
      reason: String(r.reason) as ReportRecord['reason'],
      details: String(r.details),
      status: String(r.status) as ReportRecord['status'],
      createdAt: String(r.created_at),
    }));
  }

  async getCreatorStats(userId: string): Promise<CreatorStats | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;

    const userPosts = (
      this.db.prepare('SELECT * FROM posts WHERE user_id = ?').all(userId) as Record<string, unknown>[]
    ).map((r) => this.mapPost(r));

    let totalLikes = 0;
    let totalComments = 0;
    let cleanPosts = 0;
    let flaggedPosts = 0;
    const tagCounts = new Map<string, number>();

    for (const p of userPosts) {
      totalLikes += p.likes.length;
      const cntRow = this.db.prepare('SELECT COUNT(*) AS cnt FROM comments WHERE post_id = ?').get(p.id) as {
        cnt: number;
      };
      totalComments += Number(cntRow.cnt);
      if (p.guardrailStatus === 'flagged') flaggedPosts++;
      else cleanPosts++;
      for (const t of p.tags) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }

    const postIds = userPosts.map((p) => p.id);
    const reports = await this.listReports();
    const openReportsAgainstUser = reports.filter(
      (r) => r.status === 'open' && postIds.includes(r.postId)
    ).length;

    const followerBase = Math.max(user.followers.length, 1);
    const totalReach = userPosts.length * 140 + totalLikes * 12 + totalComments * 18;
    const engagementRate =
      userPosts.length > 0
        ? Number((((totalLikes + totalComments) / (userPosts.length * followerBase)) * 100).toFixed(1))
        : 0;

    return {
      totalPosts: userPosts.length,
      totalLikes,
      totalComments,
      totalReach,
      engagementRate,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      guardrailHealth: {
        cleanPosts,
        flaggedPosts,
        openReportsAgainstUser,
      },
      topTags: [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag, count]) => ({ tag, count })),
    };
  }
}
