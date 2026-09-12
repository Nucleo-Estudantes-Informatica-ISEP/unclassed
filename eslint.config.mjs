import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  eslintConfigPrettier,
  {
    files: ["*.config.js", "*.config.mjs", "eslint.config.mjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    ignores: [
      "src/application/repositories/**",
      "src/lib/prisma.ts",
      "src/services/cron/**",
      "prisma/**",
      "scripts/**"
    ],
    rules: {
      "no-restricted-imports": "off",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              message: "Prisma client must only be imported within application/repositories/",
              allowTypeImports: true,
            },
            {
              name: "@/lib/prisma",
              message: "Prisma client must only be imported within application/repositories/",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];

export default config;
