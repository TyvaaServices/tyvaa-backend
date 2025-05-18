const fastify = require('fastify');
const proxy = require('@fastify/http-proxy');
const rateLimit = require('@fastify/rate-limit');

// Mock upstream services
function createMockService(response) {
  const app = fastify();
  app.get('/', async (req, reply) => reply.send(response));
  return app;
}

describe('Gateway Service Integration', () => {
  let gateway, userService, rideService, chatbotService;
  beforeAll(async () => {
    userService = createMockService({ user: 'mock-user' });
    rideService = createMockService({ ride: 'mock-ride' });
    chatbotService = createMockService({ chat: 'mock-chat' });
    await userService.listen({ port: 3101 });
    await rideService.listen({ port: 3102 });
    await chatbotService.listen({ port: 3103 });

    gateway = fastify();
    gateway.register(rateLimit, { max: 100, timeWindow: '1 minute' });
    gateway.register(proxy, {
      upstream: 'http://localhost:3103',
      prefix: '/support/chat',
      rewritePrefix: '/',
    });
    gateway.register(proxy, {
      upstream: 'http://localhost:3101',
      prefix: '/users',
      rewritePrefix: '/',
    });
    gateway.register(proxy, {
      upstream: 'http://localhost:3102',
      prefix: '/rides',
      rewritePrefix: '/',
    });
    await gateway.ready();
  });
  afterAll(async () => {
    await gateway.close();
    await userService.close();
    await rideService.close();
    await chatbotService.close();
  });

  it('should proxy /users to user service', async () => {
    const response = await gateway.inject({ method: 'GET', url: '/users' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ user: 'mock-user' });
  });

  it('should proxy /rides to ride service', async () => {
    const response = await gateway.inject({ method: 'GET', url: '/rides' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ ride: 'mock-ride' });
  });

  it('should proxy /support/chat to chatbot service', async () => {
    const response = await gateway.inject({ method: 'GET', url: '/support/chat' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ chat: 'mock-chat' });
  });
});

