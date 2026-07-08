const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
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
