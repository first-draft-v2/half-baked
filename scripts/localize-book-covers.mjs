import fs from "node:fs/promises";
import path from "node:path";

const root = new URL("../", import.meta.url);
const booksDirectory = new URL("../lists/books/", import.meta.url);
const coversDirectory = new URL("../images/books/", import.meta.url);

const frontMatterValue = (source, key) => {
  const match = source.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
  return match?.[1]?.replace(/^["']|["']$/g, "");
};

const withCover = (source, cover) => {
  const line = `cover: "${cover}"`;
  if (/^cover:/m.test(source)) return source.replace(/^cover:.*$/m, line);

  const anchor = source.match(/^(author|title):.*$/m);
  if (!anchor) return source;
  return source.replace(anchor[0], `${anchor[0]}\n${line}`);
};

const fetchWithRetry = async (url, attempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Half-baked personal book archive" },
      });
      if (response.ok) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
  throw lastError;
};

const extensionFor = (contentType) => {
  if (contentType.includes("avif")) return ".avif";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
};

await fs.mkdir(coversDirectory, { recursive: true });

const results = [];
const files = (await fs.readdir(booksDirectory))
  .filter((file) => file.endsWith(".md"))
  .sort();

for (const file of files) {
  const slug = path.basename(file, ".md");
  const fileUrl = new URL(file, booksDirectory);
  let source = await fs.readFile(fileUrl, "utf8");
  const cover = frontMatterValue(source, "cover");
  const isbn = frontMatterValue(source, "isbn");
  const coverId = frontMatterValue(source, "openlibrary_cover_id");

  if (cover?.startsWith("/images/books/")) {
    const currentUrl = new URL(`.${cover}`, root);
    const extension = path.extname(cover);
    const destinationUrl = new URL(`${slug}${extension}`, coversDirectory);
    if (currentUrl.pathname !== destinationUrl.pathname) {
      try {
        await fs.access(destinationUrl);
      } catch {
        await fs.rename(currentUrl, destinationUrl);
      }
      source = withCover(source, `/images/books/${slug}${extension}`);
      await fs.writeFile(fileUrl, source);
    }
    results.push({ file, status: "kept-local" });
    continue;
  }

  const candidates = [
    cover?.startsWith("http") ? cover : undefined,
    coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false` : undefined,
    isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : undefined,
  ].filter(Boolean);

  let localized = false;
  const errors = [];
  for (const url of candidates) {
    try {
      const response = await fetchWithRetry(url);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) throw new Error(`Unexpected content type: ${contentType}`);

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1000) throw new Error(`Image is only ${bytes.length} bytes`);

      const extension = extensionFor(contentType);
      const destinationUrl = new URL(`${slug}${extension}`, coversDirectory);
      await fs.writeFile(destinationUrl, bytes);
      source = withCover(source, `/images/books/${slug}${extension}`);
      await fs.writeFile(fileUrl, source);
      results.push({ bytes: bytes.length, file, source: url, status: "downloaded" });
      localized = true;
      break;
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }

  if (!localized) results.push({ errors, file, status: "unavailable" });
}

console.log(JSON.stringify(results, null, 2));
