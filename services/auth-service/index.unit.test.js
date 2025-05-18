const fastify = require('fastify')();
const jwt = require('fastify-jwt');

fastify.register(jwt, { secret: 'testsecret' });

beforeAll(async () => {
  await fastify.ready();
});

describe('Auth Service Unit', () => {
  it('should generate a valid JWT token', async () => {
    const payload = { id: 1, phoneNumber: '1234567890' };
    const token = fastify.jwt.sign(payload);
    expect(typeof token).toBe('string');
    const decoded = fastify.jwt.verify(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.phoneNumber).toBe(payload.phoneNumber);
  });

  it('should throw error for invalid token', () => {
    expect(() => fastify.jwt.verify('invalid.token')).toThrow();
  });
});

