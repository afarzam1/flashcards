const STORAGE_KEY = "flashcards.v1";

const state = {
  cards: loadCards(),
  currentId: null,
  revealed: false,
};

const elements = {
  tabs: [...document.querySelectorAll(".tab")],
  views: {
    study: document.getElementById("studyView"),
    cards: document.getElementById("cardsView"),
  },
  cardCount: document.getElementById("cardCount"),
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

function loadCards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cards));
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function submitCard(event) {
  event.preventDefault();

  const prompt = elements.promptInput.value.trim();
  const answer = elements.answerInput.value.trim();
  const editId = elements.editId.value;

  if (!prompt || !answer) return;

  if (editId) {
    const card = state.cards.find((item) => item.id === editId);
    if (card) {
      card.prompt = prompt;
      card.answer = answer;
    }
  } else {
    state.cards.push({
      id: makeId(),
      prompt,
      answer,
      createdAt: new Date().toISOString(),
    });
  }

  saveCards();
  closeForm();
  renderLibrary();

  if (!state.currentId) {
    pickRandomCard();
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

  saveCards();
  renderLibrary();
  renderStudy();
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

renderCount();
ensureCurrentCard();
renderStudy();
renderLibrary();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
