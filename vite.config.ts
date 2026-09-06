import { sites } from "@openai/sites-vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import ultraciteCore from "ultracite/oxlint/core";
import ultraciteReact from "ultracite/oxlint/react";
import ultraciteTanstack from "ultracite/oxlint/tanstack";
import ultraciteVitest from "ultracite/oxlint/vitest";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  fmt: {
    arrowParens: "always",
    bracketSameLine: false,
    bracketSpacing: true,
    endOfLine: "lf",
    ignorePatterns: ["**/dist", "**/node_modules", "**/*.gen.*"],
    jsxSingleQuote: false,
    printWidth: 80,
    proseWrap: "never",
    quoteProps: "as-needed",
    semi: true,
    singleQuote: false,
    sortImports: false,
    sortPackageJson: true,
    tabWidth: 2,
    trailingComma: "es5",
    useTabs: false,
  },
  lint: {
    extends: [
      ultraciteCore,
      ultraciteReact,
      ultraciteTanstack,
      ultraciteVitest,
    ],
    ignorePatterns: [
      ...(ultraciteCore.ignorePatterns ?? []),
      "**/routeTree.gen.ts",
      "public/**",
      "tests/browser/**",
    ],
    options: { typeAware: true, typeCheck: true },
    rules: {
      "func-style": "off",
      "react/function-component-definition": "off",
      "react/todo": "off",
      "sort-keys": "off",
    },
  },
  plugins: lazyPlugins(() => [
    tanstackStart({
      spa: { enabled: true, prerender: { outputPath: "/index" } },
    }),
    sites(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "paw-trends-amstaff.png"],
      manifest: {
        name: "Paw Trends",
        short_name: "Paw Trends",
        description:
          "Private dog trigger and wellness notes stored on this device.",
        display: "standalone",
        start_url: "/",
        theme_color: "#22443a",
        background_color: "#f6f1e7",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ]),
  resolve: { tsconfigPaths: true },
  staged: { "*": "vp check --fix" },
  test: {
    environment: "jsdom",
    exclude: ["tests/browser/**"],
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/paw-trends-test-setup.ts"],
  },
});
