module.exports = function(eleventyConfig) {
  // Collection for blog posts
  eleventyConfig.addCollection("posts", function(collection) {
    return collection.getFilteredByGlob("src/posts/*.md").sort(function(a,b){
      return b.date - a.date;
    });
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data",
      output: "_site"
    },
    passthroughFileCopy: true
  };
};