const STORAGE_KEY = "flashcards.v1";
const PENDING_KEY = "flashcards.cloudPending.v1";
const API_URL = "https://flashcards-api.ajmal-farzam.workers.dev";

const state = {
  cards: loadCards(),
  currentId: null,
  revealed: false,
  syncInFlight: false,
  syncRequested: false,
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
  cancelButton: document.getElementById("cancelButton"),
  saveButton: document.getElementById("saveButton"),
  emptyLibrary: document.getElementById("emptyLibrary"),
  cardList: document.getElementById("cardList"),
  cardItemTemplate: document.getElementById("cardItemTemplate"),
};

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

function hasPendingChanges() {
  return localStorage.getItem(PENDING_KEY) === "1";
}

function setPendingChanges(pending) {
  if (pending) {
    localStorage.setItem(PENDING_KEY, "1");
  } else {
    localStorage.removeItem(PENDING_KEY);
  }
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setSyncStatus(message, status = "syncing") {
  elements.syncStatus.textContent = message;
  elements.syncStatus.className = `sync-status ${status}`;
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
  const currentExists = state.cards.some((card) => card.id === state.currentId);
  if (!currentExists) pickRandomCard();
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

  state.cards.forEach((card) => {
    const fragment = elements.cardItemTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".library-card");
    const prompt = fragment.querySelector(".library-prompt");
    const answer = fragment.querySelector(".library-answer");
    const editButton = fragment.querySelector(".edit-button");
    const deleteButton = fragment.querySelector(".delete-button");

    article.dataset.id = card.id;
    prompt.textContent = card.prompt;
    answer.textContent = card.answer;

    editButton.addEventListener("click", () => openForm(card));
    deleteButton.addEventListener("click", () => deleteCard(card.id));

    elements.cardList.appendChild(fragment);
  });
}

function renderAll() {
  ensureCurrentCard();
  renderStudy();
  renderLibrary();
}

function openForm(card = null) {
  elements.cardForm.classList.remove("hidden");

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
}

function markChangedAndSync() {
  saveCardsLocally();
  setPendingChanges(true);

  if (navigator.onLine) {
    queueCloudSync();
  } else {
    setSyncStatus("Offline — changes pending", "offline");
  }
}

function submitCard(event) {
  event.preventDefault();

  const prompt = elements.promptInput.value.trim();
  const answer = elements.answerInput.value.trim();
  const editId = elements.editId.value;

  if (!prompt || !answer) return;

  const now = new Date().toISOString();

  if (editId) {
    const card = state.cards.find((item) => item.id === editId);
    if (card) {
      card.prompt = prompt;
      card.answer = answer;
      card.updatedAt = now;
    }
  } else {
    state.cards.push({
      id: makeId(),
      prompt,
      answer,
      createdAt: now,
      updatedAt: now,
    });
  }

  markChangedAndSync();
  closeForm();
  renderLibrary();

  if (!state.currentId) {
    pickRandomCard();
    renderStudy();
  }
}

function deleteCard(id) {
  const card = state.cards.find((item) => item.id === id);
  if (!card) return;

  const confirmed = window.confirm(`Delete "${card.prompt}"?`);
  if (!confirmed) return;

  state.cards = state.cards.filter((item) => item.id !== id);

  if (state.currentId === id) {
    state.currentId = null;
    state.revealed = false;
  }

  markChangedAndSync();
  renderAll();
}

async function fetchCloudCards() {
  const response = await fetch(`${API_URL}/cards`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Cloud read failed (${response.status})`);
  }

  const body = await response.json();
  if (!body || !Array.isArray(body.cards)) {
    throw new Error("Cloud returned an invalid cards response");
  }

  return body.cards.map(normaliseCard);
}

async function replaceCloudCards(cards) {
  const response = await fetch(`${API_URL}/cards`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ cards }),
  });

  if (!response.ok) {
    let message = `Cloud write failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // Ignore JSON parsing errors and use the HTTP status message.
    }
    throw new Error(message);
  }

  return response.json();
}

async function queueCloudSync() {
  state.syncRequested = true;

  if (state.syncInFlight) return;

  state.syncInFlight = true;

  try {
    while (state.syncRequested || hasPendingChanges()) {
      if (!navigator.onLine) {
        setSyncStatus("Offline — changes pending", "offline");
        break;
      }

      state.syncRequested = false;
      setSyncStatus("Syncing…", "syncing");

      const snapshot = state.cards.map((card) => ({ ...card }));
      const snapshotJson = JSON.stringify(snapshot);

      await replaceCloudCards(snapshot);

      if (JSON.stringify(state.cards) === snapshotJson) {
        setPendingChanges(false);
        setSyncStatus("Synced", "synced");
      } else {
        // A card changed while the previous request was in flight.
        setPendingChanges(true);
        state.syncRequested = true;
      }
    }
  } catch (error) {
    console.error("Cloud sync failed:", error);
    setPendingChanges(true);
    setSyncStatus("Cloud unavailable", navigator.onLine ? "error" : "offline");
  } finally {
    state.syncInFlight = false;
  }
}

async function initialiseCloudSync() {
  if (!navigator.onLine) {
    setSyncStatus(
      hasPendingChanges() ? "Offline — changes pending" : "Offline",
      "offline"
    );
    return;
  }

  setSyncStatus("Connecting…", "syncing");

  try {
    // If this device already has unsynced changes, the local copy is the
    // authoritative one until those changes have been uploaded.
    if (hasPendingChanges()) {
      await queueCloudSync();
      return;
    }

    const cloudCards = await fetchCloudCards();

    // V1 migration / resilience case:
    // if D1 is empty but this browser already has local cards, upload them.
    if (cloudCards.length === 0 && state.cards.length > 0) {
      setPendingChanges(true);
      await queueCloudSync();
      return;
    }

    // Normal case, including restoration on a new/replacement phone:
    // use the cloud copy as the authoritative dataset.
    state.cards = cloudCards;
    saveCardsLocally();
    state.currentId = null;
    state.revealed = false;
    renderAll();
    setSyncStatus("Synced", "synced");
  } catch (error) {
    console.error("Initial cloud sync failed:", error);
    setSyncStatus("Cloud unavailable", "error");
  }
}

async function refreshFromCloud() {
  if (!navigator.onLine || hasPendingChanges() || state.syncInFlight) return;

  try {
    const cloudCards = await fetchCloudCards();

    // Do not destroy a healthy local dataset merely because the remote
    // database unexpectedly became empty. Repopulate D1 instead.
    if (cloudCards.length === 0 && state.cards.length > 0) {
      setPendingChanges(true);
      await queueCloudSync();
      return;
    }

    state.cards = cloudCards;
    saveCardsLocally();
    state.currentId = null;
    state.revealed = false;
    renderAll();
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

window.addEventListener("online", () => {
  if (hasPendingChanges()) {
    queueCloudSync();
  } else {
    refreshFromCloud();
  }
});

window.addEventListener("offline", () => {
  setSyncStatus(
    hasPendingChanges() ? "Offline — changes pending" : "Offline",
    "offline"
  );
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && navigator.onLine) {
    if (hasPendingChanges()) {
      queueCloudSync();
    } else {
      refreshFromCloud();
    }
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
