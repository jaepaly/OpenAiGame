import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/OpenAiGame/" : "/",
  plugins: [sites()],
  build: {
    outDir: mode === "pages" ? "dist-pages" : "dist",
    assetsDir: "static",
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        game: resolve(import.meta.dirname, "game.html"),
      },
    },
  },
}));
