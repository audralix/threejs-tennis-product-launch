// Tiny, robust toggle
const nav = document.getElementById("site-nav");
const toggle = document.getElementById("nav-toggle");
const menu = document.getElementById("nav-menu");

function setOpen(open) {
  nav.classList.toggle("nav--open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  setOpen(open);
});

// Close when clicking a link (mobile)
menu.addEventListener("click", (e) => {
  if (e.target.closest("a")) setOpen(false);
});

// Close when resizing up to desktop
matchMedia("(min-width:768px)").addEventListener(
  "change",
  (e) => e.matches && setOpen(false)
);

window.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector(".section-2");
  const dialog = section?.querySelector("#when-dialog");
  const openBtns = section?.querySelectorAll(".when-btn") || [];
  const closeBtn = dialog?.querySelector(".wm-close, .when-close");

  if (!section || !dialog) return;

  const setExpanded = (el, v) => el?.setAttribute("aria-expanded", String(v));
  const lockScroll = (lock) => {
    document.documentElement.classList.toggle("wm-lock", lock);
    document.body.classList.toggle("wm-lock", lock);
  };

  let lastActive = null;

  function openDialog(trigger) {
    lastActive = document.activeElement;
    dialog.hidden = false;
    section.classList.add("modal-open"); // << dims the section
    openBtns.forEach((b) => setExpanded(b, true));
    lockScroll(true);
    (closeBtn || dialog).focus();
  }
  function closeDialog() {
    dialog.hidden = true;
    section.classList.remove("modal-open"); // << remove dim
    openBtns.forEach((b) => setExpanded(b, false));
    lockScroll(false);
    (lastActive || openBtns[0])?.focus();
  }

  // Open (delegated in case the button gets re-rendered)
  section.addEventListener("click", (e) => {
    const trigger = e.target.closest(".when-btn");
    if (trigger && trigger.matches('[aria-controls="when-dialog"]')) {
      e.preventDefault();
      openDialog(trigger);
    }
  });

  // Close actions
  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeDialog();
  });
  document.addEventListener("keydown", (e) => {
    if (dialog.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeDialog();
    }
  });

  // Debug helpers — optional
  window.__wm = { open: () => openDialog(openBtns[0]), close: closeDialog };
});

// Safe guard: no early return
const techToggle = document.getElementById("techViewToggle");
if (techToggle) {
  techToggle.addEventListener("change", (e) => {
    document.body.classList.toggle("tech-view", e.target.checked);
  });
}

// one-time wiring (place after the modal HTML or in a deferred script)
document.addEventListener("click", (e) => {
  // OPEN
  if (e.target.closest("#openTechModal")) {
    const m = document.getElementById("techModal");
    if (!m) return;

    // Remove the hidden *attribute/property* before adding .open
    m.hidden = false; // same as: m.removeAttribute('hidden')
    requestAnimationFrame(() => m.classList.add("open"));
    document.body.classList.add("modal-open");
  }

  // CLOSE on backdrop or ✕
  if (e.target.closest("[data-close-modal]")) {
    const m = document.getElementById("techModal");
    if (!m) return;

    m.classList.remove("open");
    document.body.classList.remove("modal-open");
    setTimeout(() => {
      m.hidden = true;
    }, 180); // reapply hidden after transition
  }
});

// Optional: ESC to close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const m = document.getElementById("techModal");
    if (m && !m.hidden) {
      m.classList.remove("open");
      document.body.classList.remove("modal-open");
      setTimeout(() => {
        m.hidden = true;
      }, 180);
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const m = document.getElementById("techModal");
  if (m && m.parentElement !== document.body) {
    document.body.appendChild(m); // portalize to top-level
  }
});

(function () {
  function refreshSegbar(card) {
    if (!card) return;
    const labels = card.querySelectorAll(".segbar label[for]");
    labels.forEach((label) => {
      const id = label.getAttribute("for");
      const radio = card.querySelector(`input[type="radio"]#${CSS.escape(id)}`);
      const active = !!(radio && radio.checked);
      label.classList.toggle("is-active", active);
      label.classList.toggle("is-inactive", !active);
      label.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  // init all existing segment-cards
  document.querySelectorAll(".segment-card").forEach(refreshSegbar);

  // update on any radio change inside a segment-card
  document.addEventListener("change", (e) => {
    if (e.target.matches('.segment-card input[type="radio"]')) {
      refreshSegbar(e.target.closest(".segment-card"));
    }
  });

  // ensure modal copy gets refreshed when the modal opens
  document.addEventListener("click", (e) => {
    if (e.target.closest("#openTechModal")) {
      setTimeout(() => {
        document
          .querySelectorAll("#techModal .segment-card")
          .forEach(refreshSegbar);
      }, 0);
    }
  });
})();

(() => {
  // updates label classes + thumb position for the MODAL segmented control
  function refreshModalSeg() {
    const card = document.querySelector(
      "#techModal .segment-card.modal-segment-card"
    );
    if (!card) return;

    const segbar = card.querySelector(".segbar");
    const thumb = segbar?.querySelector(".thumb");
    const labels = segbar?.querySelectorAll("label[for]") || [];

    let activeLabel = null;

    // 1) active/inactive label styling + aria
    labels.forEach((label) => {
      const id = label.getAttribute("for"); // e.g., "m-tab-spec"
      const radio = card.querySelector(`#${CSS.escape(id)}`); // find matching input
      const isOn = radio && radio.checked;

      label.classList.toggle("is-active", isOn);
      label.classList.toggle("is-inactive", !isOn);
      label.setAttribute("aria-selected", isOn ? "true" : "false");

      if (isOn) activeLabel = label;
    });

    // 2) move/resize the pill thumb to fit the active label
    if (segbar && thumb && activeLabel) {
      const sb = segbar.getBoundingClientRect();
      const lb = activeLabel.getBoundingClientRect();
      const x = lb.left - sb.left;
      thumb.style.width = `${lb.width}px`;
      thumb.style.transform = `translateX(${x}px)`;
    }
  }

  // Recalc when the modal opens (run after it's visible)
  document.addEventListener("click", (e) => {
    if (e.target.closest("#openTechModal")) {
      setTimeout(refreshModalSeg, 0);
    }
  });

  // Recalc when the modal tabs change
  document.addEventListener("change", (e) => {
    if (
      e.target.matches(
        '#techModal .segment-card.modal-segment-card input[type="radio"]'
      )
    ) {
      refreshModalSeg();
    }
  });

  // Recalc on resize/orientation if modal is open
  window.addEventListener("resize", () => {
    const m = document.getElementById("techModal");
    if (m && !m.hidden) refreshModalSeg();
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("techModal");
  const openBtn = document.getElementById("openTechModal");

  if (!modal) return;

  const open = () => {
    modal.hidden = false; // remove [hidden]
    requestAnimationFrame(() => modal.classList.add("open"));
    document.body.classList.add("modal-open");
  };
  const close = () => {
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");
    setTimeout(() => {
      modal.hidden = true;
    }, 180); // match CSS transition
  };

  // Open on button inside section-3
  openBtn?.addEventListener("click", open);

  // Close on ✕ or backdrop (anything with data-close-modal inside #techModal)
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-modal]")) close();
  });

  // Close on Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
});
