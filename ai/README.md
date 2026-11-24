# AI and developer guide

This folder is the single place that explains how Nani Bachat looks and how the code is organised. Anyone who works on the app, a developer or an AI agent, on any platform, follows it so every screen stays consistent.

| File | What it is |
|---|---|
| [design-system.md](design-system.md) | Principles, colors, type, spacing, radius, patterns. Read first. |
| [design-tokens.json](design-tokens.json) | The same tokens as data, so iOS, Android, web or Figma can reuse them. |
| [components.md](components.md) | Every shared component: what it is for, props, rules. |
| [screens.md](screens.md) | What each screen contains and its order of cards. |
| [conventions.md](conventions.md) | Code rules, folder layout, how to run, data safety, git. |

## The app in one paragraph

Nani Bachat is a private group investment tracker for 11 friends. Members pool money monthly, an admin buys stocks, and everyone sees holdings, returns, dividends and their share. It is used mostly on a phone (Expo Go, React Native) and also in a browser. Look and feel is a clean fintech app: quiet surfaces, one blue accent, green and red only for profit and loss.

## Stack

- **Mobile and web:** Expo SDK 54, React Native 0.81, React Navigation 7, Zustand, React Native Paper, Iconsax icons, Inter font.
- **Backend:** Django REST Framework, JWT login, PostgreSQL in production (Neon), SQLite for local work.
- **Where:** `mobile/` is the app, `backend/` is the API, `ai/` is this guide.

## The three rules that matter most

1. **Use the tokens.** Colors, sizes, spacing and radius come from `mobile/src/theme/colors.js`. Never hard-code a color or a font.
2. **Same meaning, same style.** A card title looks the same on every screen. Reuse `SummaryCard`, `CompanyLogo`, `UserAvatar` and the other shared components before writing new UI.
3. **Light and dark both.** Every change must work in both themes.

If something is not covered here, copy the closest existing screen and ask before inventing a new pattern.
