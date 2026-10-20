const $ = s => document.querySelector(s);

$("#show-filters").onclick = e => {
  const open = $("#filters").classList.toggle("open");
  e.target.setAttribute("aria-expanded", open);
  e.target.textContent = open ? "Hide filters" : "Filters";
};
