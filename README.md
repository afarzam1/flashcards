# Flashcards PWA

A minimal, installable flashcard app designed for iPhone Safari.

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

## Important: where your cards are stored

Cards are saved using the browser's local storage.

That means:

- Cards created on your iPhone stay on that iPhone/Safari installation.
- Cards created on your computer are separate from the cards on your iPhone.
- Clearing Safari website data, deleting the website's stored data, or some device-reset scenarios can delete the cards.
- GitHub does not receive or store the flashcard content you create inside the app.

A backup/import feature can be added later if desired.

<!-- ## Publish with GitHub Pages

1. Create a new **public** GitHub repository, for example `flashcards`.
2. Upload all files and folders from this project to the repository root.
3. Commit/push the files.
4. In GitHub, open:
   **Settings → Pages**
5. Under **Build and deployment**, choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
6. Save.
7. GitHub will publish the site at a URL similar to:
   `https://YOUR-USERNAME.github.io/flashcards/`

The project uses relative paths, so it works correctly from a GitHub Pages project subdirectory. -->

## Install it on iPhone

1. Open the GitHub Pages URL in **Safari** on your iPhone.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.
4. Tap **Add**.

You can then launch Flashcards from its Home Screen icon.

