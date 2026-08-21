# Flashcards PWA

A minimal, installable flashcard app designed primarily for iPhone Safari.

## What it does

* Shows one random flashcard at a time.
* Tap a card to reveal its answer.
* **Next random card** avoids immediately repeating the current card when possible.
* Create, edit and delete flashcards.
* Prevents duplicate cards with the same prompt.
* Stores a local copy of cards on the device/browser.
* Automatically synchronizes card changes to Cloudflare D1.
* Supports offline use after the first successful load.
* Automatically synchronizes pending changes when internet access returns.
* Can be added to the iPhone Home Screen as a Progressive Web App (PWA).
* Requires no user account or login.


## Install on iPhone

1. Open the [Flashcards GitHub Pages site](https://afarzam1.github.io/flashcards/) in **Safari** on your iPhone.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.
4. Tap **Add**.

Flashcards can then be launched directly from its Home Screen icon like a normal app.


## How it works

The app stores flashcards locally in the browser for fast access and offline use, while automatically synchronizing changes to a Cloudflare D1 database through a Cloudflare Worker.

The app uses **per-card delta synchronization**:

* Adding a card creates that card in D1.
* Editing a card updates only that card.
* Deleting a card deletes only that card.
* Opening the app retrieves the current collection from D1.
* Changes made while offline are stored locally and synchronized when connectivity returns.

No user account or authentication is required.

<!-- Worker API:
https://flashcards-api.ajmal-farzam.workers.dev
-->


## Architecture

The application consists of:

* **GitHub Pages** — hosts the PWA.
* **Cloudflare Worker** — provides the API used by the app.
* **Cloudflare D1** — stores the persistent cloud copy of the flashcards.
* **Browser local storage** — provides local/offline storage on the device.
* **Service Worker** — caches the application files so the PWA can run offline.

Card changes are synchronized individually rather than replacing the complete collection.

## Duplicate protection

Cards cannot be created with a prompt that already exists.

Duplicate checking is performed both:

* in the PWA before a card is submitted; and
* in Cloudflare D1 using a unique `prompt_key` database index.

Prompt comparison is case-insensitive and ignores surrounding whitespace, while preserving meaningful Spanish accents.

For example, these are treated as the same prompt:

* `reír`
* `REÍR`
* `Reír`

However, words where an accent changes the meaning remain distinct, such as `si` and `sí`.

## Files

* `index.html` — application markup.
* `styles.css` — appearance and mobile layout.
* `app.js` — flashcard logic, local storage and cloud synchronization.
* `manifest.webmanifest` — PWA metadata.
* `service-worker.js` — application caching and offline support.
* `icons/` — Home Screen and PWA icons.

## Cloud storage and recovery

Cloudflare D1 stores the persistent copy of the flashcard collection.

If local Safari data is cleared or the app is opened on another device, the cards can be retrieved again from D1.

Cloudflare D1 Time Travel also provides point-in-time database recovery. On the free plan, database state can be restored from within the previous 7 days.

## Security

The application intentionally does not currently use authentication.

The Worker API is publicly accessible, so anyone who discovers the API endpoint could potentially:

* read the flashcard collection;
* add cards;
* edit cards; or
* delete cards.

This is an intentional design choice for the current personal-use application and can be changed later by adding authentication or access controls.

