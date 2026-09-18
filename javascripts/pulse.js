/* Pulse pages: Mermaid diagrams with click-to-zoom, and the showcase pop-up.
   Loaded at the end of <body>, so the DOM is ready. */

(function () {
  "use strict";

  /* ponytail: the theme is picked once per page load; switching the color
     scheme re-themes diagrams after a reload. */
  const diagrams = document.querySelectorAll("div.pulse-mermaid");
  if (diagrams.length) {
    import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")
      .then(function (module) {
        const mermaid = module.default;
        const dark = document.body.getAttribute("data-md-color-scheme") === "slate";
        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? "dark" : "base",
          themeVariables: dark ? { fontFamily: "inherit" } : {
            fontFamily: "inherit",
            actorBkg: "#f1f0ff", actorBorder: "#635bff", actorTextColor: "#1a1f36",
            signalColor: "#3c4257", signalTextColor: "#3c4257",
            noteBkgColor: "#f6f9fc", noteBorderColor: "#e3e8ee", noteTextColor: "#3c4257"
          }
        });
        return mermaid.run({ nodes: diagrams });
      })
      .then(function () {
        diagrams.forEach(enableZoom);
      });
  }

  /* Click (or Enter) opens the diagram in a full-width dialog; a click or Esc closes it. */
  function enableZoom(box) {
    box.setAttribute("tabindex", "0");
    box.setAttribute("role", "button");
    box.setAttribute("aria-label", "Enlarge diagram");
    function open() {
      const dialog = document.createElement("dialog");
      dialog.className = "diagram-zoom";
      dialog.appendChild(box.querySelector("svg").cloneNode(true));
      dialog.addEventListener("click", function () { dialog.close(); });
      dialog.addEventListener("close", function () { dialog.remove(); });
      document.body.appendChild(dialog);
      dialog.showModal();
    }
    box.addEventListener("click", open);
    box.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  }

  /* Showcase: the video and dashboard links open in a pop-up. */
  const popup = document.getElementById("showcase-popup");
  if (popup) {
    const box = popup.querySelector("div");
    document.querySelectorAll("[data-popup]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        const video = link.dataset.popup === "video";
        const media = document.createElement(video ? "video" : "img");
        media.src = link.href;
        if (video) {
          media.controls = true;
          media.autoplay = true;
          media.playsInline = true;
        } else {
          media.alt = "Itkan dashboard";
        }
        box.replaceChildren(media);
        popup.showModal();
        popup.scrollTop = 0; // focusing the sticky close button scrolls the pop-up down otherwise
      });
    });
    // A click on the backdrop or the close button closes; clearing the box stops the video.
    popup.addEventListener("click", function (event) { if (event.target === popup) popup.close(); });
    popup.querySelector(".showcase-close").addEventListener("click", function () { popup.close(); });
    popup.addEventListener("close", function () { box.replaceChildren(); });
  }
})();
