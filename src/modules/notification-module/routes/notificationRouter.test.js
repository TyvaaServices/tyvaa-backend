const fastify = require('fastify');
const notificationRouter = require('./notificationRouter');

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({
    send: jest.fn().mockResolvedValue('mocked-response'),
  }),
}));

describe('Notification Router', () => {
  let app;
  beforeAll(async () => {
    app = fastify();
    app.register(notificationRouter);
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it('POST /send-notification should send notification with valid data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/send-notification',
      payload: {
        token: 'test-token',
        title: 'Test',
        body: 'Hello',
        data: { foo: 'bar' },
      },
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'Notification sent' });
  });

  it('POST /send-notification should return 400 if required fields are missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/send-notification',
      payload: {
        title: 'Test',
        body: 'Hello',
      },
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload)).toEqual({ error: 'Missing required fields' });
  });
});

