'use strict';

import { getSupportChatResponse } from '../config/ai/flows/support-chat-flow.js'; // Adjust path as needed
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const ChatRequestSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty.'),
    personality: z.enum(['f', 'm'], {
        errorMap: () => ({message: 'Personality must be either "f" or "m".'}),
    }),
    history: z
        .array(
            z.object({
                text: z.string().min(1, 'Text cannot be empty.'),
                isUserMessage: z.boolean(),
            })
        )
        .optional(),
});

const chatSchema = {
    description: 'Send a message to the support chatbot',
    tags: ['Chatbot'],
    summary: 'Get help and information about the RideShare Connect app',
    body: zodToJsonSchema(ChatRequestSchema, {name: 'ChatRequestBody'}),
    response: {
        200: {
            description: 'Successful chatbot reply',
            type: 'object',
            properties: {
                reply: { type: 'string' },
            },
        },
        400: {
            description: 'Invalid request',
            type: 'object',
            properties: {
                error: { type: 'string' },
            },
        },
        500: {
            description: 'Server error',
            type: 'object',
            properties: {
                error: { type: 'string' },
            },
        },
    },
};

export default async function (fastify, opts) {
    fastify.post('/chatbot', { schema: chatSchema }, async (request, reply) => {
        try {
            // Validate input schema manually
            const validationResult = ChatRequestSchema.safeParse(request.body);

            if (!validationResult.success) {
                return reply.code(400).send({
                    error: 'Validation Error',
                    message: 'Invalid input data',
                    issues: validationResult.error.issues
                });
            }

            const {message, personality, history} = request.body;

            const input = {
                userQuery: message,
                personality,
                history,
            };

            const output = await getSupportChatResponse(input);

            if (!output || !output.response) {
                throw new Error('Invalid response from chatbot flow.');
            }

            reply.code(200).send({reply: output.response});
        } catch (error) {
            console.error("Error in chatbot route:", error);

            if (error.name === 'ZodError') {
                reply.code(400).send({
                    error: 'Validation Error',
                    message: error.message,
                    issues: error.issues || []
                });
            } else {
                reply.code(500).send({
                    error: 'Failed to get response from chatbot.',
                    message: error.message || 'Internal server error'
                });
            }
        }
    });
}