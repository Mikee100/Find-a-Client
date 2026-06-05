import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];