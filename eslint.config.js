import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";

// Flat config
import tseslintParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist", "node_modules", "coverage"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
      parser: tseslintParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
