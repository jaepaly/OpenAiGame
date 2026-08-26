import { mkdir, writeFile } from "node:fs/promises";

const serverDirectory = new URL("../dist/server/", import.meta.url);
const serverEntry = new URL("index.js", serverDirectory);

await mkdir(serverDirectory, { recursive: true });
await writeFile(
  serverEntry,
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    url.pathname = "/";
    return env.ASSETS.fetch(new Request(url, request));
  },
};
`,
);
