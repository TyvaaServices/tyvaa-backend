const fastify = require('fastify');
const app = fastify();

app.get('/health', async (request, reply) => {
  reply.send({ status: 'ok' });
});

describe('Health Check', () => {
  it('should return status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
  });
});

