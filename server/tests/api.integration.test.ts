import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createRepository } from '../src/db/index.js';
import { DataRepository } from '../src/db/repository.js';

describe('FrameNew Full-Stack API Integration', () => {
  let repo: DataRepository;
  let uploadDir: string;
  let app: ReturnType<typeof createApp>;
  let authToken: string;

  beforeAll(async () => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'framenew-uploads-'));
    repo = await createRepository({ sqlitePath: ':memory:' });
    app = createApp({ repo, uploadDir });
  });

  afterAll(async () => {
    await repo.close();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  it('exposes health check and seeded feed', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);
    expect(health.body.driver).toBe('sqlite');

    const feed = await request(app).get('/api/posts');
    expect(feed.status).toBe(200);
    expect(feed.body.posts.length).toBeGreaterThanOrEqual(5);
  });

  it('registers a new user, blocks duplicate username, and enforces JWT auth', async () => {
    const unauthed = await request(app).get('/api/auth/me');
    expect(unauthed.status).toBe(401);

    const reg = await request(app).post('/api/auth/register').send({
      username: 'elena_studio',
      displayName: 'Elena Vance',
      email: 'elena@framenew.example',
      password: 'StrongPassword2026!',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    expect(reg.body.user.username).toBe('elena_studio');
    authToken = reg.body.token;

    const dup = await request(app).post('/api/auth/register').send({
      username: 'elena_studio',
      displayName: 'Elena Vance',
      email: 'elena2@framenew.example',
      password: 'StrongPassword2026!',
    });
    expect(dup.status).toBe(409);
  });

  it('blocks XSS/secret leaks and forged image uploads via guardrails', async () => {
    const secretPost = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        mediaUrl: '/media/arches.jpg',
        caption: 'Check my token ghp_1234567890abcdef1234567890abcdef',
      });
    expect(secretPost.status).toBe(400);
    expect(secretPost.body.code).toBe('GUARDRAIL_SECRET_DETECTED');

    // Spoofed HTML payload disguised as JPEG
    const forgedUpload = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .field('caption', 'Forged payload test')
      .attach('media', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'evil.jpg',
        contentType: 'image/jpeg',
      });
    expect(forgedUpload.status).toBe(400);
    expect(forgedUpload.body.code).toBe('GUARDRAIL_INVALID_MEDIA');
  });

  it('completes end-to-end upload, like, comment, save, DM, report, stats, and delete flow', async () => {
    // 1. Valid PNG upload (magic bytes verified)
    const validPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const created = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .field('caption', 'Studio morning architecture #architecture #minimal')
      .field('location', 'Design Studio')
      .attach('media', validPng, { filename: 'studio.png', contentType: 'image/png' });
    expect(created.status).toBe(201);
    const postId = created.body.post.id;
    expect(created.body.post.mediaUrl).toMatch(/^\/uploads\/.+\.png$/);

    // 2. AI Caption & Alt-Text Assistant
    const aiResp = await request(app)
      .post('/api/ai/caption-assist')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ topic: 'minimalist courtyard shadows', mood: 'editorial' });
    expect(aiResp.status).toBe(200);
    expect(aiResp.body.guardrailPassed).toBe(true);
    expect(aiResp.body.altText.length).toBeGreaterThan(10);

    // 3. Like & Save
    const likeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(likeRes.status).toBe(200);
    expect(likeRes.body.liked).toBe(true);

    const saveRes = await request(app)
      .post(`/api/posts/${postId}/save`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.saved).toBe(true);

    // 4. Comment & HTML sanitization check
    const cmtRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: '<b>Clean</b> geometric light!' });
    expect(cmtRes.status).toBe(201);
    expect(cmtRes.body.comment.text).toBe('Clean geometric light!');

    // 5. Direct Message to Alex
    const dmRes = await request(app)
      .post('/api/messages/usr_alex')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: 'Great concrete study!' });
    expect(dmRes.status).toBe(201);

    // 6. Report flow on another post
    const rptRes = await request(app)
      .post('/api/posts/pst_arches/report')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'spam', details: 'Testing moderation report.' });
    expect(rptRes.status).toBe(201);

    // 7. Creator Stats
    const statsRes = await request(app)
      .get('/api/users/me/stats')
      .set('Authorization', `Bearer ${authToken}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.stats.totalPosts).toBe(1);
    expect(statsRes.body.stats.totalLikes).toBe(1);

    // 8. Delete own post (and reject deleting another user's post)
    const forbidDel = await request(app)
      .delete('/api/posts/pst_arches')
      .set('Authorization', `Bearer ${authToken}`);
    expect(forbidDel.status).toBe(403);

    const ownDel = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(ownDel.status).toBe(200);
    expect(ownDel.body.deleted).toBe(true);
  });

  it('enforces sliding-window rate limits with RateLimit headers and 429 status', async () => {
    const limitedApp = createApp({
      repo,
      uploadDir,
      rateLimitOptions: { authMax: 2 },
    });

    const r1 = await request(limitedApp).post('/api/auth/demo').send({ username: 'alex_rivera' });
    expect(r1.status).toBe(200);
    expect(r1.headers['ratelimit']).toBeDefined();

    const r2 = await request(limitedApp).post('/api/auth/demo').send({ username: 'alex_rivera' });
    expect(r2.status).toBe(200);

    const r3 = await request(limitedApp).post('/api/auth/demo').send({ username: 'alex_rivera' });
    expect(r3.status).toBe(429);
    expect(r3.body.code).toBe('RATE_LIMIT_AUTH');
  });
});
