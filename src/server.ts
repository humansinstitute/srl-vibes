const root = `${import.meta.dir}/..`;
const transpiler = new Bun.Transpiler({ loader: "ts" });

const PORT = process.env.PORT;
if (!PORT) {
  console.error("PORT environment variable is required");
  process.exit(1);
}

const server = Bun.serve({
  port: Number(PORT),
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    if (path === "/") path = "/index.html";

    const candidates = [
      `${root}${path}`,
      `${root}${path}/index.html`,
    ];

    for (const filePath of candidates) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const ext = filePath.split(".").pop() ?? "";

        // Transpile TypeScript on the fly for the browser
        if (ext === "ts") {
          const source = await file.text();
          const js = transpiler.transformSync(source);
          return new Response(js, {
            headers: { "Content-Type": "application/javascript" },
          });
        }

        const types: Record<string, string> = {
          html: "text/html",
          css: "text/css",
          js: "application/javascript",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          svg: "image/svg+xml",
          ico: "image/x-icon",
          json: "application/json",
          webmanifest: "application/manifest+json",
          webp: "image/webp",
          mp4: "video/mp4",
        };

        return new Response(file, {
          headers: { "Content-Type": types[ext] ?? "application/octet-stream" },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Vibe Group running on port ${server.port}`);
