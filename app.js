import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import { join } from "path";
import crypto from "crypto";

const DATA_FILE = join("data", "links.json");

const serveFile = async (res, filePath, contentType) => {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>Page Not Found</h1>");
  }
};

const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
  console.log(req.method, req.url);

  // ---------- GET ----------
  if (req.method === "GET") {

    if (req.url === "/") {
      return serveFile(res, join("public", "index.html"), "text/html");
    }

    if (req.url === "/style.css") {
      return serveFile(res, join("public", "style.css"), "text/css");
    }

    if (req.url === "/links") {
      const links = await loadLinks();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(links));
    }

    //  REDIRECT LOGIC
    const links = await loadLinks();
    const shortCode = req.url.slice(1);

    if (links[shortCode]) {
      res.writeHead(302, { Location: links[shortCode] });
      return res.end();
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Short URL not found");
  }

  // ---------- POST ----------
  if (req.method === "POST" && req.url === "/shorten") {

    let body = "";

    req.on("data", chunk => body += chunk);

    req.on("end", async () => {
      const { url, shortCode } = JSON.parse(body);

      if (!url) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("URL is required");
      }

      const links = await loadLinks();

      const finalShortCode =
        shortCode || crypto.randomBytes(4).toString("hex");

      if (links[finalShortCode]) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("Short code already exists");
      }

      // auto add https
      let finalUrl = url.trim();

// basic validation
if (!finalUrl.includes(".")) {
  res.writeHead(400, { "Content-Type": "text/plain" });
  return res.end("Please enter a valid URL (e.g. google.com)");
}

// remove spaces
finalUrl = finalUrl.replace(/\s/g, "");

// add https if missing
if (!finalUrl.startsWith("http")) {
  finalUrl = "https://" + finalUrl;
}

      links[finalShortCode] = finalUrl;

      await saveLinks(links);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        shortCode: finalShortCode
      }));
    });
  }
});

const port = process.env.PORT || 3002;

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
