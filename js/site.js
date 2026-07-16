(() => {
  const makePager = (container, getPage, setPage, getTotalPages) => {
    const render = () => {
      const page = getPage();
      const totalPages = getTotalPages();
      container.replaceChildren();

      if (totalPages <= 1) return;

      const previous = document.createElement("button");
      previous.type = "button";
      previous.textContent = "← Previous";
      previous.disabled = page === 0;
      previous.addEventListener("click", () => setPage(page - 1));

      const status = document.createElement("span");
      status.textContent = `Page ${page + 1} of ${totalPages}`;
      status.setAttribute("aria-live", "polite");

      const next = document.createElement("button");
      next.type = "button";
      next.textContent = "Next →";
      next.disabled = page === totalPages - 1;
      next.addEventListener("click", () => setPage(page + 1));

      container.append(previous, status, next);
    };

    return render;
  };

  document.querySelectorAll("[data-review-list]").forEach((list) => {
    const body = list.querySelector("tbody");
    const sort = list.querySelector("[data-review-sort]");
    const pager = list.querySelector("[data-list-pagination]");
    const pageSize = Number(list.dataset.pageSize) || 30;
    const rows = Array.from(body.rows);
    let page = 0;

    const comparators = {
      "date-desc": (a, b) => b.dataset.date.localeCompare(a.dataset.date),
      "date-asc": (a, b) => a.dataset.date.localeCompare(b.dataset.date),
      "title-asc": (a, b) => a.dataset.title.localeCompare(b.dataset.title),
      "title-desc": (a, b) => b.dataset.title.localeCompare(a.dataset.title),
      "rating-desc": (a, b) => Number(b.dataset.rating) - Number(a.dataset.rating),
      "rating-asc": (a, b) => Number(a.dataset.rating) - Number(b.dataset.rating),
    };

    let renderPager;
    const render = () => {
      rows.sort(comparators[sort.value]);
      rows.forEach((row, index) => {
        body.append(row);
        row.hidden = index < page * pageSize || index >= (page + 1) * pageSize;
      });
      renderPager();
    };

    const setPage = (nextPage) => {
      page = nextPage;
      render();
      list.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    renderPager = makePager(
      pager,
      () => page,
      setPage,
      () => Math.ceil(rows.length / pageSize),
    );

    sort.addEventListener("change", () => {
      page = 0;
      render();
    });

    render();
  });

  document.querySelectorAll("[data-paginated-list]").forEach((list) => {
    const items = Array.from(list.children);
    const pageSize = Number(list.dataset.pageSize) || 25;
    const pager = list.nextElementSibling;
    let page = 0;

    let renderPager;
    const render = () => {
      items.forEach((item, index) => {
        item.hidden = index < page * pageSize || index >= (page + 1) * pageSize;
      });
      renderPager();
    };

    const setPage = (nextPage) => {
      page = nextPage;
      render();
      list.closest(".tag-group").scrollIntoView({ behavior: "smooth", block: "start" });
    };

    renderPager = makePager(
      pager,
      () => page,
      setPage,
      () => Math.ceil(items.length / pageSize),
    );

    render();
  });
})();
