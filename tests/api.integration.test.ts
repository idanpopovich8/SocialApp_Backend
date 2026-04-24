import request from 'supertest';
import mongoose from 'mongoose';
import type { Express } from 'express';
import dotenv from 'dotenv';
import MessageModel from '../src/models/message_model';

let app: Express;
jest.setTimeout(30000);

const registerAndLogin = async (suffix: string) => {
  const email = `it_${suffix}_${Date.now()}@example.com`;
  const password = 'Pass1234!';
  const fullName = `Integration ${suffix}`;

  const registerRes = await request(app).post('/api/auth/register').send({
    fullName,
    email,
    password,
  });
  expect(registerRes.status).toBe(201);

  const loginRes = await request(app).post('/api/auth/login').send({
    email,
    password,
  });
  expect(loginRes.status).toBe(200);
  return {
    userId: String(loginRes.body.id),
    accessToken: loginRes.body.accessToken as string,
    refreshToken: loginRes.body.refreshToken as string,
  };
};

describe('API integration', () => {
  beforeAll(async () => {
    dotenv.config();
    const sourceUri = process.env.MONGO_URI;
    if (!sourceUri) {
      throw new Error('MONGO_URI is required for integration tests');
    }
    const dbName = `socialapp_test_${Date.now()}`;
    const testUri = sourceUri.includes('/?')
      ? sourceUri.replace('/?', `/${dbName}?`)
      : `${sourceUri}/${dbName}`;

    process.env.NODE_ENV = 'test';
    process.env.MONGO_URI = testUri;
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.BASE_URL = 'http://localhost:5001/';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.AI_MOCK_MODE = 'true';

    const appModule = await import('../src/app');
    app = appModule.app;

    await new Promise<void>((resolve, reject) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
        return;
      }
      mongoose.connection.once('connected', () => resolve());
      mongoose.connection.once('error', reject);
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections;
      await Promise.all(
        Object.values(collections).map((collection) =>
          collection.deleteMany({}),
        ),
      );
      await mongoose.connection.close();
    }
  });

  it('serves swagger docs', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('auth flow works (register, login, refresh, logout)', async () => {
    const auth = await registerAndLogin('auth');

    const refreshRes = await request(app).post('/api/auth/refresh').send({
      refreshToken: auth.refreshToken,
    });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTruthy();
    expect(refreshRes.body.refreshToken).toBeTruthy();

    const logoutRes = await request(app).post('/api/auth/logout').send({
      refreshToken: refreshRes.body.refreshToken,
    });
    expect(logoutRes.status).toBe(200);
  });

  it('post/comment/like flow works', async () => {
    const auth = await registerAndLogin('post');

    const createPost = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({ content: 'Integration post content' });
    expect(createPost.status).toBe(201);
    expect(createPost.body.id).toBeTruthy();

    const postId = createPost.body.id as string;

    const createComment = await request(app)
      .post(`/api/comments/${postId}`)
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({ content: 'Integration comment' });
    expect(createComment.status).toBe(201);
    expect(createComment.body.id).toBeTruthy();

    const likeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${auth.accessToken}`);
    expect(likeRes.status).toBe(200);
    expect(typeof likeRes.body.likesCount).toBe('number');

    const listPosts = await request(app).get('/api/posts?limit=10&skip=0');
    expect(listPosts.status).toBe(200);
    expect(Array.isArray(listPosts.body.items)).toBe(true);
    expect(typeof listPosts.body.total).toBe('number');
    expect(typeof listPosts.body.hasMore).toBe('boolean');

    const getPost = await request(app).get(`/api/posts/${postId}`);
    expect(getPost.status).toBe(200);
    expect(getPost.body.id).toBe(postId);
  });

  it('user profile flow works (get and update me)', async () => {
    const auth = await registerAndLogin('profile');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${auth.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.id).toBe(auth.userId);

    const updateRes = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({ fullName: 'Updated Integration Name' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.fullName).toBe('Updated Integration Name');
  });

  it('conversation/message flow works including access control', async () => {
    const userA = await registerAndLogin('convA');
    const userB = await registerAndLogin('convB');
    const outsider = await registerAndLogin('convC');

    const createConversation = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ participantIds: [userB.userId] });
    expect(createConversation.status).toBe(201);
    const conversationId = createConversation.body.conversationId as string;

    const listConversations = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(listConversations.status).toBe(200);

    const conversationDetails = await request(app)
      .get(`/api/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(conversationDetails.status).toBe(200);

    const message = await MessageModel.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      senderId: new mongoose.Types.ObjectId(userA.userId),
      content: 'Integration message',
    });

    const getMessages = await request(app)
      .get(`/api/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(getMessages.status).toBe(200);
    expect(Array.isArray(getMessages.body.messages)).toBe(true);

    const getMessage = await request(app)
      .get(`/api/messages/${message._id.toString()}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(getMessage.status).toBe(200);

    const outsiderGetMessage = await request(app)
      .get(`/api/messages/${message._id.toString()}`)
      .set('Authorization', `Bearer ${outsider.accessToken}`);
    expect(outsiderGetMessage.status).toBe(403);

    const editMessage = await request(app)
      .put(`/api/messages/${message._id.toString()}`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ content: 'Updated integration message' });
    expect(editMessage.status).toBe(200);

    const deleteMessage = await request(app)
      .delete(`/api/messages/${message._id.toString()}`)
      .set('Authorization', `Bearer ${userA.accessToken}`);
    expect(deleteMessage.status).toBe(200);
  });

  it('ai post assist returns structured suggestion', async () => {
    const auth = await registerAndLogin('aiAssist');

    const aiRes = await request(app)
      .post('/api/ai/post-assist')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({
        draft:
          'שלום אני מחפש המלצה ללפטופ ללימודים עם סוללה טובה ותקציב מוגבל ל-3000 שקלים',
        intent: 'help-request',
        tone: 'friendly',
      });

    expect(aiRes.status).toBe(200);
    expect(aiRes.body.message).toBe('AI suggestion generated');
    expect(aiRes.body.data).toBeTruthy();
    expect(typeof aiRes.body.data.originalText).toBe('string');
    expect(typeof aiRes.body.data.improvedText).toBe('string');
    expect(Array.isArray(aiRes.body.data.hashtags)).toBe(true);
  });
});
