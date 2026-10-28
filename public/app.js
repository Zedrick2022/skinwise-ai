const photoInput = document.querySelector("#photo");
const preview = document.querySelector("#preview");
const placeholder = document.querySelector("#uploadPlaceholder");
const analyzeButton = document.querySelector("#analyzeButton");
const statusMessage = document.querySelector("#statusMessage");
const resultsSection = document.querySelector("#resultsSection");
const scoreGrid = document.querySelector("#scoreGrid");
const newAnalysisButton = document.querySelector("#newAnalysisButton");
const dropzone = document.querySelector("#dropzone");

const analysisPicker = document.querySelector("#analysisPicker");
const historyList = document.querySelector("#historyList");
const emptyHistory = document.querySelector("#emptyHistory");
const historyCount = document.querySelector("#historyCount");
const pieCanvas = document.querySelector("#pieChart");
const barCanvas = document.querySelector("#barChart");
const lineCanvas = document.querySelector("#lineChart");
const pieLegend = document.querySelector("#pieLegend");

const STORAGE_KEY = "skinwise-analysis-history-v1";
const METRICS = ["texture", "pore", "acne", "wrinkle"];
const COLORS = ["#548778", "#d4a45c", "#bd7d82", "#8294c4"];
const METRIC_LABELS = {
  texture: "Texture",
  pore: "Pores",
  acne: "Acne",
  wrinkle: "Wrinkles"
};

let selectedFile = null;
let history = loadHistory();
let selectedAnalysisId = null;

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
  statusMessage.hidden = false;
}

function resetStatus() {
  statusMessage.hidden = true;
  statusMessage.textContent = "";
  statusMessage.classList.remove("error");
}

function chooseFile(file) {
  resetStatus();
  if (!file) return;

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    showStatus("Please choose a JPG or PNG image.", true);
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showStatus("This image is larger than 10 MB. Please choose a smaller photo.", true);
    return;
  }

  selectedFile = file;
  const reader = new FileReader();

  reader.onload = () => {
    preview.src = reader.result;
    preview.hidden = false;
    placeholder.hidden = true;
  };

  reader.onerror = () => {
    showStatus("Could not preview this image. Try another JPG or PNG.", true);
  };

  reader.readAsDataURL(file);
  analyzeButton.disabled = false;
  analyzeButton.innerHTML = "<span>Analyze my skin</span><span aria-hidden=\"true\">↗</span>";
}

window.setSelectedPhotoFile = chooseFile;

photoInput.addEventListener("change", () => chooseFile(photoInput.files?.[0]));

  const takeSelfieButton = document.querySelector("#takeSelfieButton");
  const chooseExistingPhotoButton = document.querySelector("#chooseExistingPhotoButton");

  if (takeSelfieButton && chooseExistingPhotoButton) {
    takeSelfieButton.addEventListener("click", () => {
      photoInput.setAttribute("capture", "user");
      photoInput.click();
    });

    chooseExistingPhotoButton.addEventListener("click", () => {
      photoInput.removeAttribute("capture");
      photoInput.click();
    });
  }


