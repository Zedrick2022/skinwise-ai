(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const photoInput = $("#photo");

  if (!photoInput) {
    console.warn("SkinWise AI: #photo input was not found.");
    return;
  }

  /* =====================================================
     1. FIVE-CARD ANIMATED WELCOME CAROUSEL
  ===================================================== */

  const slides = [
    {
      title: "Welcome to SkinWise AI",
      message: "Your personal skin insight studio starts here.",
      effect: "typewriter",
      theme: "mint",
      label: "YOUR SKIN JOURNEY"
    },
    {
      title: "Every photo tells a story",
      message: "Turn a skin check-in into a clearer next step.",
      effect: "slide",
      theme: "lavender",
      label: "UNDERSTAND YOUR SKIN"
    },
    {
      title: "See the details. Track the change.",
      message: "Explore texture, pores, acne and wrinkle measurements over time.",
      effect: "zoom",
      theme: "sunset",
      label: "VISUAL SKIN INSIGHTS"
    },
    {
      title: "A routine that fits your life",
      message: "Explore skincare guidance shaped around your goals, sensitivity and budget.",
      effect: "float",
      theme: "ocean",
      label: "PERSONALIZED GUIDANCE"
    },
    {
      title: "Make beauty choices with confidence",
      message: "Use AI-powered cosmetic insights to make more informed decisions.",
      effect: "flip",
      theme: "rose",
      label: "YOUR NEXT CHAPTER"
    }
  ];

  const carousel = document.createElement("section");
  carousel.className = "sw-carousel";
  carousel.setAttribute("aria-label", "Welcome to SkinWise AI");

  carousel.innerHTML = `
    <div class="sw-carousel-top">
      <span class="sw-carousel-brand">
        <span class="sw-brand-dot"></span>
        SKINWISE AI
      </span>
      <span class="sw-carousel-counter" aria-hidden="true">01 / 05</span>
    </div>
    <div class="sw-carousel-card" aria-live="polite">
      <span class="sw-slide-label"></span>
      <h2 class="sw-slide-title"></h2>
      <p class="sw-slide-message"></p>
      <div class="sw-slide-bottom">
        <span class="sw-slide-progress"><span></span></span>
        <span class="sw-slide-caption">AI SKIN INSIGHTS · YOUR WAY</span>
      </div>
    </div>
    <div class="sw-carousel-controls">
      <div class="sw-carousel-dots" aria-label="Choose welcome message"></div>
      <div class="sw-carousel-buttons">
        <button type="button" class="sw-carousel-prev" aria-label="Previous message">←</button>
        <button type="button" class="sw-carousel-next" aria-label="Next message">→</button>
      </div>
    </div>
  `;

  const main = $("main") || $(".container") || document.body;
  main.prepend(carousel);

  const slideCard = $(".sw-carousel-card", carousel);
  const slideLabel = $(".sw-slide-label", carousel);
  const slideTitle = $(".sw-slide-title", carousel);
  const slideMessage = $(".sw-slide-message", carousel);
  const slideCounter = $(".sw-carousel-counter", carousel);
  const dots = $(".sw-carousel-dots", carousel);

  let activeSlide = 0;
  let carouselTimer;

  slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "sw-carousel-dot";
    dot.setAttribute("aria-label", `Show message ${index + 1}`);
    dot.addEventListener("click", () => showSlide(index, true));
    dots.appendChild(dot);
  });

  function showSlide(index, restartTimer = false) {
    activeSlide = (index + slides.length) % slides.length;
    const slide = slides[activeSlide];

    slideCard.className = "sw-carousel-card";
    void slideCard.offsetWidth;

    slideCard.classList.add(`sw-theme-${slide.theme}`);
    slideCard.classList.add(`sw-effect-${slide.effect}`);

    slideLabel.textContent = slide.label;
    slideTitle.textContent = slide.title;
    slideMessage.textContent = slide.message;
    slideCounter.textContent =
      `${String(activeSlide + 1).padStart(2, "0")} / 05`;

    $(".sw-slide-progress > span", slideCard).style.animation = "none";
    void $(".sw-slide-progress > span", slideCard).offsetWidth;
    $(".sw-slide-progress > span", slideCard).style.animation = "";

    [...dots.children].forEach((dot, i) => {
      dot.classList.toggle("is-active", i === activeSlide);
      dot.setAttribute("aria-current", i === activeSlide ? "true" : "false");
    });

    if (restartTimer) startCarousel();
  }

  function startCarousel() {
    clearInterval(carouselTimer);
    carouselTimer = setInterval(() => showSlide(activeSlide + 1), 6000);
  }

  $(".sw-carousel-prev", carousel).addEventListener("click", () => {
    showSlide(activeSlide - 1, true);
  });

  $(".sw-carousel-next", carousel).addEventListener("click", () => {
    showSlide(activeSlide + 1, true);
  });

  carousel.addEventListener("mouseenter", () => clearInterval(carouselTimer));
  carousel.addEventListener("mouseleave", startCarousel);
  carousel.addEventListener("focusin", () => clearInterval(carouselTimer));
  carousel.addEventListener("focusout", startCarousel);

  showSlide(0);
  startCarousel();

  /* =====================================================
     2. NATIVE DEVICE CAMERA / PHOTO PICKER
  ===================================================== */

  photoInput.setAttribute("accept", "image/jpeg,image/png");
  photoInput.removeAttribute("capture");

  /* =====================================================
     3. EXPORT SAVED ANALYSIS HISTORY AS CSV
  ===================================================== */

  const historyPanel = $(".history-panel");
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "sw-export-button";
  exportButton.textContent = "↓ Export history CSV";
  exportButton.title = "Download saved SkinWise AI analysis history";

  if (historyPanel) {
    const clearButton = $("#clearHistoryButton", historyPanel);

    if (clearButton) {
      clearButton.insertAdjacentElement("afterend", exportButton);
    } else {
      historyPanel.prepend(exportButton);
    }
  } else {
    exportButton.hidden = true;
  }

  function normalizeMetricKey(value) {
    const key = String(value || "").toLowerCase();

    if (key.includes("texture")) return "texture";
    if (key.includes("pore")) return "pore";
    if (key.includes("acne") || key.includes("blemish")) return "acne";
    if (key.includes("wrinkle") || key.includes("aging")) return "wrinkle";

    return null;
  }

  function numericScore(value) {
    if (value && typeof value === "object") {
      value = value.score ?? value.value ?? value.result;
    }

    if (typeof value === "string") {
      value = value.replace("%", "").trim();
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : "";
  }

  function getRecordScores(record) {
    const result = {
      texture: "",
      pore: "",
      acne: "",
      wrinkle: ""
    };

    const raw = record.scores ?? record.metrics ?? {};

    if (Array.isArray(raw)) {
      raw.forEach(item => {
        const key = normalizeMetricKey(
          item.key ?? item.type ?? item.name ?? item.label
        );

        if (key) {
          result[key] = numericScore(
            item.score ?? item.value ?? item.result
          );
        }
      });
    } else if (raw && typeof raw === "object") {
      Object.entries(raw).forEach(([label, value]) => {
        const key = normalizeMetricKey(label);
        if (key) result[key] = numericScore(value);
      });
    }

    return result;
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  exportButton.addEventListener("click", () => {
    let records;

    try {
      records = JSON.parse(
        localStorage.getItem("skinwise-analysis-history-v1") || "[]"
      );
    } catch (error) {
      records = [];
    }

    if (!Array.isArray(records) || records.length === 0) {
      alert("No saved analyses yet. Analyze a photo first, then export your history.");
      return;
    }

    const headers = [
      "Photo",
      "Date",
      "Texture score",
      "Pore score",
      "Acne score",
      "Wrinkle score"
    ];

    const rows = records.map((record, index) => {
      const scores = getRecordScores(record);

      return [
        record.name || record.fileName || `Analysis ${index + 1}`,
        record.date || record.createdAt || record.timestamp || "",
        scores.texture,
        scores.pore,
        scores.acne,
        scores.wrinkle
      ];
    });

    const csv = [
      headers,
      ...rows
    ].map(row => row.map(csvCell).join(",")).join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `skinwise-analysis-history-${new Date()
      .toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  console.info("SkinWise AI advanced features loaded.");
})();
