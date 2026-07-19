import fs from "node:fs/promises";
import path from "node:path";

const booksDirectory = new URL("../lists/books/", import.meta.url);
const writeChanges = process.argv.includes("--write");
const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
const limit = limitArgument ? Number(limitArgument.split("=")[1]) : Infinity;

const normalize = (value = "") => value
  .normalize("NFKD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase()
  .replace(/&/g, "and")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const normalizeTitle = (value = "") => normalize(value.replace(/\s*\([^)]*\)\s*$/g, ""));
const cleanIsbn = (value) => String(value || "").replace(/[\s-]/g, "").toUpperCase();
const isIsbn = (value) => /^(?:(?:978|979)\d{10}|\d{9}[\dX])$/.test(cleanIsbn(value));

const similarity = (left, right) => {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    const leftLength = normalizedLeft.split(" ").length;
    const rightLength = normalizedRight.split(" ").length;
    return 0.72 + (0.23 * (Math.min(leftLength, rightLength) / Math.max(leftLength, rightLength)));
  }

  const leftTokens = new Set(normalizedLeft.split(" "));
  const rightTokens = new Set(normalizedRight.split(" "));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / new Set([...leftTokens, ...rightTokens]).size;
};

const scoreBook = (book, candidate) => {
  const titleScore = similarity(normalizeTitle(book.title), normalizeTitle(candidate.title));
  const authorScore = Math.max(
    0,
    ...(book.author_name || []).map((author) => similarity(author, candidate.author))
  );
  return {
    authorScore,
    book,
    score: (titleScore * 0.72) + (authorScore * 0.28),
    titleScore,
  };
};

const fetchWithRetry = async (url, options, attempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok || (response.status < 500 && response.status !== 429)) return response;
      lastError = new Error(`Open Library returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
};

const frontMatterValue = (source, key) => {
  const match = source.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
  return match?.[1]?.replace(/^["']|["']$/g, "");
};

const insertMetadata = (source, metadata) => {
  const lines = source.split("\n");
  const anchorKeys = ["goodreads_id", "type", "rating", "author", "title"];
  let anchor = -1;

  for (const key of anchorKeys) {
    anchor = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (anchor !== -1) break;
  }

  lines.splice(anchor + 1, 0, ...Object.entries(metadata).map(([key, value]) => `${key}: "${value}"`));
  return lines.join("\n");
};

const files = (await fs.readdir(booksDirectory))
  .filter((file) => file.endsWith(".md"))
  .sort();

const candidates = [];
for (const file of files) {
  const fileUrl = new URL(file, booksDirectory);
  const source = await fs.readFile(fileUrl, "utf8");
  if (
    frontMatterValue(source, "cover")
    || frontMatterValue(source, "isbn")
    || frontMatterValue(source, "openlibrary_cover_id")
  ) continue;

  const title = frontMatterValue(source, "title");
  const author = frontMatterValue(source, "author");
  const date = frontMatterValue(source, "date_finished")
    || frontMatterValue(source, "date_started")
    || frontMatterValue(source, "date_added")
    || "";

  if (title && author) candidates.push({ author, date, file, fileUrl, source, title });
}

candidates.sort((left, right) => right.date.localeCompare(left.date));

const results = [];
for (const candidate of candidates.slice(0, limit)) {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("title", candidate.title.replace(/\s*\([^)]*\)\s*$/g, ""));
  url.searchParams.set("author", candidate.author);
  url.searchParams.set("fields", "title,author_name,cover_edition_key,cover_i,isbn,key");
  url.searchParams.set("limit", "25");

  const response = await fetchWithRetry(url, {
    headers: { "User-Agent": "Half-baked personal book archive" },
  });
  if (!response.ok) throw new Error(`Open Library returned ${response.status} for ${candidate.title}`);

  const data = await response.json();
  let rankedMatches = (data.docs || [])
    .filter((book) => book.cover_i)
    .map((book) => scoreBook(book, candidate))
    .sort((left, right) => right.score - left.score);
  let bestMatch = rankedMatches[0];
  let match = bestMatch?.titleScore >= 0.42 && bestMatch?.score >= 0.5
    ? bestMatch.book
    : undefined;

  if (!match) {
    const broadUrl = new URL("https://openlibrary.org/search.json");
    broadUrl.searchParams.set("q", `${candidate.title} ${candidate.author}`);
    broadUrl.searchParams.set("fields", "title,author_name,cover_edition_key,cover_i,isbn,key");
    broadUrl.searchParams.set("limit", "10");
    const broadResponse = await fetchWithRetry(broadUrl, {
      headers: { "User-Agent": "Half-baked personal book archive" },
    });
    if (broadResponse.ok) {
      const broadData = await broadResponse.json();
      const broadGuess = broadData.docs?.find((book) => book.cover_i);
      if (broadGuess) {
        bestMatch = scoreBook(broadGuess, candidate);
        match = broadGuess;
      }
    }
  }

  let isbn;
  if (match?.cover_edition_key) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const editionResponse = await fetchWithRetry(`https://openlibrary.org/books/${match.cover_edition_key}.json`, {
      headers: { "User-Agent": "Half-baked personal book archive" },
    });
    if (editionResponse.ok) {
      const edition = await editionResponse.json();
      isbn = edition.isbn_13?.find(isIsbn) || edition.isbn_10?.find(isIsbn);
    }
  }
  isbn ||= match?.isbn?.find((value) => /^(978|979)\d{10}$/.test(value))
    || match?.isbn?.find(isIsbn);
  isbn = isbn ? cleanIsbn(isbn) : undefined;
  if (!match || !isbn) {
    results.push({
      bestGuess: bestMatch ? {
        author: bestMatch.book.author_name?.[0],
        score: Number(bestMatch.score.toFixed(2)),
        title: bestMatch.book.title,
      } : undefined,
      file: candidate.file,
      status: "needs-review",
      title: candidate.title,
    });
  } else {
    const metadata = {
      isbn,
      openlibrary_cover_id: match.cover_i,
    };
    if (writeChanges) {
      await fs.writeFile(candidate.fileUrl, insertMetadata(candidate.source, metadata));
    }
    results.push({
      ...metadata,
      confidence: Number(bestMatch.score.toFixed(2)),
      file: candidate.file,
      matchedTitle: match.title,
      status: writeChanges ? "updated" : "matched",
      title: candidate.title,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 1100));
}

console.log(JSON.stringify(results, null, 2));
