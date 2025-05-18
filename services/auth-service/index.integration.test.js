const buildFastify = require('fastify');
const jwt = require('fastify-jwt');

function createApp() {
  const app = buildFastify();
  app.register(jwt, { secret: 'testsecret' });
  app.post('/api/v1/token', async (req, reply) => {
    const { id, phoneNumber } = req.body;
    const token = app.jwt.sign({ id, phoneNumber });
    return { token };
  });
  app.post('/api/v1/verify', async (req, reply) => {
    const { token } = req.body;
    try {
      const decoded = app.jwt.verify(token);
      return { valid: true, decoded };
    } catch (e) {
      return reply.status(401).send({ valid: false, error: 'Invalid token' });
    }
  });
  return app;
}

describe('Auth Service Integration', () => {
  let app;
  beforeAll(async () => {
    app = createApp();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/token should return a JWT token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/token',
      payload: { id: 1, phoneNumber: '1234567890' },
    });
    expect(response.statusCode).toBe(200);
    const { token } = JSON.parse(response.payload);
    expect(typeof token).toBe('string');
    const decoded = app.jwt.verify(token);
    expect(decoded.id).toBe(1);
    expect(decoded.phoneNumber).toBe('1234567890');
  });

  it('POST /api/v1/verify should validate a valid token', async () => {
    const token = app.jwt.sign({ id: 2, phoneNumber: '555' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      payload: { token },
    });
    expect(response.statusCode).toBe(200);
    const { valid, decoded } = JSON.parse(response.payload);
    expect(valid).toBe(true);
    expect(decoded.id).toBe(2);
    expect(decoded.phoneNumber).toBe('555');
  });

  it('POST /api/v1/verify should reject an invalid token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      payload: { token: 'invalid.token' },
    });
    expect(response.statusCode).toBe(401);
    const { valid, error } = JSON.parse(response.payload);
    expect(valid).toBe(false);
    expect(error).toBe('Invalid token');
  });
});

