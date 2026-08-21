const STORAGE_KEY = "flashcards.v1";
const PENDING_OPS_KEY = "flashcards.pendingOps.v2";
const LEGACY_PENDING_KEY = "flashcards.cloudPending.v1";
const API_URL = "https://flashcards-api.ajmal-farzam.workers.dev";

const state = {
  cards: loadCards(),
  pendingOps: loadPendingOps(),
  currentId: null,
  revealed: false,
  syncInFlight: false,
};

const elements = {
  tabs: [...document.querySelectorAll(".tab")],
  views: {
    study: document.getElementById("studyView"),
    cards: document.getElementById("cardsView"),
  },
  cardCount: document.getElementById("cardCount"),
  syncStatus: document.getElementById("syncStatus"),
  emptyStudy: document.getElementById("emptyStudy"),
  studyArea: document.getElementById("studyArea"),
  flashcard: document.getElementById("flashcard"),
  cardSideLabel: document.getElementById("cardSideLabel"),
  cardText: document.getElementById("cardText"),
  cardAction: document.getElementById("cardAction"),
  nextButton: document.getElementById("nextButton"),
  emptyAddButton: document.getElementById("emptyAddButton"),
  showFormButton: document.getElementById("showFormButton"),
  cardForm: document.getElementById("cardForm"),
  editId: document.getElementById("editId"),
  promptInput: document.getElementById("promptInput"),
  answerInput: document.getElementById("answerInput"),
  formError: document.getElementById("formError"),
  cancelButton: document.getElementById("cancelButton"),
  saveButton: document.getElementById("saveButton"),
  emptyLibrary: document.getElementById("emptyLibrary"),
  cardList: document.getElementById("cardList"),
  cardItemTemplate: document.getElementById("cardItemTemplate"),
};

function normalisePrompt(value) {
  return String(value)
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-ES");
}

function normaliseCard(card) {
  const createdAt = card.createdAt || card.created_at || new Date().toISOString();
  return {
    id: String(card.id),
    prompt: String(card.prompt),
    answer: String(card.answer),
    createdAt,
    updatedAt: card.updatedAt || card.updated_at || createdAt,
  };
}

function loadCards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normaliseCard) : [];
  } catch {
    return [];
  }
}

function saveCardsLocally() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cards));
}

function loadPendingOps() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_OPS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingOps() {
  localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(state.pendingOps));
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setSyncStatus(message, status = "syncing") {
  elements.syncStatus.textContent = message;
  elements.syncStatus.className = `sync-status ${status}`;
}

function showFormError(message) {
  elements.formError.textContent = message;
  elements.formError.classList.toggle("hidden", !message);
}

function switchView(viewName) {
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });

  Object.entries(elements.views).forEach(([name, view]) => {
    view.classList.toggle("active", name === viewName);
  });

  if (viewName === "study") {
    ensureCurrentCard();
    renderStudy();
  } else {
    renderLibrary();
  }
}

function pickRandomCard() {
  if (!state.cards.length) {
    state.currentId = null;
    state.revealed = false;
    return;
  }

  if (state.cards.length === 1) {
    state.currentId = state.cards[0].id;
    state.revealed = false;
    return;
  }

  const candidates = state.cards.filter((card) => card.id !== state.currentId);
  const next = candidates[Math.floor(Math.random() * candidates.length)];
  state.currentId = next.id;
  state.revealed = false;
}

function ensureCurrentCard() {
  const exists = state.cards.some((card) => card.id === state.currentId);
  if (!exists) pickRandomCard();
}

function getCurrentCard() {
  return state.cards.find((card) => card.id === state.currentId) || null;
}

function renderCount() {
  const count = state.cards.length;
  elements.cardCount.textContent = `${count} ${count === 1 ? "card" : "cards"}`;
}

function renderStudy() {
  renderCount();

  if (!state.cards.length) {
    elements.emptyStudy.classList.remove("hidden");
    elements.studyArea.classList.add("hidden");
    return;
  }

  elements.emptyStudy.classList.add("hidden");
  elements.studyArea.classList.remove("hidden");

  ensureCurrentCard();
  const card = getCurrentCard();
  if (!card) return;

  if (state.revealed) {
    elements.cardSideLabel.textContent = "ANSWER";
    elements.cardText.textContent = card.answer;
    elements.cardAction.textContent = "Tap to show prompt";
    elements.flashcard.setAttribute(
      "aria-label",
      `Answer: ${card.answer}. Tap to show prompt.`
    );
  } else {
    elements.cardSideLabel.textContent = "PROMPT";
    elements.cardText.textContent = card.prompt;
    elements.cardAction.textContent = "Tap to reveal";
    elements.flashcard.setAttribute(
      "aria-label",
      `Prompt: ${card.prompt}. Tap to reveal answer.`
    );
  }
}