["dragenter", "dragover"].forEach(name => {
  dropzone.addEventListener(name, event => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach(name => {
  dropzone.addEventListener(name, event => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
  });
});

dropzone.addEventListener("drop", event => {
  chooseFile(event.dataTransfer?.files?.[0]);
});

function humanize(value) {
  return String(value)
    .replace(/^hd_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getScores(data) {
  const output = data?.results?.output;

  if (Array.isArray(output)) {
    return output.map(item => ({
      name: item.type || item.action || "Skin insight",
      score: item.ui_score ?? item.raw_score,
      rawScore: item.raw_score,
      details: item
    })).filter(item => Number.isFinite(Number(item.score)));
  }

  const found = [];

  function walk(value, path = "") {
    if (!value || typeof value !== "object") return;

    if (value.ui_score !== undefined || value.raw_score !== undefined) {
      const score = value.ui_score ?? value.raw_score;
      found.push({
        name: value.type || path || "Skin insight",
        score,
        rawScore: value.raw_score,
        details: value
      });
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === "mask_urls" || key === "output_mask_name") continue;
      walk(child, path ? `${path} ${key}` : key);
    }
  }

  walk(data?.results || data);
  return found;
}

function metricKey(name) {
  const value = String(name).toLowerCase().replace(/^hd_/, "").replaceAll("_", " ");
  if (value.includes("texture")) return "texture";
  if (value.includes("pore")) return "pore";
  if (value.includes("acne")) return "acne";
  if (value.includes("wrinkle")) return "wrinkle";
  return value.trim();
}

function scoreMap(items) {
  const result = {};
  for (const item of items) {
    const key = metricKey(item.name);
    const number = Number(item.score);
    if (METRICS.includes(key) && Number.isFinite(number)) {
      result[key] = Math.max(0, Math.min(100, number));
    }
  }
  return result;
}

function rawScoreMap(items) {
  const result = {};
  for (const item of items) {
    const key = metricKey(item.name);
    const number = Number(item.rawScore);
    if (
      METRICS.includes(key) &&
      item.rawScore !== undefined &&
      item.rawScore !== null &&
      Number.isFinite(number)
    ) {
      result[key] = number;
    }
  }
  return result;
}


function renderResults(data) {
  const scores = getScores(data);
  scoreGrid.replaceChildren();

  const guidance = {
    texture: {
      title: "Skin Texture",
      meaning:
        "YouCam analyzes the visible appearance of the skin's surface. This score does not directly measure skin hydration, dryness, or nutrient levels.",
      care:
        "Suggested care: Use a gentle cleanser, apply a moisturizer suited to your skin, and use broad-spectrum SPF 30+ sunscreen during the day.",
      lower:
        "If this score is lower than your previous result, check whether your skin feels rough or dry. A gentle routine and suitable moisturizer may help, but the score cannot identify the cause."
    },
    pore: {
      title: "Pore Appearance",
      meaning:
        "YouCam evaluates visible pores. The score does not establish why pores are prominent or whether they are blocked.",
      care:
        "Suggested care: Cleanse gently, avoid squeezing pores, and choose products labelled non-comedogenic or 'won't clog pores'.",
      lower:
        "If this score is lower than your previous result, review your routine for irritation or pore-clogging products. A photo score alone cannot confirm clogged pores."
    },
    acne: {
      title: "Acne-Related Features",
      meaning:
        "YouCam analyzes acne-related features visible in the photo. This is a cosmetic image-analysis result, not a diagnosis or confirmation of the cause of spots.",
      care:
        "Suggested care: Use gentle, non-comedogenic skincare. If you use acne treatments that cause dryness, an appropriate moisturizer may help. Seek professional advice for painful, severe, or persistent acne.",
      lower:
        "If this score is lower than your previous result, review whether visible breakouts or irritation have changed. The score cannot determine the cause; avoid harsh scrubbing or adding many new products at once."
    },
    wrinkle: {
      title: "Wrinkle Appearance",
      meaning:
        "YouCam analyzes the appearance of visible wrinkles and fine lines. Lighting, facial expression, camera distance, and photo quality can affect the result.",
      care:
        "Suggested care: Moisturize regularly and use broad-spectrum SPF 30+ sunscreen. Sunscreen and moisturizer are useful foundations of an anti-aging skincare routine.",
      lower:
        "If this score is lower than your previous result, compare photos taken with similar lighting, distance, and facial expression. A score change alone does not prove that wrinkles have increased."
    }
  };

  if (!scores.length) {
    const message = document.createElement("p");
    message.textContent =
      "Analysis completed, but no displayable scores were found. Check the server output for the returned response format.";
    scoreGrid.append(message);
  } else {
    for (const item of scores) {
      const numericScore = Number(item.score);

      if (!Number.isFinite(numericScore)) continue;

      const score = Math.max(0, Math.min(100, numericScore));
      const key = metricKey(item.name);

      const info = guidance[key] || {
        title: humanize(item.name),
        meaning:
          "This is a cosmetic score returned by YouCam AI. Refer to the API's description for this particular metric.",
        care:
          "Suggested care: Keep your routine gentle and avoid assuming that this score identifies a medical condition or a specific deficiency.",
        lower:
          "The numeric score is lower than the previous saved result. This does not establish the cause of the change."
      };

      const card = document.createElement("article");
      card.className = "score-card";

      const label = document.createElement("div");
      label.className = "score-label";
      label.textContent = info.title;

      const number = document.createElement("div");
      number.className = "score-number";
      number.textContent = String(Math.round(score));

      const outOf = document.createElement("small");
      outOf.textContent = "/ 100";
      number.append(outOf);

      const track = document.createElement("div");
      track.className = "score-track";

      const fill = document.createElement("div");
      fill.className = "score-fill";
      fill.style.width = `${score}%`;
      track.append(fill);

      const meaning = document.createElement("p");
      meaning.className = "score-note";
      meaning.textContent = info.meaning;

      const direction = document.createElement("p");
      direction.className = "score-meaning";
      direction.textContent =
        "Score guide: YouCam describes higher scores as more favorable. The score is a cosmetic indicator, not a medical measurement.";

      card.append(label, number, track, meaning, direction);

      const previousRecord = history.find(record =>
        record.scores &&
        record.scores[key] !== undefined &&
        Number.isFinite(Number(record.scores[key]))
      );

      const care = document.createElement("p");
      care.className = "score-care";
      care.textContent = info.care;

      if (previousRecord) {
        const currentRaw = Number(item.rawScore);
        const previousRaw = Number(previousRecord.rawScores?.[key]);

        const canCompareRaw =
          item.rawScore !== undefined &&
          item.rawScore !== null &&
          Number.isFinite(currentRaw) &&
          previousRecord.rawScores?.[key] !== undefined &&
          Number.isFinite(previousRaw);

        const currentComparable = canCompareRaw ? currentRaw : score;
        const previousComparable = canCompareRaw
          ? previousRaw
          : Number(previousRecord.scores[key]);

        const change = Math.round(currentComparable - previousComparable);
        const changeNote = document.createElement("p");
        changeNote.className = "score-change";

        const scoreType = canCompareRaw
          ? "raw analysis score"
          : "displayed score";

        if (change > 0) {
          changeNote.textContent =
            `Compared with the previous saved ${scoreType}, this result is ${change} points higher. This is a numerical difference, not proof of skin improvement.`;
        } else if (change < 0) {
          changeNote.textContent =
            `Compared with the previous saved ${scoreType}, this result is ${Math.abs(change)} points lower. This is a numerical difference, not proof of skin deterioration.`;
        } else {
          changeNote.textContent =
            `There is no rounded numerical difference from the previous comparable ${scoreType}. This does not guarantee that the photos or skin appearance are identical.`;
        }

        const consistencyNote = document.createElement("p");
        consistencyNote.className = "score-note";
        consistencyNote.textContent =
          "For a fairer comparison, use photos with similar lighting, camera distance, angle, facial expression, and image quality. YouCam's scores alone cannot establish whether a change is clinically meaningful.";

        card.append(changeNote, consistencyNote);
      } else {
        const firstCheck = document.createElement("p");
        firstCheck.className = "score-change";
        firstCheck.textContent =
          "This is the first saved result available for this metric. Future comparisons will use the same score type when the necessary data is available.";
        card.append(firstCheck);
      }

      card.append(care);
      scoreGrid.append(card);
    }
  }

  const disclaimer = document.createElement("p");
  disclaimer.className = "score-disclaimer";
  disclaimer.textContent =
    "Important: These are AI-generated cosmetic estimates, not a medical diagnosis. They cannot independently identify dehydration, nutrient deficiencies, or the cause of a skin concern. Results can vary with lighting, camera distance, facial expression, and image quality. Compare photos captured under similar conditions.";

  scoreGrid.append(disclaimer);

  resultsSection.hidden = false;
  resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function persistHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.warn("Could not save SkinWise history:", error);
    return false;
  }
}

async function makeThumbnail() {
  if (!preview.src) return "";

  try {
    const image = new Image();
    image.src = preview.src;
    await image.decode();

    const maxSide = 320;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.65);
  } catch {
    return "";
  }
}

async function saveAnalysis(items) {
  const thumbnail = await makeThumbnail();
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    scores: scoreMap(items),
    rawScores: rawScoreMap(items),
    thumbnail
  };

  history.unshift(record);
  history = history.slice(0, 10);
  selectedAnalysisId = record.id;

  if (!persistHistory()) {
    showStatus("Analysis succeeded, but browser storage is full. Clear history or browser storage to save more check-ins.", true);
  }

  renderHistory();
  renderDashboard();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function currentAnalysis() {
  return history.find(item => item.id === selectedAnalysisId) || history[0] || null;
}

function renderHistory() {
  analysisPicker.replaceChildren();
  historyList.replaceChildren();

  historyCount.textContent = `${history.length} saved ${history.length === 1 ? "photo" : "photos"}`;
  emptyHistory.hidden = history.length > 0;

  for (const record of history) {
    const option = document.createElement("option");
    option.value = record.id;
    option.textContent = formatDate(record.date);
    analysisPicker.append(option);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.setAttribute("aria-pressed", String(record.id === selectedAnalysisId));

    if (record.thumbnail) {
      const image = document.createElement("img");
      image.src = record.thumbnail;
      image.alt = "Saved analysis thumbnail";
      button.append(image);
    } else {
      const icon = document.createElement("span");
      icon.className = "history-placeholder";
      icon.textContent = "✳";
      button.append(icon);
    }

    const details = document.createElement("span");
    details.className = "history-details";
    const title = document.createElement("strong");
    title.textContent = formatDate(record.date);
const subtitle = document.createElement("small");
subtitle.textContent = `${Object.keys(record.scores || {}).length} metrics recorded`;

const scorePreview = document.createElement("span");
scorePreview.className = "history-score-preview";
scorePreview.setAttribute("aria-label", "Saved skin analysis score previews");

const savedScores = record.scores || {};
const previewMetrics = [
  ["texture", "Texture"],
  ["pore", "Pores"],
  ["acne", "Acne"],
  ["wrinkle", "Wrinkles"]
];

for (const [key, label] of previewMetrics) {
  const value = Number(savedScores[key]);

  if (
    savedScores[key] === undefined ||
    savedScores[key] === null ||
    !Number.isFinite(value)
  ) {
    continue;
  }

  const metric = document.createElement("span");
  metric.className = "history-score-chip";

  const metricLabel = document.createElement("span");
  metricLabel.className = "history-score-label";
  metricLabel.textContent = label;

  const metricValue = document.createElement("strong");
  metricValue.className = "history-score-value";
  metricValue.textContent = `${Math.round(value)}%`;

  const track = document.createElement("span");
  track.className = "history-score-track";

  const fill = document.createElement("span");
  fill.className = "history-score-fill";
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`;

  track.append(fill);
  metric.append(metricLabel, metricValue, track);
  scorePreview.append(metric);
}

details.append(title, subtitle);

if (scorePreview.childElementCount > 0) {
  details.append(scorePreview);
}

button.append(details);

    button.addEventListener("click", () => {
      selectedAnalysisId = record.id;
      analysisPicker.value = record.id;
      renderHistory();
      renderDashboard();
    });

    historyList.append(button);
  }

  if (history.length) analysisPicker.value = selectedAnalysisId || history[0].id;
  renderSkinComparison();
}

function prepareCanvas(canvas, height = 260) {
  const width = Math.max(280, canvas.parentElement.clientWidth);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = "100%";
  canvas.style.height = `${height}px`;

  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function drawEmpty(canvas, message) {
  const { context, width, height } = prepareCanvas(canvas);
  context.fillStyle = "#77756f";
  context.font = "14px sans-serif";
  context.textAlign = "center";
  context.fillText(message, width / 2, height / 2);
}

function drawPieChart(record) {
  const values = METRICS
    .filter(key => Number.isFinite(record?.scores?.[key]))
    .map(key => ({ key, label: METRIC_LABELS[key], value: record.scores[key] }));

  pieLegend.replaceChildren();

  if (!values.length) {
    drawEmpty(pieCanvas, "No recognized metrics in this analysis");
    return;
  }

  const total = values.reduce((sum, item) => sum + item.value, 0);
  const { context, width, height } = prepareCanvas(pieCanvas, 230);
  const radius = Math.min(78, height * 0.32, width * 0.24);
  const cx = width / 2;
  const cy = height / 2;
  let angle = -Math.PI / 2;

  if (total === 0) {
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fillStyle = "#dedbd2";
    context.fill();
  } else {
    values.forEach((item, index) => {
      const slice = item.value / total * Math.PI * 2;
      context.beginPath();
      context.moveTo(cx, cy);
      context.arc(cx, cy, radius, angle, angle + slice);
      context.closePath();
      context.fillStyle = COLORS[METRICS.indexOf(item.key)];
      context.fill();
      angle += slice;
    });
  }

  for (const item of values) {
    const legendItem = document.createElement("span");
    legendItem.className = "legend-item";
    const swatch = document.createElement("i");
    swatch.style.background = COLORS[METRICS.indexOf(item.key)];
    const label = document.createElement("span");
    const share = total ? Math.round(item.value / total * 100) : 0;
    label.textContent = `${item.label}: ${item.value} (${share}% of total)`;
    legendItem.append(swatch, label);
    pieLegend.append(legendItem);
  }
}

function drawBarChart(record) {
  const values = METRICS
    .filter(key => Number.isFinite(record?.scores?.[key]))
    .map(key => ({ key, label: METRIC_LABELS[key], value: record.scores[key] }));

  if (!values.length) {
    drawEmpty(barCanvas, "No recognized metrics in this analysis");
    return;
  }

  const { context, width, height } = prepareCanvas(barCanvas, 260);
  const left = 74;
  const right = 34;
  const top = 22;
  const rowHeight = (height - top - 20) / values.length;
  const usable = width - left - right;

  context.font = "12px sans-serif";
  context.textBaseline = "middle";

  values.forEach((item, index) => {
    const y = top + index * rowHeight + rowHeight / 2;
    context.textAlign = "right";
    context.fillStyle = "#55534e";
    context.fillText(item.label, left - 10, y);

    context.fillStyle = "#efede7";
    context.fillRect(left, y - 9, usable, 18);
    context.fillStyle = COLORS[METRICS.indexOf(item.key)];
    context.fillRect(left, y - 9, usable * item.value / 100, 18);

    context.textAlign = "left";
    context.fillStyle = "#292a27";
    context.fillText(String(Math.round(item.value)), Math.min(width - 24, left + usable * item.value / 100 + 6), y);
  });
}

function drawLineChart() {
  const records = [...history].reverse();
  const metrics = METRICS.filter(key =>
    records.some(record => Number.isFinite(record.scores?.[key]))
  );

  if (!records.length || !metrics.length) {
    drawEmpty(lineCanvas, "Analyze a photo to start your trend graph");
    return;
  }

  const { context, width, height } = prepareCanvas(lineCanvas, 290);
  const left = 42;
  const right = 18;
  const top = 22;
  const bottom = 46;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  context.font = "11px sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";

  [0, 25, 50, 75, 100].forEach(value => {
    const y = top + plotHeight * (1 - value / 100);
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(width - right, y);
    context.strokeStyle = "#e9e6de";
    context.stroke();
    context.fillStyle = "#77756f";
    context.fillText(String(value), left - 8, y);
  });

  if (records.length === 1) {
    context.fillStyle = "#77756f";
    context.textAlign = "center";
    context.fillText("Add another photo to compare check-ins", width / 2, height - 12);
  }

  metrics.forEach(key => {
    const metricIndex = METRICS.indexOf(key);
    const points = records.map((record, index) => {
      const value = record.scores?.[key];
      if (!Number.isFinite(value)) return null;
      const x = records.length === 1
        ? left + plotWidth / 2
        : left + plotWidth * index / (records.length - 1);
      const y = top + plotHeight * (1 - value / 100);
      return { x, y, value };
    });

    context.strokeStyle = COLORS[metricIndex];
    context.lineWidth = 2.5;
    context.beginPath();
    let started = false;

    for (const point of points) {
      if (!point) {
        started = false;
        continue;
      }
      if (!started) {
        context.moveTo(point.x, point.y);
        started = true;
      } else {
        context.lineTo(point.x, point.y);
      }
    }
    context.stroke();

    points.forEach(point => {
      if (!point) return;
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fillStyle = COLORS[metricIndex];
      context.fill();
    });
  });

  context.fillStyle = "#77756f";
  context.textAlign = "center";
  context.textBaseline = "top";

  records.forEach((record, index) => {
    const x = records.length === 1
      ? left + plotWidth / 2
      : left + plotWidth * index / (records.length - 1);
    const date = new Date(record.date);
    const label = Number.isNaN(date.getTime())
      ? `Photo ${index + 1}`
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
    context.save();
    context.translate(x, height - bottom + 10);
    context.rotate(-0.25);
    context.fillText(label, 0, 0);
    context.restore();
  });

  const legend = document.createElement("div");
  legend.className = "chart-legend";
  metrics.forEach(key => {
    const item = document.createElement("span");
    item.className = "legend-item";
    const swatch = document.createElement("i");
    swatch.style.background = COLORS[METRICS.indexOf(key)];
    const label = document.createElement("span");
    label.textContent = METRIC_LABELS[key];
    item.append(swatch, label);
    legend.append(item);
  });
  lineCanvas.parentElement.querySelector(".line-legend")?.remove();
  legend.classList.add("line-legend");
  lineCanvas.parentElement.append(legend);
}

function renderProgressSummary() {
  const grid = document.querySelector("#progressGrid");
  const message = document.querySelector("#progressMessage");
  const updated = document.querySelector("#progressUpdated");

  if (!grid || !message || !updated) return;

  grid.replaceChildren();

  const latest = history[0] || null;
  const previous = history[1] || null;

  updated.textContent = latest
    ? `Latest check-in: ${formatDate(latest.date)}`
    : "No check-ins yet";

  if (!latest) {
    message.textContent =
      "Complete an analysis to start tracking your check-ins.";
    return;
  }

  message.textContent = previous
    ? "Here is how your latest reported scores compare with your previous saved check-in. Changes are descriptive, not a medical assessment."
    : "Your first check-in is saved. Complete another analysis later to compare score changes.";

  for (const key of METRICS) {
    const card = document.createElement("article");
    card.className = "progress-metric";

    const label = document.createElement("span");
    label.className = "progress-metric-label";
    label.textContent = METRIC_LABELS[key];

    const current = Number(latest.scores?.[key]);
    const score = document.createElement("strong");
    score.className = "progress-metric-score";
    score.textContent = Number.isFinite(current)
      ? `${Math.round(current)}/100`
      : "Not available";

    const detail = document.createElement("small");
    detail.className = "progress-metric-detail";

    const prior = Number(previous?.scores?.[key]);

    if (!Number.isFinite(current)) {
      detail.textContent = "No score saved for this metric";
    } else if (!previous) {
      detail.textContent = "First recorded score";
    } else if (!Number.isFinite(prior)) {
      detail.textContent = "No previous score to compare";
    } else {
      const difference = Math.round(current - prior);
      const sign = difference > 0 ? "+" : "";
      detail.textContent = difference === 0
        ? "No point change"
        : `${sign}${difference} point${Math.abs(difference) === 1 ? "" : "s"} since last check-in`;
    }

    card.append(label, score, detail);
    grid.append(card);
  }
}

function renderDashboard() {
  const record = currentAnalysis();
  drawPieChart(record);
  drawBarChart(record);
  drawLineChart();
  renderProgressSummary();
}


function renderSkinComparison() {
  const olderPicker = document.querySelector("#comparisonOlder");
  const newerPicker = document.querySelector("#comparisonNewer");
  const message = document.querySelector("#comparisonMessage");
  const results = document.querySelector("#comparisonResults");

  if (!olderPicker || !newerPicker || !message || !results) return;

  const previousOlderId = olderPicker.value;
  const previousNewerId = newerPicker.value;

  olderPicker.replaceChildren();
  newerPicker.replaceChildren();
  results.replaceChildren();

  function addOptions(picker) {
    for (const record of history) {
      const option = document.createElement("option");
      option.value = record.id;
      option.textContent = formatDate(record.date);
      picker.append(option);
    }
  }

  addOptions(olderPicker);
  addOptions(newerPicker);

  if (history.length < 2) {
    olderPicker.disabled = true;
    newerPicker.disabled = true;
    message.textContent =
      "Save at least two analyses to compare your scores.";
    return;
  }

  olderPicker.disabled = false;
  newerPicker.disabled = false;

  const oldestRecord = history[history.length - 1];
  const latestRecord = history[0];

  olderPicker.value = history.some(
    record => record.id === previousOlderId
  ) ? previousOlderId : oldestRecord.id;

  newerPicker.value = history.some(
    record => record.id === previousNewerId
  ) ? previousNewerId : latestRecord.id;

  function showComparison() {
    results.replaceChildren();

    let olderRecord = history.find(
      record => String(record.id) === olderPicker.value
    );
    let newerRecord = history.find(
      record => String(record.id) === newerPicker.value
    );

    if (!olderRecord || !newerRecord) {
      message.textContent = "Choose two saved analyses to compare.";
      return;
    }

    if (olderRecord.id === newerRecord.id) {
      message.textContent =
        "Choose two different check-ins to compare your scores.";
      return;
    }

    // Always compare chronologically, even if the selections are reversed.
    if (new Date(olderRecord.date) > new Date(newerRecord.date)) {
      const temp = olderRecord;
      olderRecord = newerRecord;
      newerRecord = temp;
    }

    const oldScores = olderRecord.scores || {};
    const newScores = newerRecord.scores || {};

    const metrics = [
      ["texture", "Texture"],
      ["pore", "Pores"],
      ["acne", "Acne"],
      ["wrinkle", "Wrinkles"]
    ];

    let comparedCount = 0;

    for (const [key, label] of metrics) {
      const oldValue = oldScores[key];
      const newValue = newScores[key];

      if (
        oldValue === undefined || oldValue === null ||
        newValue === undefined || newValue === null ||
        !Number.isFinite(Number(oldValue)) ||
        !Number.isFinite(Number(newValue))
      ) {
        continue;
      }

      const oldScore = Number(oldValue);
      const newScore = Number(newValue);
      const difference = newScore - oldScore;

      const card = document.createElement("article");
      card.className = "comparison-metric-card";

      const heading = document.createElement("div");
      heading.className = "comparison-metric-heading";

      const title = document.createElement("strong");
      title.textContent = label;

      const change = document.createElement("span");
      change.className = "comparison-change";

      if (difference > 0) {
        change.classList.add("is-increased");
        change.textContent = "↑ " + difference.toFixed(1) + " points";
      } else if (difference < 0) {
        change.classList.add("is-decreased");
        change.textContent =
          "↓ " + Math.abs(difference).toFixed(1) + " points";
      } else {
        change.classList.add("is-unchanged");
        change.textContent = "No change";
      }

      heading.append(title, change);

      const values = document.createElement("div");
      values.className = "comparison-values";

      const earlier = document.createElement("span");
      earlier.textContent = "Earlier: " + oldScore.toFixed(1);

      const later = document.createElement("span");
      later.textContent = "Later: " + newScore.toFixed(1);

      values.append(earlier, later);

      const tracks = document.createElement("div");
      tracks.className = "comparison-tracks";

      const oldTrack = document.createElement("div");
      oldTrack.className = "comparison-track";
      oldTrack.setAttribute("aria-label", label + " earlier score");

      const oldFill = document.createElement("span");
      oldFill.className = "comparison-fill comparison-fill-old";
      oldFill.style.width =
        Math.max(0, Math.min(100, oldScore)) + "%";
      oldTrack.append(oldFill);

      const newTrack = document.createElement("div");
      newTrack.className = "comparison-track";
      newTrack.setAttribute("aria-label", label + " later score");

      const newFill = document.createElement("span");
      newFill.className = "comparison-fill comparison-fill-new";
      newFill.style.width =
        Math.max(0, Math.min(100, newScore)) + "%";
      newTrack.append(newFill);

      tracks.append(oldTrack, newTrack);
      card.append(heading, values, tracks);
      results.append(card);
      comparedCount++;
    }

    message.textContent = comparedCount
      ? "Comparing " + formatDate(olderRecord.date) +
        " with " + formatDate(newerRecord.date) +
        ". Changes show the later score minus the earlier score."
      : "These two analyses do not share comparable saved scores.";
  }

  olderPicker.onchange = showComparison;
  newerPicker.onchange = showComparison;

  showComparison();
}

analysisPicker.addEventListener("change", () => {
  selectedAnalysisId = analysisPicker.value;
  renderHistory();
  renderDashboard();
});

document.querySelector("#clearHistoryButton").addEventListener("click", () => {
  if (!confirm("Clear all saved SkinWise photo history from this browser?")) return;
  history = [];
  selectedAnalysisId = null;
  persistHistory();
  renderHistory();
  renderDashboard();
  showStatus("Saved photo history cleared.");
});

const ROUTINES = {
  simple: {
    title: "A simple starter routine",
    intro: "Start with the basics before adding targeted products.",
    morning: ["Gentle cleanser, or rinse with water if cleansing leaves your skin tight", "Moisturizer suited to your skin", "Broad-spectrum SPF 30+ sunscreen"],
    evening: ["Gentle cleanser", "Moisturizer"]
  },
  hydration: {
    title: "A hydration-focused routine",
    intro: "Look for fragrance-free moisturizer with ingredients such as glycerin or ceramides.",
    morning: ["Gentle cleanser", "Moisturizer applied to slightly damp skin", "Broad-spectrum SPF 30+ sunscreen"],
    evening: ["Gentle cleanser", "Moisturizer; consider a simple hydrating product if needed"]
  },
  texture: {
    title: "A texture-conscious routine",
    intro: "Keep the basics consistent. Avoid aggressive scrubbing and introduce only one new cosmetic product at a time.",
    morning: ["Gentle cleanser", "Moisturizer", "Broad-spectrum SPF 30+ sunscreen"],
    evening: ["Gentle cleanser", "Moisturizer", "Optional: consider a mild cosmetic exfoliant only if tolerated"]
  },
  pores: {
    title: "A routine for the look of visible pores",
    intro: "Pore appearance is normal. Gentle cleansing and consistent moisturization may help your skin look more even.",
    morning: ["Gentle cleanser", "Lightweight moisturizer if preferred", "Broad-spectrum SPF 30+ sunscreen"],
    evening: ["Gentle cleanser", "Moisturizer", "Optional: a mild salicylic-acid cosmetic product if suitable and tolerated"]
  },
  blemishes: {
    title: "A gentle blemish-conscious routine",
    intro: "Avoid picking and harsh combinations. Persistent or painful blemishes deserve advice from a qualified clinician.",
    morning: ["Gentle cleanser", "Non-comedogenic moisturizer if available", "Broad-spectrum SPF 30+ sunscreen"],
    evening: ["Gentle cleanser", "Moisturizer", "Introduce any targeted cosmetic product cautiously and follow its label"]
  },
  aging: {
    title: "A healthy-looking skin routine",
    intro: "Sun protection and a routine you can maintain are useful foundations for cosmetic skin care.",
    morning: ["Gentle cleanser", "Moisturizer", "Broad-spectrum SPF 30+ sunscreen"],
    evening: ["Gentle cleanser", "Moisturizer", "Optional: consider a beginner cosmetic retinol only after checking suitability and product directions"]
  },
  sensitive: {
    title: "A gentle, minimal routine",
    intro: "Choose fragrance-free products where possible. Patch-test new products and stop if irritation occurs.",
    morning: ["Gentle rinse or mild cleanser", "Fragrance-free moisturizer", "Broad-spectrum sunscreen that your skin tolerates"],
    evening: ["Mild cleanser", "Fragrance-free moisturizer"]
  }
};

function addTextElement(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function renderRecommendations(event) {
  event.preventDefault();

  const goal = document.querySelector("#skinGoal").value;
  const sensitivity = document.querySelector("#skinSensitivity").value;
  const budget = document.querySelector("#skinBudget").value;
  const routine = ROUTINES[goal] || ROUTINES.simple;
  const target = document.querySelector("#recommendationResults");
  target.replaceChildren();

  const card = document.createElement("article");
  card.className = "routine-card recommendation-card";
  addTextElement(card, "p", "YOUR SUGGESTED ROUTINE", "section-kicker");
  addTextElement(card, "h3", routine.title);
  addTextElement(card, "p", routine.intro);

  if (sensitivity === "sensitive") {
    addTextElement(card, "p", "Sensitivity preference: keep the routine minimal, fragrance-free where possible, and patch-test new products.", "recommendation-note");
  } else if (sensitivity === "unsure") {
    addTextElement(card, "p", "Sensitivity preference: introduce one new product at a time so you can notice how your skin responds.", "recommendation-note");
  }

  const budgetText = {
    low: "Budget approach: prioritize an affordable cleanser, moisturizer and sunscreen; you do not need a large routine.",
    mid: "Budget approach: spend selectively on products that fit your routine; simple basics can be enough.",
    flexible: "Budget approach: compare ingredients and tolerability rather than assuming a higher price means better results."
  };
  addTextElement(card, "p", budgetText[budget], "recommendation-note");

  const columns = document.createElement("div");
  columns.className = "routine-columns";

  const morning = document.createElement("div");
  addTextElement(morning, "h4", "Morning");
  const morningList = document.createElement("ul");
  routine.morning.forEach(step => addTextElement(morningList, "li", step));
  morning.append(morningList);

  const evening = document.createElement("div");
  addTextElement(evening, "h4", "Evening");
  const eveningList = document.createElement("ul");
  routine.evening.forEach(step => addTextElement(eveningList, "li", step));
  evening.append(eveningList);

  columns.append(morning, evening);
  card.append(columns);
  addTextElement(card, "p", "These are general cosmetic suggestions, not medical advice. Check labels, consider allergies and patch-test new products. Avoid introducing several active ingredients at once.", "chart-footnote");
  target.append(card);
}

document.querySelector("#recommendationForm").addEventListener("submit", renderRecommendations);
function validateSkinImage(file) {
  if (!file) {
    throw new Error("Please select a photo first.");
  }

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    throw new Error("Please select a JPG or PNG image.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("This image is larger than 10 MB. Please choose a smaller photo.");
  }

  if (file.size === 0) {
    throw new Error("The selected image file is empty. Please choose another photo.");
  }

  return true;
}

analyzeButton.addEventListener("click", async () => {
  if (!selectedFile) {
    showStatus("Choose a photo before starting your analysis.", true);
    return;
  }

  console.log("SKINWISE FILE DEBUG", {
    name: selectedFile.name,
    type: selectedFile.type,
    size: selectedFile.size,
    inputFileCount: photoInput.files ? photoInput.files.length : "unavailable",
    inputFileName: photoInput.files && photoInput.files[0]
      ? photoInput.files[0].name
      : "none",
    sameFile: !!(photoInput.files && photoInput.files[0] === selectedFile)
  });

  resetStatus();
  resultsSection.hidden = true;

  try {
  validateSkinImage(selectedFile);
} catch (error) {
  showStatus(error.message, true);
  return;
}

  analyzeButton.disabled = true;
  analyzeButton.innerHTML = "<span>Analyzing your photo…</span><span>◌</span>";
  showStatus("Preparing your photo and contacting YouCam AI. This can take a little while.");
  try {
    const formData = new FormData();
    formData.append("photo", selectedFile);

    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData
    });

    const body = await response.json().catch(() => ({}));

    if (response.status === 202 && body.pending) {
      showStatus(`${body.message} Task ID: ${body.taskId}.`, true);
      return;
    }

    if (!response.ok || !body.ok) {
      throw new Error(body.error || "Analysis failed. Please try again.");
    }

    resetStatus();
    const scores = getScores(body.result);
    renderResults(body.result);

    if (scores.length) {
      await saveAnalysis(scores);
      renderHistory();
      renderDashboard();
    }

    showStatus("Your YouCam AI skin analysis is complete.");
  } catch (error) {
    showStatus(error.message || "Something went wrong. Check your connection and try again.", true);
  } finally {
    analyzeButton.disabled = !selectedFile;
    analyzeButton.innerHTML = "<span>Analyze my skin</span><span aria-hidden=\"true\">↗</span>";
  }
});

newAnalysisButton.addEventListener("click", () => {
  resultsSection.hidden = true;
  photoInput.value = "";
  selectedFile = null;
  preview.removeAttribute("src");
  preview.hidden = true;
  placeholder.hidden = false;
  analyzeButton.disabled = true;
  resetStatus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("resize", () => {
  if (!resultsSection.hidden) renderDashboard();
});

renderHistory();
renderDashboard();



function createSkinWisePrintReport(analysisId = null) {
  const oldReport = document.querySelector("#skinwisePrintReport");
  if (oldReport) oldReport.remove();

  const report = document.createElement("main");
  report.id = "skinwisePrintReport";

  const brand = document.createElement("div");
  brand.className = "pdf-report-brand";
  brand.textContent = "SkinWise AI";

  const heading = document.createElement("h1");
  heading.className = "pdf-report-title";
  heading.textContent = "Skin Analysis Report";

  const subtitle = document.createElement("p");
  subtitle.className = "pdf-report-subtitle";
  subtitle.textContent =
    "Personal Skin Analysis & Progress Summary";

  report.append(brand, heading, subtitle);

  const requestedIndex = analysisId == null
    ? 0
    : history.findIndex(
        item => String(item.id) === String(analysisId)
      );

  const reportIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const latest = history[reportIndex] || null;
  const previous = history[reportIndex + 1] || null;

  const date = document.createElement("p");
  date.textContent = latest
    ? `Analysis date: ${formatDate(latest.date)}`
    : "No saved analysis is available yet.";
  report.append(date);

  const note = document.createElement("p");
  note.textContent =
    "This report presents AI-generated cosmetic scores. YouCam describes higher scores as more favorable. Scores are not medical measurements or a diagnosis.";
  report.append(note);

  const scoreHeading = document.createElement("h2");
  scoreHeading.textContent = "Latest Scores";
  report.append(scoreHeading);

  const table = document.createElement("table");
  table.className = "pdf-report-table";

  const header = document.createElement("tr");

  for (const labelText of [
    "Metric",
    "Latest score",
    "Change since previous check-in"
  ]) {
    const th = document.createElement("th");
    th.textContent = labelText;
    header.append(th);
  }

  table.append(header);

  for (const key of METRICS) {
    const row = document.createElement("tr");

    const name = document.createElement("td");
    name.textContent = METRIC_LABELS[key];

    const scoreCell = document.createElement("td");
    const current = Number(latest?.scores?.[key]);

    scoreCell.textContent = Number.isFinite(current)
      ? `${Math.round(current)}/100`
      : "Not available";

    const changeCell = document.createElement("td");
    const prior = Number(previous?.scores?.[key]);

    if (!latest || !Number.isFinite(current)) {
      changeCell.textContent = "Not available";
    } else if (!previous) {
      changeCell.textContent = "First check-in";
    } else if (!Number.isFinite(prior)) {
      changeCell.textContent = "No previous score";
    } else {
      const difference = Math.round(current - prior);

      if (difference > 0) {
        changeCell.textContent =
          `+${difference} points (more favorable numerically)`;
      } else if (difference < 0) {
        changeCell.textContent =
          `${difference} points (less favorable numerically)`;
      } else {
        changeCell.textContent = "No point change";
      }
    }

    row.append(name, scoreCell, changeCell);
    table.append(row);
  }

  report.append(table);

  const guideHeading = document.createElement("h2");
  guideHeading.textContent = "Understanding Your Skin Results";
  report.append(guideHeading);

  const metricGuides = [
    {
      key: "texture",
      title: "Texture",
      meaning:
        "Analyzes the visible appearance of the skin surface. It does not directly measure hydration or nutrient levels.",
      suggestion:
        "Suggested care: Cleanse gently, use a moisturizer suited to your skin, and apply broad-spectrum SPF 30+ sunscreen during the day."
    },
    {
      key: "pore",
      title: "Pores",
      meaning:
        "Analyzes the appearance of visible pores. A score cannot establish why pores are prominent or whether they are blocked.",
      suggestion:
        "Suggested care: Cleanse gently, avoid squeezing or harsh scrubbing, and consider products labelled non-comedogenic."
    },
    {
      key: "acne",
      title: "Acne",
      meaning:
        "Detects acne-related features visible in the photo. It cannot diagnose acne or determine its underlying cause.",
      suggestion:
        "Suggested care: Choose gentle, non-comedogenic skincare. Seek professional advice for painful, severe, or persistent breakouts."
    },
    {
      key: "wrinkle",
      title: "Wrinkles",
      meaning:
        "Analyzes the appearance of visible wrinkles and fine lines. Lighting, facial expression, and photo conditions can influence results.",
      suggestion:
        "Suggested care: Moisturize regularly and use broad-spectrum SPF 30+ sunscreen to help protect against sun damage."
    }
  ];

  for (const metric of metricGuides) {
    const metricHeading = document.createElement("h3");
    metricHeading.textContent = metric.title;

    const currentScore = Number(latest?.scores?.[metric.key]);
    const previousScore = Number(previous?.scores?.[metric.key]);

    const meaning = document.createElement("p");
    meaning.textContent = metric.meaning;

    const suggestion = document.createElement("p");
    suggestion.textContent = metric.suggestion;

    report.append(metricHeading, meaning);

    if (Number.isFinite(currentScore)) {
      const scoreMeaning = document.createElement("p");

      if (
        previous &&
        Number.isFinite(previousScore)
      ) {
        const difference =
          Math.round(currentScore - previousScore);

        if (difference < 0) {
          scoreMeaning.textContent =
            `Your recorded score changed by ${difference} points. This is a less favorable numerical score, but it does not identify the cause. Compare photos under similar conditions.`;
        } else if (difference > 0) {
          scoreMeaning.textContent =
            `Your recorded score changed by +${difference} points. This is a more favorable numerical score, but it does not prove which factor caused the change.`;
        } else {
          scoreMeaning.textContent =
            "Your recorded score has no numerical change from the previous saved check-in.";
        }
      } else {
        scoreMeaning.textContent =
          "There is no earlier saved score for this metric to compare.";
      }

      report.append(scoreMeaning);
    }

    report.append(suggestion);
  }

  const generalAdviceHeading = document.createElement("h2");
  generalAdviceHeading.textContent = "How to Use This Report";

  const generalAdvice = document.createElement("p");
  generalAdvice.textContent =
    "Use the scores to compare your own saved check-ins, not to diagnose a condition. Try to take photos with similar lighting, camera distance, and facial expression. Introduce skincare products gradually and stop using a product if it causes significant irritation.";

  const limitation = document.createElement("p");
  limitation.textContent =
    "A score change alone cannot confirm dryness, dehydration, poor nutrition, blocked pores, or a medical condition. If you have persistent or concerning skin symptoms, consult a qualified healthcare professional.";

  report.append(
    generalAdviceHeading,
    generalAdvice,
    limitation
  );

  const chartsHeading = document.createElement("h2");
  chartsHeading.textContent = "Analysis Charts";
  report.append(chartsHeading);

  const chartDescriptions = {
    pieChart:
      "What it means: Displays the latest recorded metric scores for visual comparison. The chart does not diagnose a skin condition.",
    barChart:
      "What it means: Compares the recorded Texture, Pores, Acne, and Wrinkles scores. A higher YouCam score is more favorable on its scoring scale, but it is not a medical measurement.",
    lineChart:
      "What it means: Displays saved scores over time so you can observe numerical trends. Differences can also reflect lighting, camera distance, facial expression, and image quality."
  };

  for (const [id, label] of [
    ["pieChart", "Score distribution"],
    ["barChart", "Latest score comparison"],
    ["lineChart", "Saved analysis history"]
  ]) {
    const canvas = document.getElementById(id);
    if (!canvas) continue;

    try {
      const chartImage = document.createElement("img");
      chartImage.alt = label;
      chartImage.src = canvas.toDataURL("image/png");
      chartImage.className = "pdf-report-chart";

      const chartTitle = document.createElement("h3");
      chartTitle.textContent = label;

      const explanation = document.createElement("p");
      explanation.className = "pdf-report-chart-explanation";
      explanation.textContent =
        chartDescriptions[id] ||
        "This chart visualizes cosmetic analysis results.";

      report.append(chartTitle, chartImage, explanation);
    } catch (error) {
      const unavailable = document.createElement("p");
      unavailable.textContent =
        `${label}: chart image unavailable.`;
      report.append(unavailable);
    }
  }

  const footer = document.createElement("p");
  footer.className = "pdf-report-footer";
  footer.textContent =
    "Generated by SkinWise AI | AI-generated cosmetic information, not a medical diagnosis.";
  report.append(footer);

  document.body.append(report);
}




const PDF_REPORT_HISTORY_KEY = "skinwise-pdf-report-history-v1";
const MAX_PDF_REPORT_RECORDS = 20;

function readPdfReportHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(PDF_REPORT_HISTORY_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Could not read PDF report history:", error);
    return [];
  }
}

function writePdfReportHistory(records) {
  try {
    localStorage.setItem(
      PDF_REPORT_HISTORY_KEY,
      JSON.stringify(records.slice(0, MAX_PDF_REPORT_RECORDS))
    );
    return true;
  } catch (error) {
    console.warn("Could not save PDF report history:", error);
    alert("The PDF can still be printed, but its history record could not be saved in this browser.");
    return false;
  }
}

function renderPdfReportHistory() {
  const list = document.querySelector("#pdfReportHistoryList");
  const empty = document.querySelector("#pdfReportHistoryEmpty");
  const count = document.querySelector("#pdfReportHistoryCount");
  const clearButton = document.querySelector("#clearPdfReportHistoryBtn");

  if (!list || !empty || !count || !clearButton) return;

  const records = readPdfReportHistory();
  list.replaceChildren();

  count.textContent = `${records.length} report${records.length === 1 ? "" : "s"}`;
  empty.hidden = records.length > 0;
  clearButton.hidden = records.length === 0;

  for (const record of records) {
    const item = document.createElement("article");
    item.className = "pdf-history-item";

    const info = document.createElement("div");
    info.className = "pdf-history-info";

    const title = document.createElement("strong");
    title.textContent = "Skin Analysis Report";

    const date = document.createElement("span");
    date.className = "pdf-history-date";

    let formattedDate = record.createdAt || "";
    try {
      if (record.createdAt) {
        formattedDate = new Date(record.createdAt).toLocaleString();
      }
    } catch (_) {}

    date.textContent = `Created: ${formattedDate || "Date unavailable"}`;

    const analysisDate = document.createElement("span");
    analysisDate.className = "pdf-history-date";
    let analysisLabel = "Analysis unavailable";

    const linkedAnalysis = history.find(
      analysis => String(analysis.id) === String(record.analysisId)
    );

    if (linkedAnalysis) {
      analysisLabel = `Analysis: ${formatDate(linkedAnalysis.date)}`;
    }

    analysisDate.textContent = analysisLabel;
    info.append(title, date, analysisDate);

    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "pdf-history-download";
    downloadButton.textContent = "Download Again";
    downloadButton.dataset.redownloadReport = record.id;

    item.append(info, downloadButton);
    list.append(item);
  }
}

function addPdfReportHistoryRecord(analysisId) {
  const records = readPdfReportHistory();

  records.unshift({
    id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    analysisId: analysisId == null ? null : String(analysisId),
    createdAt: new Date().toISOString()
  });

  writePdfReportHistory(records);
  renderPdfReportHistory();
}

if (!window.skinWisePdfHandlerAdded) {
  window.skinWisePdfHandlerAdded = true;

  document.addEventListener("click", async (event) => {
    const downloadAgain = event.target.closest("[data-redownload-report]");
    const mainDownload = event.target.closest("#downloadReportBtn");
    const clearHistory = event.target.closest("#clearPdfReportHistoryBtn");

    if (clearHistory) {
      if (confirm("Clear all saved PDF report history records? This will not delete downloaded PDF files or photo-analysis history.")) {
        localStorage.removeItem(PDF_REPORT_HISTORY_KEY);
        renderPdfReportHistory();
      }
      return;
    }

    if (!downloadAgain && !mainDownload) return;

    const reportRecords = readPdfReportHistory();
    const previousRecord = downloadAgain
      ? reportRecords.find(item => item.id === downloadAgain.dataset.redownloadReport)
      : null;

    let targetAnalysis = previousRecord
      ? history.find(item => String(item.id) === String(previousRecord.analysisId))
      : history[0];

    if (!targetAnalysis) {
      alert("No matching saved analysis was found. Run a skin analysis and save it before creating a report.");
      return;
    }

    // Show the selected analysis in the existing dashboard before capturing charts.
    selectedAnalysisId = targetAnalysis.id;
    const picker = document.querySelector("#analysisPicker");
    if (picker) picker.value = String(targetAnalysis.id);
    renderDashboard();

    const button = mainDownload || downloadAgain;
    if (button) button.disabled = true;

    try {
      createSkinWisePrintReport(targetAnalysis.id);

      const report = document.querySelector("#skinwisePrintReport");
      const images = report ? [...report.querySelectorAll("img")] : [];

      await Promise.all(images.map(async (img) => {
        if (!img.complete) {
          await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }

        if (img.decode) {
          try {
            await img.decode();
          } catch (_) {}
        }
      }));

      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      await new Promise(resolve => setTimeout(resolve, 300));

      document.body.classList.add("printing-skinwise-report");

      // Store the report request when the print dialog is opened.
      addPdfReportHistoryRecord(targetAnalysis.id);

      const cleanup = () => {
        document.body.classList.remove("printing-skinwise-report");
        document.querySelector("#skinwisePrintReport")?.remove();
        if (button) button.disabled = false;
        window.removeEventListener("afterprint", cleanup);
      };

      window.addEventListener("afterprint", cleanup, { once: true });
      window.print();

      setTimeout(() => {
        if (document.body.classList.contains("printing-skinwise-report")) {
          cleanup();
        }
      }, 60000);
    } catch (error) {
      console.error("PDF report error:", error);
      document.querySelector("#skinwisePrintReport")?.remove();
      document.body.classList.remove("printing-skinwise-report");
      if (button) button.disabled = false;
      alert("Could not prepare the report. Please try again.");
    }
  });
}

renderPdfReportHistory();


// SKINWISE NAVIGATION VISIBILITY FIX
(() => {
  document.querySelectorAll(
    '.site-nav a[href="#dashboardSection"], .site-nav a[href="#gallery"], .site-nav a[href="#routine"]'
  ).forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const results = document.getElementById("resultsSection");
      const target = document.querySelector(link.getAttribute("href"));

      if (results) {
        results.hidden = false;
      }

      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        });
      }

      window.history.replaceState(null, "", link.getAttribute("href"));
    });
  });
})();
