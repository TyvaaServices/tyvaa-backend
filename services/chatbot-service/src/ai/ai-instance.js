'use strict';

/**
 * @fileoverview Initializes and configures the Genkit AI instance.
 * Exports a single `ai` instance for use throughout the application.
 */

const {genkit} = require('genkit');
const {googleAI, gemini20FlashExp} = require('@genkit-ai/googleai'); // Update to gemini-2.0-flash

const plugins = [];

if (process.env.GOOGLE_API_KEY) {
    plugins.push(googleAI({apiVersion: ['v1', 'v1beta']}));
} else {
    console.warn(
        'GOOGLE_API_KEY environment variable not found. Google AI plugin will not be available.'
    );
}

const ai = genkit({
    plugins: plugins,
    logLevel: 'debug',
    enableTracingAndMetrics: true,
    model: gemini20FlashExp
});

module.exports = {ai};
