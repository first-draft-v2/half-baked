const { DateTime } = require("luxon");
const markdownIt = require("markdown-it");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

const extractDate = (obj) => {
  const date = obj?.data?.date_finished
    || obj?.data?.date_started
    || obj?.data?.date_added
    || obj?.date_finished
    || obj?.date_started
    || obj?.date_added
    || obj?.date;

  if (typeof date === "string") {
    return new Date(date);
  }
  return date;
}

const sortByLastDate = (a, b) => {
  const sortDateA = extractDate(a)
  const sortDateB = extractDate(b)

  if (sortDateA > sortDateB) return -1;
  else if (sortDateA < sortDateB) return 1;
  else return 0;
}

function sortByLastDateImmutable(values) {
  let copy = [...values];
  return copy.sort(sortByLastDate);
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  let markdownLib = markdownIt({
    html: true,
    breaks: true
  });
  eleventyConfig.setLibrary("md", markdownLib);

  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy({ "images/favicon.png": "favicon.png" });
  eleventyConfig.addPassthroughCopy({ "images/apple-touch-icon.png": "apple-touch-icon.png" });
  eleventyConfig.addPassthroughCopy("js");

  eleventyConfig.addFilter("date", (dateObj, format) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(format);
  });

  eleventyConfig.addGlobalData("currentYear", () => new Date().getFullYear());

  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const tagSet = new Set();
    collectionApi.getAll().forEach((item) => {
      (item.data.tags || []).forEach((tag) => {
        if (tag !== "post" && tag !== "lists" && tag !== "reviews" && tag !== "abandoned") tagSet.add(tag);
      });
    });
    return [...tagSet].sort();
  });

  eleventyConfig.addCollection("books", (collectionApi) => {
    const books = collectionApi.getAll()
      .filter((item) => item.data.type == 'book');

    return books;
  })

  eleventyConfig.addCollection("posts", (collectionApi) => {
    const posts = collectionApi.getAll()
      .filter((item) => !item.data.draft && item.data?.tags?.includes('post'))

    return posts;
  })

  eleventyConfig.addCollection("feedPosts", (collectionApi) => {
    return collectionApi.getAll()
      .filter((item) => !item.data.draft
        && item.data?.tags?.includes('post')
        && item.rawInput?.trim())
      .sort(sortByLastDate);
  })

  eleventyConfig.addFilter("sortByLastDate", sortByLastDateImmutable);
  eleventyConfig.addFilter("extractDate", extractDate);
  eleventyConfig.addNunjucksGlobal("extractDate", extractDate);

  eleventyConfig.addCollection("films", (collectionApi) => {
    const films = collectionApi.getAll()
      .filter((item) => item.data.type == 'film' && !!item.data.date);

    return films;
  })

  eleventyConfig.addCollection("series", (collectionApi) => {
    const series = collectionApi.getAll()
      .filter((item) => item.data.type == 'series');

    return series;
  })

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
    // If deploying to https://<user>.github.io/<repo>/, set this to "/<repo>/".
    // If deploying to a custom domain or a <user>.github.io root repo, leave as "/".
    pathPrefix: "/half-baked/"
  };
};
