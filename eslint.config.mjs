import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Règles d'architecture : chaque couche n'appelle que la suivante (voir .claude/rules/).
  {
    files: ["src/app/**", "src/presentation/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/data/*"], message: "Présentation : passe par un service, jamais par @/data." },
      ] }],
    },
  },
  {
    files: ["src/services/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/presentation/*", "react", "react-dom", "next", "next/*"], message: "Service : ne dépend pas de l'interface." },
      ] }],
    },
  },
  {
    files: ["src/data/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/services/*", "@/presentation/*"], message: "Données : ne dépend d'aucune autre couche." },
      ] }],
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
