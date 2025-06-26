import {
    afterAll,
    beforeAll,
    describe,
    expect,
    jest,
    test,
} from "@jest/globals";
import fastify from "fastify";
import chatbotRoutes from "../../src/modules/chatbot-module/routes/chatbotRoutes.js";

process.env.NODE_ENV = "test";

describe("Chatbot Routes", () => {
    let app;

    beforeAll(async () => {
        app = fastify();
        app.register(chatbotRoutes, { prefix: "/api/support" });
        await app.ready();
    });

    afterAll(() => app.close());

    test("POST /chat - valid input", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/support/chatbot",
            payload: {
                message: "Hello",
                personality: "f",
            },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toHaveProperty("reply");
        expect(typeof response.json().reply).toBe("string");
    });

    test("POST /chat - invalid input", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/support/chatbot",
            payload: {
                personality: "x",
            },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty("error", "Bad Request");
        if ("issues" in response.json()) {
            expect(Array.isArray(response.json().issues)).toBe(true);
        }
    });
    test("POST /chat - missing personality", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/support/chatbot",
            payload: {
                message: "How are you?",
            },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty("error", "Bad Request");
    });
    test("POST /chat - missing message", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/support/chatbot",
            payload: {
                personality: "f",
            },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty("error", "Bad Request");
    });
    test("POST /chat - empty payload", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/support/chatbot",
            payload: {},
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty("error", "Bad Request");
    });
    test("GET /chat - method not allowed", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/api/support/chatbot",
        });
        expect(response.statusCode).toBe(404);
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });
});
