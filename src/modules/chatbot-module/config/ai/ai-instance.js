"use strict";

/**
 * @fileoverview Initializes and configures the Genkit AI instance.
 * Exports a single `ai` instance for use throughout the application.
 */

import { genkit } from "genkit";
import { gemini20FlashExp, googleAI } from "@genkit-ai/googleai";
import dotenv from "dotenv";

dotenv.config();
const plugins = [];

const ai = (() => {
    if (process.env.NODE_ENV === "test") {
        return {
            definePrompt: () => ({
                __prompting: (_input) =>
                    Promise.resolve({
                        output: {
                            response: "This is a mock response for testing.",
                        },
                    }),
            }),
            defineFlow: (config, handler) => {
                return async (input) => {
                    if (process.env.NODE_ENV === "test") {
                        return {
                            response: "This is a mock response for testing.",
                        };
                    }
                    return handler(input);
                };
            },
        };
    } else {
        if (process.env.GOOGLE_API_KEY) {
            plugins.push(googleAI({ apiVersion: ["v1", "v1beta"] }));
        } else {
            // console.warn(
            //     "GOOGLE_API_KEY environment variable not found. Google AI plugin will not be available."
            // );
        }
        return genkit({
            plugins,
            logLevel: "debug",
            enableTracingAndMetrics: true,
            model: gemini20FlashExp,
        });
    }
})();

export { ai };
