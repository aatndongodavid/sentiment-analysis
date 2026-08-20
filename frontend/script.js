// ============================================================
// Configuration — remplacez par votre nom d'utilisateur Hugging Face
// ============================================================
const HF_USERNAME = "Davidmeilleuraat";
const MODEL_NAME = "sentiment-model"; // nom du dépôt du modèle sur Hugging Face
const API_URL = `https://api-inference.huggingface.co/models/${HF_USERNAME}/${MODEL_NAME}`;
const MAX_AUTO_RETRIES = 2; // nombre de nouvelles tentatives si le modèle est en cold start (503)

// ============================================================
// État de session
// ============================================================
const history = []; // { time, text, label, confidence }

// ============================================================
// Références DOM
// ============================================================
const textInput = document.getElementById("text-input");
const charCount = document.getElementById("char-count");
const analyzeBtn = document.getElementById("analyze-btn");
const clearBtn = document.getElementById("clear-btn");
const copyBtn = document.getElementById("copy-btn");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const hfTokenInput = document.getElementById("hf-token");

const needle = document.getElementById("gauge-needle");
const ticksGroup = document.getElementById("gauge-ticks");
const leds = {
  neg: document.querySelector('[data-led="neg"]'),
  wait: document.querySelector('[data-led="wait"]'),
  pos: document.querySelector('[data-led="pos"]'),
};

const readoutStatus = document.getElementById("readout-status");
const readoutConfidence = document.getElementById("readout-confidence");
const confidenceValue = document.getElementById("confidence-value");

const statTotal = document.getElementById("stat-total");
const statPositive = document.getElementById("stat-positive");
const statNegative = document.getElementById("stat-negative");
const statConfidence = document.getElementById("stat-confidence");

const tape = document.getElementById("tape");
const tapeEmpty = document.getElementById("tape-empty");

// ============================================================
// Jauge — génération des graduations
// ============================================================
const GAUGE_CENTER = { x: 150, y: 170 };
const GAUGE_RADIUS_OUTER = 120;
const GAUGE_RADIUS_INNER = 108;
const GAUGE_MIN_ANGLE = -80; // degrés, position "très négatif"
const GAUGE_MAX_ANGLE = 80;  // degrés, position "très positif"

function polarPoint(cx, cy, radius, angleDeg) {
  // 0deg = tout droit vers le haut, positif vers la droite
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function buildTicks() {
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const angle = GAUGE_MIN_ANGLE + (i * (GAUGE_MAX_ANGLE - GAUGE_MIN_ANGLE)) / steps;
    const outer = polarPoint(GAUGE_CENTER.x, GAUGE_CENTER.y, GAUGE_RADIUS_OUTER, angle);
    const inner = polarPoint(GAUGE_CENTER.x, GAUGE_CENTER.y, GAUGE_RADIUS_INNER, angle);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", inner.x.toFixed(1));
    line.setAttribute("y1", inner.y.toFixed(1));
    line.setAttribute("x2", outer.x.toFixed(1));
    line.setAttribute("y2", outer.y.toFixed(1));
    line.setAttribute("class", "tick");
    ticksGroup.appendChild(line);
  }
}
buildTicks();

function setNeedle(value) {
  // value: -1 (très négatif) .. 0 (incertain) .. 1 (très positif)
  const clamped = Math.max(-1, Math.min(1, value));
  const angle = clamped * GAUGE_MAX_ANGLE;
  needle.style.transform = `rotate(${angle}deg)`;
}

function setNeedleThinking(isThinking) {
  needle.classList.toggle("is-thinking", isThinking);
}

// ============================================================
// LEDs
// ============================================================
function setLed(state) {
  // state: "neg" | "pos" | "wait" | null
  Object.values(leds).forEach((el) => el.classList.remove("is-active"));
  if (state && leds[state]) leds[state].classList.add("is-active");
}

// ============================================================
// Compteur de caractères
// ============================================================
function updateCharCount() {
  const n = textInput.value.length;
  charCount.textContent = `${n} caractère${n === 1 ? "" : "s"}`;
}
textInput.addEventListener("input", updateCharCount);
updateCharCount();

// ============================================================
// Exemples
// ============================================================
document.getElementById("examples").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  textInput.value = chip.dataset.text;
  updateCharCount();
  textInput.focus();
});

// ============================================================
// Effacer
// ============================================================
clearBtn.addEventListener("click", () => {
  textInput.value = "";
  updateCharCount();
  textInput.focus();
  resetReadout();
});

function resetReadout() {
  setNeedle(0);
  setNeedleThinking(false);
  setLed(null);
  readoutStatus.textContent = "En attente d'un texte à analyser.";
  readoutStatus.className = "readout__status";
  readoutConfidence.hidden = true;
  copyBtn.hidden = true;
}

// ============================================================
// Historique / journal de session
// ============================================================
function pushHistory(entry) {
  history.unshift(entry);
  renderHistory();
  renderStats();
}

function renderHistory() {
  if (history.length === 0) {
    tape.innerHTML = "";
    tape.appendChild(tapeEmpty);
    return;
  }
  tapeEmpty.remove();
  tape.innerHTML = "";
  history.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "tape-row";
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.innerHTML = `
      <span class="tape-row__time">${entry.time}</span>
      <span class="tape-row__text" title="${escapeHtml(entry.text)}">${escapeHtml(entry.text)}</span>
      <span class="tape-row__label tape-row__label--${entry.label === "positif" ? "pos" : "neg"}">${entry.label}</span>
      <span class="tape-row__confidence">${entry.confidence}</span>
    `;
    const reload = () => {
      textInput.value = entry.text;
      updateCharCount();
      applyResult(entry.rawLabel, entry.rawScore);
    };
    row.addEventListener("click", reload);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reload(); }
    });
    tape.appendChild(row);
  });
}

