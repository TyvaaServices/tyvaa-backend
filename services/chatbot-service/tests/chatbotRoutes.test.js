const fastify = require('fastify');
const chatbotRoutes = require('../src/routes/chatbotRoutes');

process.env.NODE_ENV = 'test';

describe('Chatbot Routes', () => {
    let app;

    beforeAll(async () => {
        app = fastify();
        app.register(chatbotRoutes, {prefix: '/api/support'});
        await app.ready();
    });

    afterAll(() => app.close());

    test('POST /chat - valid input', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/support/chat',
            payload: {
                message: 'Hello',
                personality: 'f',
            },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toHaveProperty('reply');
        expect(typeof response.json().reply).toBe('string');
    });

    test('POST /chat - invalid input', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/support/chat',
            payload: {
                personality: 'x',
            },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty('error', 'Validation Error');
        expect(response.json()).toHaveProperty('issues');
        expect(Array.isArray(response.json().issues)).toBe(true);
    });
    test('POST /chat - missing personality', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/support/chat',
            payload: {
                message: 'How are you?',
            },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty('error', 'Validation Error');
    });
    test('POST /chat - missing message', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/support/chat',
            payload: {
                personality: 'f',
            },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty('error', 'Validation Error');
    });
    test('POST /chat - empty payload', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/support/chat',
            payload: {},
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty('error', 'Validation Error');
    });
    test('GET /chat - method not allowed', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/support/chat',
        });
        expect(response.statusCode).toBe(404);
    });

});
