'use strict';

/**
 * @fileoverview Initializes and configures the Genkit AI instance.
 * Exports a single `ai` instance for use throughout the application.
 */

const {genkit} = require('genkit');
const {googleAI, gemini20FlashExp} = require('@genkit-ai/googleai'); // Update to gemini-2.0-flash

const plugins = [];

// Create a mock AI instance for tests
let ai;

if (process.env.NODE_ENV === 'test') {
    console.warn('Running in test mode. Skipping Google AI plugin initialization.');
    ai = {
        definePrompt: () => ({
            __prompting: (input) => Promise.resolve({output: {response: "This is a mock response for testing."}})
        }),
        defineFlow: (config, handler) => {
            return async (input) => {
                if (process.env.NODE_ENV === 'test') {
                    return {response: "This is a mock response for testing."};
                }
                return handler(input);
            };
        }
    };
} else {
    if (process.env.GOOGLE_API_KEY) {
        plugins.push(googleAI({apiVersion: ['v1', 'v1beta']}));
    } else {
        console.warn(
            'GOOGLE_API_KEY environment variable not found. Google AI plugin will not be available.'
        );
    }

    ai = genkit({
        plugins: plugins,
        logLevel: 'debug',
        enableTracingAndMetrics: true,
        model: gemini20FlashExp
    });
}

module.exports = {ai};
