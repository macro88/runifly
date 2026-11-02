import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// `typescript` is the TypeScript 6 API package (`@typescript/typescript6`).
// TypeScript 7.0 has no programmatic API, so typescript-eslint cannot import it.
// `tsc` on PATH is TypeScript 7 from `@typescript/native`.
export default tseslint.config(
  { ignores: ["dist"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ["**/*.{ts,tsx}"],
    ...reactRefresh.configs.vite,
  },
);
