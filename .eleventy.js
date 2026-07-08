const { DateTime } = require("luxon");
const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  let markdownLib = markdownIt({
    html: true,
    breaks: true
  });
  eleventyConfig.setLibrary("md", markdownLib);

  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("images");

  eleventyConfig.addFilter("date", (dateObj, format) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(format);
  });

  eleventyConfig.addGlobalData("currentYear", () => new Date().getFullYear());

  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const tagSet = new Set();
    collectionApi.getAll().forEach((item) => {
      (item.data.tags || []).forEach((tag) => {
        if (tag !== "post") tagSet.add(tag);
      });
    });
    return [...tagSet].sort();
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
    // If deploying to https://<user>.github.io/<repo>/, set this to "/<repo>/".
    // If deploying to a custom domain or a <user>.github.io root repo, leave as "/".
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
};
