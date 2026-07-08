---
layout: layouts/base.njk
title: Home
---
# Welcome

This is a minimal Eleventy blog. See the posts folder for an example post.

Recent posts:

<ul>
{% for post in collections.posts %}
  <li><a href="{{ post.url }}">{{ post.data.title }}</a> — {{ post.date }}</li>
{% endfor %}
</ul>