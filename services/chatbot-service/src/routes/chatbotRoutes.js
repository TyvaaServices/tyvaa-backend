'use strict';

const {getSupportChatResponse} = require('../ai/flows/support-chat-flow'); // Adjust path as needed
const {z} = require('zod');
const {zodToJsonSchema} = require('zod-to-json-schema');

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
                reply: {type: 'string'},
            },
        },
        400: {
            description: 'Validation error',
            type: 'object',
            properties: {
                error: {type: 'string'},
                message: {type: 'string'},
                issues: {type: 'array', items: {type: 'object'}},
            },
        },
        500: {
            description: 'Internal error',
            type: 'object',
            properties: {
                error: {type: 'string'},
            },
        },
    },
};

async function chatbotRoutes(fastify, options) {
    fastify.post('/chat', {schema: chatSchema}, async (request, reply) => {
        try {
            const {message, personality, history} = request.body;

            const input = {
                userQuery: message,
                personality,
                history,
            };
            console.log(history);

            const output = await getSupportChatResponse(input);

            reply.code(200).send({reply: output.response});
        } catch (error) {
            if (error.name === 'ZodError') {
                reply.code(400).send({
                    error: 'Validation Error',
                    message: error.message,
                    issues: error.issues,
                });
            } else {
                reply.code(500).send({error: 'Failed to get response from chatbot.'});
            }
        }
    });
}

module.exports = chatbotRoutes;