function renderStats() {
  const total = history.length;
  statTotal.textContent = String(total);
  if (total === 0) {
    statPositive.textContent = "0%";
    statNegative.textContent = "0%";
    statConfidence.textContent = "—";
    return;
  }
  const positives = history.filter((h) => h.label === "positif").length;
  const negatives = total - positives;
  const avgConfidence = history.reduce((sum, h) => sum + h.rawScore, 0) / total;
  statPositive.textContent = `${Math.round((positives / total) * 100)}%`;
  statNegative.textContent = `${Math.round((negatives / total) * 100)}%`;
  statConfidence.textContent = `${(avgConfidence * 100).toFixed(0)}%`;
}

clearHistoryBtn.addEventListener("click", () => {
  history.length = 0;
  renderHistory();
  renderStats();
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// Application d'un résultat au cadran / au texte de lecture
// ============================================================
function applyResult(rawLabel, rawScore) {
  const isPositive = rawLabel === "LABEL_1";
  const signedValue = isPositive ? rawScore : -rawScore;
  setNeedleThinking(false);
  setNeedle(signedValue);
  setLed(isPositive ? "pos" : "neg");

  readoutStatus.textContent = isPositive
    ? `Sentiment positif`
    : `Sentiment négatif`;
  readoutStatus.className = `readout__status ${isPositive ? "is-positive" : "is-negative"}`;

  readoutConfidence.hidden = false;
  confidenceValue.textContent = `${(rawScore * 100).toFixed(1)}%`;

  copyBtn.hidden = false;
  copyBtn.dataset.summary = `Sentiment ${isPositive ? "positif" : "négatif"} — confiance ${(rawScore * 100).toFixed(1)}%`;
}

// ============================================================
// Appel API avec gestion du cold start (503)
// ============================================================
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callInferenceApi(text, attempt = 0) {
  const headers = { "Content-Type": "application/json" };
  const token = hfTokenInput.value.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ inputs: text }),
  });

  if (response.status === 503 && attempt < MAX_AUTO_RETRIES) {
    let waitSeconds = 4;
    try {
      const body = await response.json();
      if (body && body.estimated_time) waitSeconds = Math.ceil(body.estimated_time);
    } catch (_) { /* corps non JSON, on garde le délai par défaut */ }

    readoutStatus.textContent = `Le modèle se réveille (cold start)… nouvelle tentative dans ${waitSeconds}s.`;
    readoutStatus.className = "readout__status is-error";
    await sleep(waitSeconds * 1000);
    return callInferenceApi(text, attempt + 1);
  }

  return response;
}

// ============================================================
// Analyse principale
// ============================================================
async function analyzeSentiment() {
  const text = textInput.value.trim();

  if (!text) {
    readoutStatus.textContent = "Veuillez entrer un texte avant d'analyser.";
    readoutStatus.className = "readout__status is-error";
    textInput.focus();
    return;
  }

  analyzeBtn.disabled = true;
  setNeedleThinking(true);
  setLed("wait");
  readoutConfidence.hidden = true;
  copyBtn.hidden = true;
  readoutStatus.textContent = "Analyse en cours…";
  readoutStatus.className = "readout__status";

  try {
    const response = await callInferenceApi(text);

    if (!response.ok) {
      readoutStatus.textContent = `Erreur API : ${response.status} ${response.statusText}`;
      readoutStatus.className = "readout__status is-error";
      setNeedleThinking(false);
      setLed(null);
      return;
    }

    const data = await response.json();

    // La réponse pour la classification est [[{label, score}, ...]]
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      const scores = data[0];
      const top = scores.reduce((a, b) => (a.score > b.score ? a : b));

      applyResult(top.label, top.score);

      const isPositive = top.label === "LABEL_1";
      pushHistory({
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        text,
        label: isPositive ? "positif" : "négatif",
        confidence: `${(top.score * 100).toFixed(0)}%`,
        rawLabel: top.label,
        rawScore: top.score,
      });
    } else if (data && data.error) {
      readoutStatus.textContent = `Erreur : ${data.error}`;
      readoutStatus.className = "readout__status is-error";
      setNeedleThinking(false);
      setLed(null);
    } else {
      readoutStatus.textContent = "Réponse inattendue de l'API.";
      readoutStatus.className = "readout__status is-error";
      setNeedleThinking(false);
      setLed(null);
      console.error("Réponse inattendue :", data);
    }
  } catch (error) {
    readoutStatus.textContent = `Erreur réseau : ${error.message}`;
    readoutStatus.className = "readout__status is-error";
    setNeedleThinking(false);
    setLed(null);
  } finally {
    analyzeBtn.disabled = false;
  }
}

analyzeBtn.addEventListener("click", analyzeSentiment);

textInput.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    analyzeSentiment();
  }
});

// ============================================================
// Copier le résultat
// ============================================================
copyBtn.addEventListener("click", async () => {
  const summary = copyBtn.dataset.summary || "";
  try {
    await navigator.clipboard.writeText(summary);
    const original = copyBtn.textContent;
    copyBtn.textContent = "Copié !";
    setTimeout(() => { copyBtn.textContent = original; }, 1500);
  } catch (_) {
    console.warn("Impossible de copier automatiquement.");
  }
});

// ============================================================
// Initialisation
// ============================================================
resetReadout();
