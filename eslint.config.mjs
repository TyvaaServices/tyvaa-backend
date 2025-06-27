import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default defineConfig([
    globalIgnores([
        "**/node_modules/",
        "**/dist/",
        "**/coverage/",
        "**/logs/",
        "**/infra/",
        "**/.github/",
        "**/tests/",
    ]),
    {
        extends: compat.extends("plugin:prettier/recommended"),

        plugins: {
            prettier,
        },

        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },

            ecmaVersion: "latest",
            sourceType: "module",
        },

        rules: {
            "prettier/prettier": "warn",
            "no-unused-vars": "warn",
            "no-console": "warn",
            semi: ["warn", "always"],

            quotes: [
                "warn",
                "double",
                {
                    avoidEscape: true,
                    allowTemplateLiterals: true,
                },
            ],

            camelcase: "off",
            "no-process-exit": "off",
            radix: ["warn", "as-needed"],
        },
    },
]);