function renderLibrary() {
  renderCount();
  elements.cardList.innerHTML = "";
  elements.emptyLibrary.classList.toggle("hidden", state.cards.length > 0);

  const fragment = document.createDocumentFragment();

  state.cards.forEach((card) => {
    const item = elements.cardItemTemplate.content.cloneNode(true);
    const article = item.querySelector(".library-card");
    const prompt = item.querySelector(".library-prompt");
    const answer = item.querySelector(".library-answer");
    const editButton = item.querySelector(".edit-button");
    const deleteButton = item.querySelector(".delete-button");

    article.dataset.id = card.id;
    prompt.textContent = card.prompt;
    answer.textContent = card.answer;
    editButton.addEventListener("click", () => openForm(card));
    deleteButton.addEventListener("click", () => deleteCard(card.id));
    fragment.appendChild(item);
  });

  elements.cardList.appendChild(fragment);
}

function renderAll() {
  ensureCurrentCard();
  renderStudy();

  // With large decks, avoid building thousands of library rows while the
  // user is on the Study tab. The Cards tab renders them only when opened.
  if (elements.views.cards.classList.contains("active")) {
    renderLibrary();
  }
}

function openForm(card = null) {
  elements.cardForm.classList.remove("hidden");
  showFormError("");

  if (card) {
    elements.editId.value = card.id;
    elements.promptInput.value = card.prompt;
    elements.answerInput.value = card.answer;
    elements.saveButton.textContent = "Save changes";
  } else {
    elements.cardForm.reset();
    elements.editId.value = "";
    elements.saveButton.textContent = "Save card";
  }

  elements.promptInput.focus();
  elements.cardForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeForm() {
  elements.cardForm.classList.add("hidden");
  elements.cardForm.reset();
  elements.editId.value = "";
  elements.saveButton.textContent = "Save card";
  showFormError("");
}

function findDuplicatePrompt(prompt, excludingId = "") {
  const key = normalisePrompt(prompt);
  return state.cards.find(
    (card) => card.id !== excludingId && normalisePrompt(card.prompt) === key
  );
}

function queueUpsert(card) {
  state.pendingOps = state.pendingOps.filter((op) => op.id !== card.id);
  state.pendingOps.push({ type: "upsert", id: card.id, card: { ...card } });
  savePendingOps();
}

function queueDelete(id) {
  state.pendingOps = state.pendingOps.filter((op) => op.id !== id);
  state.pendingOps.push({ type: "delete", id });
  savePendingOps();
}

function submitCard(event) {
  event.preventDefault();

  const prompt = elements.promptInput.value.trim();
  const answer = elements.answerInput.value.trim();
  const editId = elements.editId.value;

  if (!prompt || !answer) return;

  const duplicate = findDuplicatePrompt(prompt, editId);
  if (duplicate) {
    showFormError(`A card for “${duplicate.prompt}” already exists.`);
    return;
  }

  showFormError("");
  const now = new Date().toISOString();
  let changedCard;

  if (editId) {
    const card = state.cards.find((item) => item.id === editId);
    if (!card) return;
    card.prompt = prompt;
    card.answer = answer;
    card.updatedAt = now;
    changedCard = card;
  } else {
    changedCard = {
      id: makeId(),
      prompt,
      answer,
      createdAt: now,
      updatedAt: now,
    };
    state.cards.push(changedCard);
  }

  saveCardsLocally();
  queueUpsert(changedCard);
  closeForm();
  renderAll();
  flushPendingOps();
}

function deleteCard(id) {
  const card = state.cards.find((item) => item.id === id);
  if (!card) return;

  if (!window.confirm(`Delete "${card.prompt}"?`)) return;

  state.cards = state.cards.filter((item) => item.id !== id);
  if (state.currentId === id) {
    state.currentId = null;
    state.revealed = false;
  }

  saveCardsLocally();
  queueDelete(id);
  renderAll();
  flushPendingOps();
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Some successful DELETE responses may have no useful body.
  }

  if (!response.ok) {
    const error = new Error(body?.error || `Cloud request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return body;
}

async function fetchCloudCards() {
  const body = await apiRequest("/cards", { method: "GET" });
  if (!body || !Array.isArray(body.cards)) {
    throw new Error("Cloud returned an invalid cards response");
  }
  return body.cards.map(normaliseCard);
}

async function syncOperation(op) {
  const encodedId = encodeURIComponent(op.id);

  if (op.type === "delete") {
    await apiRequest(`/cards/${encodedId}`, { method: "DELETE" });
    return;
  }

  if (op.type === "upsert") {
    await apiRequest(`/cards/${encodedId}`, {
      method: "PUT",
      body: JSON.stringify({
        prompt: op.card.prompt,
        answer: op.card.answer,
        createdAt: op.card.createdAt,
        updatedAt: op.card.updatedAt,
      }),
    });
    return;
  }

  throw new Error("Unknown pending operation");
}

async function replaceLocalFromCloud() {
  const cloudCards = await fetchCloudCards();
  state.cards = cloudCards;
  saveCardsLocally();
  state.currentId = null;
  state.revealed = false;
  renderAll();
}

async function flushPendingOps() {
  if (state.syncInFlight) return;

  if (!navigator.onLine) {
    setSyncStatus(
      state.pendingOps.length ? "Offline — changes pending" : "Offline",
      "offline"
    );
    return;
  }

  state.syncInFlight = true;

  try {
    while (state.pendingOps.length) {
      setSyncStatus(`Syncing ${state.pendingOps.length}…`, "syncing");
      const op = state.pendingOps[0];

      try {
        await syncOperation(op);
      } catch (error) {
        if (error.status === 409) {
          // The database rejected a duplicate prompt. Discard the conflicting
          // local mutation and reload the authoritative cloud collection.
          state.pendingOps.shift();
          savePendingOps();
          await replaceLocalFromCloud();
          setSyncStatus("Duplicate card not saved", "error");
          continue;
        }
        throw error;
      }

      state.pendingOps.shift();
      savePendingOps();
    }

    await replaceLocalFromCloud();
    localStorage.removeItem(LEGACY_PENDING_KEY);
    setSyncStatus("Synced", "synced");
  } catch (error) {
    console.error("Cloud sync failed:", error);
    setSyncStatus(
      navigator.onLine ? "Cloud unavailable" : "Offline — changes pending",
      navigator.onLine ? "error" : "offline"
    );
  } finally {
    state.syncInFlight = false;
  }
}

async function initialiseCloudSync() {
  if (!navigator.onLine) {
    setSyncStatus(
      state.pendingOps.length ? "Offline — changes pending" : "Offline",
      "offline"
    );
    return;
  }

  setSyncStatus("Connecting…", "syncing");

  try {
    // Pending delta operations are always applied first. After that we reload
    // D1 so a direct SQL import or another device is reflected locally.
    if (state.pendingOps.length) {
      await flushPendingOps();
    } else {
      await replaceLocalFromCloud();
      localStorage.removeItem(LEGACY_PENDING_KEY);
      setSyncStatus("Synced", "synced");
    }
  } catch (error) {
    console.error("Initial cloud sync failed:", error);
    setSyncStatus("Cloud unavailable", "error");
  }
}

async function refreshFromCloud() {
  if (!navigator.onLine || state.syncInFlight || state.pendingOps.length) return;

  try {
    setSyncStatus("Syncing…", "syncing");
    await replaceLocalFromCloud();
    setSyncStatus("Synced", "synced");
  } catch (error) {
    console.error("Cloud refresh failed:", error);
    setSyncStatus("Cloud unavailable", "error");
  }
}

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

elements.flashcard.addEventListener("click", () => {
  state.revealed = !state.revealed;
  renderStudy();
});

elements.nextButton.addEventListener("click", () => {
  pickRandomCard();
  renderStudy();
});

elements.showFormButton.addEventListener("click", () => openForm());
elements.emptyAddButton.addEventListener("click", () => {
  switchView("cards");
  openForm();
});
elements.cancelButton.addEventListener("click", closeForm);
elements.cardForm.addEventListener("submit", submitCard);

elements.promptInput.addEventListener("input", () => showFormError(""));

window.addEventListener("online", () => {
  if (state.pendingOps.length) flushPendingOps();
  else refreshFromCloud();
});

window.addEventListener("offline", () => {
  setSyncStatus(
    state.pendingOps.length ? "Offline — changes pending" : "Offline",
    "offline"
  );
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && navigator.onLine) {
    if (state.pendingOps.length) flushPendingOps();
    else refreshFromCloud();
  }
});

renderAll();
initialiseCloudSync();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
