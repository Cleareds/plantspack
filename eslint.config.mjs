// ESLint 9 flat config. `next lint` was removed in Next 16; `npm run lint`
// now runs the ESLint CLI directly with the flat exports of eslint-config-next.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".vercel/**",
      "out/**",
      "build/**",
      "dist/**",
      ".cache/**",
      // Separate projects with their own lint setup.
      "mobileapp/**",
      "mobileapp-archive/**",
      "performance/**",
      "gpt_support/**",
      // One-off data scripts and generated files are not app code.
      "scripts/**",
      "docs/**",
      "backups/**",
      "reports/**",
      "public/**",
      "next-env.d.ts",
      "src/shared/database.types.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/alt-text": "warn",
    },
  },
];

export default eslintConfig;
