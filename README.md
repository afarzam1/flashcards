# Flashcards PWA

A minimal, installable flashcard app designed for iPhone Safari.

## Cloud Sync Version
This version uses the existing browser storage for fast/offline use and automatically synchronizes the complete flashcard collection to Cloudflare D1 through a Worker.

<!-- Configured Worker URL:

`https://flashcards-api.ajmal-farzam.workers.dev` -->

## Files

- `index.html` — app markup
- `styles.css` — appearance and mobile layout
- `app.js` — flashcard logic and local storage
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — offline caching
- `icons/` — Home Screen/PWA icons

## What it does

- Shows one random flashcard at a time
- Tap a card to reveal its answer
- "Next random card" avoids immediately repeating the current card when possible
- Create, edit and delete flashcards
- Stores cards locally on the device/browser
- Works offline after the first successful load
- Can be added to the iPhone Home Screen
- No account, backend or database required

## Important security note

This version intentionally has no authentication. Anyone who discovers the Worker API
can read or replace the flashcard collection. This matches the current requirements and
can be changed later.

## Current collection size

This deliberately simple whole-collection sync implementation supports up to 900 cards.
That is a practical limit of this V3 design rather than a D1 storage limit. It can be
changed later to per-card synchronization if a larger collection is needed.


## Install it on iPhone

1. Open the [GitHub Pages URL ](https://afarzam1.github.io/flashcards/) in **Safari** on your iPhone.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.
4. Tap **Add**.

You can then launch Flashcards from its Home Screen icon.

