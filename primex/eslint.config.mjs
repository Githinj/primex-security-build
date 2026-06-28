import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React 19 purity rules — these patterns are valid for data fetching hooks and prop syncing
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      // Allow `any` in data-mapping code (Supabase joins return untyped shapes)
      "@typescript-eslint/no-explicit-any": "warn",
      // Apostrophes in JSX text
      "react/no-unescaped-entities": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
