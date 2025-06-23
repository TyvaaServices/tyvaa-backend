import Fastify from 'fastify';
import {buildApp} from './../../src/app.js';
import {afterAll, beforeAll, describe, expect, it} from "@jest/globals";

describe('App integration', () => {
    let fastify;
    beforeAll(async () => {
        fastify = await buildApp();
    });
    afterAll(async () => {
        await fastify.close();
    });

    it('GET /health should return 200', async () => {
        const response = await fastify.inject({
            method: 'GET',
            url: '/health',
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toHaveProperty('status');
    });
});
