import { mkdir, readdir, rename, writeFile } from "node:fs/promises";

const distDirectory = new URL("../dist/", import.meta.url);
const assetsDirectory = new URL("assets/", distDirectory);
const serverDirectory = new URL("../dist/server/", import.meta.url);
const serverEntry = new URL("index.js", serverDirectory);

await mkdir(assetsDirectory, { recursive: true });
for (const entry of await readdir(distDirectory, { withFileTypes: true })) {
  if ([".openai", "assets", "server"].includes(entry.name)) continue;
  await rename(new URL(entry.name, distDirectory), new URL(entry.name, assetsDirectory));
}

await mkdir(serverDirectory, { recursive: true });
await writeFile(
  serverEntry,
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  },
};
`,
);
