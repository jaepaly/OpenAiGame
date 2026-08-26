import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/OpenAiGame/" : "/",
  plugins: [sites()],
  build: {
    outDir: mode === "pages" ? "dist-pages" : "dist",
    assetsDir: "static",
  },
}));
