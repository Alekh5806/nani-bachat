# Conventions

## Language

- Repo files, code, comments, commit messages: **English only.**
- UI text is English. Titles are Title Case.

## Folders

```
mobile/
  App.js                 providers, fonts, navigation container
  assets/                images, avatar/ (14 PNG), login/
  src/
    components/          shared UI (see components.md)
    config/              api.js (axios), toastConfig.js
    navigation/          MainNavigator, AuthNavigator
    screens/             one file per screen
    store/               zustand stores (auth, portfolio, theme, logo)
    theme/               colors.js (tokens), fonts.js
    utils/               currency.js, avatars.js, alert.js, errors.js
backend/                 Django project (poolvest) with apps accounts, portfolio, investments, dividends, contributions, reports
ai/                      this guide
```

## Code rules

- Styles: `themedStyles(() => ({ ... }))` and tokens (`COLORS`, `SPACING`, `RADIUS`, `TYPE`). No color literals, no inline font names.
- Text styles: spread a `TYPE` token, then override `fontSize` only when a fixed rule in design-system.md says so.
- Money: `fmtFull` (full, with paise) and `fmtShort` (compact) from `utils/currency.js`. Never format money by hand.
- State: Zustand. Fetch on screen focus with `useFocusEffect`. Keep screens light: a tab loads only what it shows.
- Icons: Iconsax. Check the export name in `node_modules/iconsax-react-native/dist/esm` (names differ from the website).
- Images need static `require`. List new avatars in `utils/avatars.js`.
- Remove styles and imports your change leaves unused. Do not touch unrelated code.
- Web and native must both work. Test the web build (`expo start --web`) and Expo Go.

## Theme

Light and dark are both required. Switching theme remounts the app tree. If you read `COLORS` outside `themedStyles`, it will not update on a theme change.

## Backend

- Apps: `accounts` (members, JWT, avatar), `portfolio` (summary, logos), `investments` (stocks, sales), `dividends`, `contributions`, `reports`.
- Stock prices come from Yahoo Finance and are cached for 60 seconds.
- Company logos use a provider chain (manual list, Groww CDN, India API, site icon) cached 30 days, with a letter fallback.
- Every new model field needs a migration. Data migrations must be safe to run twice.

## Data safety (important)

- The repo-root `.env` can hold a **live** database URL. Never print it, commit it or paste it anywhere.
- Before any command that writes (migrate, flush, loaddata, shell writes, set password), confirm the database is local:

```bash
cd backend && DATABASE_URL="sqlite:///$PWD/db.sqlite3" ./venv/bin/python manage.py <command>
```

- Do not commit database dumps, `.env`, `node_modules`, `.expo`, `dist` or `.DS_Store`. The `.gitignore` files already cover them.

## Run locally

Double-click `start-app.command` (project root). It starts the backend on a local SQLite database and Expo, and prints a QR code for Expo Go. Phone and Mac must be on the same WiFi.

Manual:

```bash
cd backend && DATABASE_URL="sqlite:///$PWD/db.sqlite3" ./venv/bin/python manage.py runserver 0.0.0.0:8765
```

```bash
cd mobile && EXPO_PUBLIC_API_URL=http://<your-mac-ip>:8765/api npx expo start --clear
```

Backend tests:

```bash
cd backend && DATABASE_URL="sqlite:///$PWD/db.sqlite3" ./venv/bin/python manage.py test accounts portfolio investments dividends
```

## Git

- Work on a branch, not `main`. The user pushes by hand.
- Commit messages: short imperative summary, then a body with the why.
- Do not commit secrets or generated folders.

## Definition of done

- Works in light and dark, on phone width and in a browser.
- Uses tokens and shared components. No new color, font or size outside the tokens.
- Loading, empty and error states handled.
- The web bundle builds without errors.
- This guide is updated if a rule or a shared component changed.

## For AI agents

- Read `design-system.md` and `components.md` before changing UI.
- Make the smallest change that does the job. Every changed line should trace to the request.
- If a request conflicts with a fixed rule here, say so and ask. Do not silently break the rule.
- When you add or change a shared component or token, update this folder in the same change.
