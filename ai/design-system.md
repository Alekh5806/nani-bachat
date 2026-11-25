# Design system

Code source of truth: `mobile/src/theme/colors.js` and `mobile/src/theme/fonts.js`. Machine-readable copy: [design-tokens.json](design-tokens.json).

## Principles

- **Quiet chrome, content carries the color.** Surfaces, borders and text stay neutral. Blue marks the primary action and selection. Green and red mean profit and loss, nothing else.
- **One accent.** `accent` is blue (`#4D6BFF` dark, `#1E41DB` light). No gradients, glows, colored shadows or neon borders.
- **Flat cards.** A card is a filled surface with a hairline border. Depth comes from surface steps, not shadows.
- **Sentence case labels, Title Case titles.** Card and screen titles are Title Case ("Top Holdings", "Asset Allocation"). Small labels are sentence case.
- **No emoji as icons.** Use Iconsax line icons (Bold variant for the active state).
- **Numbers are rupees in Indian format** (`₹1,10,892.39`). Big headline values drop the paise (`₹1,12,871`). Compact grids use short form (`₹1.12 L`, `₹11.8K`).
- **Loss and profit** show a sign (`+₹854.60`, `-₹1,625.93`), a color (`profit` green, `loss` red) and `neutral` grey at zero.

## Color

Two palettes (`dark`, `light`) share the same names. Always read `COLORS.x` inside `themedStyles`, never a literal hex.

| Role | Token | Dark | Light |
|---|---|---|---|
| Page | `background` | `#0B0F19` | `#F5F6F8` |
| Card | `cardBg` | `#111827` | `#FFFFFF` |
| Raised / chip | `surface` | `#172033` | `#F3F4F6` |
| Raised stronger | `surfaceLight` | `#263244` | `#E5E7EB` |
| Accent | `accent` | `#4D6BFF` | `#1E41DB` |
| Text | `textPrimary` / `textSecondary` / `textMuted` | `#F9FAFB` / `#9CA3AF` / `#6B7280` | `#111827` / `#6B7280` / `#9CA3AF` |
| Profit / loss | `profit` / `loss` | `#22C55E` / `#F87171` | `#16A34A` / `#DC2626` |
| Border | `border` | `#263244` | `#E5E7EB` |
| Divider | `divider` | white 6% | black 7% |

Three text roles only: primary, secondary, muted.

**Charts.** One accent for the main series. When a chart must tell parts apart (donut), use `chartCategories` in order. Each color means one holding.

## Typography

Font: **Inter**, weights 400, 500, 600. No 700 or heavier. The family follows the weight automatically, so write `fontWeight`, never a family name.

Use the semantic token (`...TYPE.cardTitle`), not a raw size.

| Token | Size / weight | Use |
|---|---|---|
| `screenTitle` | 24 / 600 | Screen header title |
| `sectionTitle` | 18 / 600 | Section titles |
| Card title | 16 / 600 | Home card titles (`overviewTitle`) |
| `cardTitle` | 16 / 600 | Names and row titles |
| `body` | 14 / 500 | Default text |
| `secondary` | 13 / 400 | Supporting text, labels |
| `caption` | 12 / 400 | Metadata |
| `infoTitle` | **9 / 400** | Column or info titles above a list ("Stocks (10)", "Current (Invested)") |
| `portfolioValue` | 28 / 600 | The one big number on a card |

### Fixed size rules (do not change without a decision)

| Where | Rule |
|---|---|
| **List row** (stock, dividend, holding) | Logo 40, title 14, current value 12, grey text 10, gap above grey text 4, row padding 12 |
| **Summary card rows** | Label 12, value 12 |
| **Summary card** | Label 12 grey, big value 28, round button 40, dashed line, rows |
| **Home card titles** | 16 |
| **Tab bar label** | 10 |
| **Info titles** | 9 (token `infoTitle`) |

## Spacing

4px grid. Use `SPACING`: `xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 20`, `xxl 24`, `xxxl 32`, `huge 48`.

- A 2px nudge is allowed inside small controls. Anything else is a multiple of 4.
- Space inside a group is smaller than space between groups.
- Page side padding: 16. Card padding: 20 (grid cells: 12). Row padding: 12.
- Bottom of every scrolling screen: `<TabBarSpacer />` so the last item clears the floating tab bar.

## Radius

`RADIUS`: `sm 6`, `md 10`, `lg 14`, `xl 18`, `xxl 22`, `full`. Cards use `xl` (18). Controls and inputs `md` (10). Company logos 8. Round buttons and avatars are circles. Inner radius is never bigger than the outer one minus the padding.

## Icons

Iconsax (`iconsax-react-native`). 18px default, 24px in the tab bar. Linear when idle, Bold when active. Color follows its text role. Never give an icon its own color.

Package naming differs from the Iconsax website. Tab icons in use: `Home2`, `Chart1` (idle) and `Chart21` (active) for Invest, `Profile2User`, `Wallet3`.

## Images

- **Company logos:** `CompanyLogo`, 40px, 8 radius, transparent background and no border, in both themes. Falls back to the first letter.
- **Member avatars:** the 14 PNG files in `mobile/assets/avatar` (`avatar-1.png` to `avatar-14.png`). Shown as a plain image: no background, border or rounding. A new member gets a random unused one.

## Motion

- Press: scale to 97% and opacity 85% (`PressCard`).
- Screens slide in from the right and slide out on back.
- Toast springs in from the top.
- No looping or decorative animation. Nothing animates width or height.

## Navigation

- Bottom bar, floating, 4 tabs: **Home, Invest, Member, Dividend**. Labels use the singular short form.
- Profile is not a tab. It opens from the round avatar at the top right of every header.
- Every detail screen has a back arrow in its header.
- On the web, the page the user is on survives a browser reload. It resets to Home after logout.

## Responsive and platform

- Works at phone width first (360 to 430) and stretches on a browser.
- Web: no focus outline on inputs (the container shows focus). Stack swipe-back is off on the web because it blocks touch scrolling. Horizontal chart drags select a snapshot. Vertical swipes scroll the page.
- Never rely on hover. Every action is a tap.

## Do not

- Do not add gradients, glows, blurs or emoji.
- Do not use another font or a size outside the tokens.
- Do not write a color literal (except the avatar background and the toast pill).
- Do not add a second accent color.
- Do not copy a component to change one value. Add a prop to the shared one.
