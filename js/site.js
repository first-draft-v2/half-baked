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
    const sortButtons = Array.from(list.querySelectorAll("[data-sort-key]"));
    const pager = list.querySelector("[data-list-pagination]");
    const pageSize = Number(list.dataset.pageSize) || 30;
    const rows = Array.from(body.rows);
    let page = 0;
    const initial = sortButtons.find((button) => button.closest("th").hasAttribute("aria-sort"));
    let sortKey = initial?.dataset.sortKey || "title";
    let sortDirection = initial?.closest("th").getAttribute("aria-sort") || "ascending";

    const compare = (a, b) => {
      const left = a.dataset[sortKey] || "";
      const right = b.dataset[sortKey] || "";
      const result = sortKey === "rating"
        ? Number(left) - Number(right)
        : left.localeCompare(right);
      return sortDirection === "ascending" ? result : -result;
    };

    const updateHeaders = () => {
      sortButtons.forEach((button) => {
        const active = button.dataset.sortKey === sortKey;
        const heading = button.closest("th");
        const chevron = button.querySelector(".sort-chevron");
        heading.removeAttribute("aria-sort");
        chevron.textContent = active
          ? (sortDirection === "ascending" ? "▴" : "▾")
          : "";
        if (active) heading.setAttribute("aria-sort", sortDirection);
      });
    };

    let renderPager;
    const render = () => {
      rows.sort(compare);
      rows.forEach((row, index) => {
        body.append(row);
        row.hidden = index < page * pageSize || index >= (page + 1) * pageSize;
      });
      updateHeaders();
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

    sortButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextKey = button.dataset.sortKey;
        if (nextKey === sortKey) {
          sortDirection = sortDirection === "ascending" ? "descending" : "ascending";
        } else {
          sortKey = nextKey;
          sortDirection = nextKey === "title" ? "ascending" : "descending";
        }
        page = 0;
        render();
      });
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
