(() => {
  const pageFromUrl = (parameter, totalPages) => {
    const value = Number.parseInt(new URL(window.location.href).searchParams.get(parameter), 10);
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value - 1, 0), Math.max(totalPages - 1, 0));
  };

  const pageHref = (parameter, page, hash = "") => {
    const url = new URL(window.location.href);
    if (page === 0) {
      url.searchParams.delete(parameter);
    } else {
      url.searchParams.set(parameter, String(page + 1));
    }
    url.hash = hash;
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const makePager = (container, getPage, getTotalPages, getPageHref) => {
    const render = () => {
      const page = getPage();
      const totalPages = getTotalPages();
      container.replaceChildren();

      if (totalPages <= 1) return;

      const previous = document.createElement(page === 0 ? "span" : "a");
      previous.textContent = "← Previous";
      if (page === 0) {
        previous.setAttribute("aria-disabled", "true");
      } else {
        previous.href = getPageHref(page - 1);
        previous.rel = "prev";
      }

      const status = document.createElement("span");
      status.textContent = `Page ${page + 1} of ${totalPages}`;

      const next = document.createElement(page === totalPages - 1 ? "span" : "a");
      next.textContent = "Next →";
      if (page === totalPages - 1) {
        next.setAttribute("aria-disabled", "true");
      } else {
        next.href = getPageHref(page + 1);
        next.rel = "next";
      }

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
    const pageParameter = list.dataset.pageParameter || "page";
    const totalPages = Math.ceil(rows.length / pageSize);
    let page = pageFromUrl(pageParameter, totalPages);
    const initial = sortButtons.find((button) => button.closest("th").hasAttribute("aria-sort"));
    const defaultSortKey = initial?.dataset.sortKey || "title";
    const defaultSortDirection = initial?.closest("th").getAttribute("aria-sort") || "ascending";
    const urlParameters = new URL(window.location.href).searchParams;
    const requestedSortKey = urlParameters.get("sort");
    const requestedSortDirection = urlParameters.get("order");
    let sortKey = sortButtons.some((button) => button.dataset.sortKey === requestedSortKey)
      ? requestedSortKey
      : defaultSortKey;
    let sortDirection = requestedSortDirection === "ascending" || requestedSortDirection === "descending"
      ? requestedSortDirection
      : defaultSortDirection;

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

    renderPager = makePager(
      pager,
      () => page,
      () => totalPages,
      (targetPage) => pageHref(pageParameter, targetPage),
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
        const url = new URL(window.location.href);
        url.searchParams.delete(pageParameter);
        url.searchParams.set("sort", sortKey);
        url.searchParams.set("order", sortDirection);
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        render();
      });
    });

    render();
  });

  document.querySelectorAll("[data-paginated-list]").forEach((list) => {
    const items = Array.from(list.children);
    const pageSize = Number(list.dataset.pageSize) || 25;
    const pager = list.nextElementSibling;
    const group = list.closest(".tag-group");
    const pageParameter = `page-${group.id.replace(/^tag-/, "")}`;
    const totalPages = Math.ceil(items.length / pageSize);
    let page = pageFromUrl(pageParameter, totalPages);

    let renderPager;
    const render = () => {
      items.forEach((item, index) => {
        item.hidden = index < page * pageSize || index >= (page + 1) * pageSize;
      });
      renderPager();
    };

    renderPager = makePager(
      pager,
      () => page,
      () => totalPages,
      (targetPage) => pageHref(pageParameter, targetPage, group.id),
    );

    render();
  });
})();
