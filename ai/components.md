# Components

All shared components live in `mobile/src/components`. Reuse these before writing new UI. Styles use `themedStyles` so they follow the theme.

## Layout and cards

| Component | Use it for | Notes |
|---|---|---|
| `ScreenHeader` | Top of every screen | Props: `title`, `subtitle`, `showBack`, `onBack`, `rightAction`, `rightIcon`, `rightLabel`, `hideProfile`. Shows the profile avatar at the right unless `hideProfile`. |
| `SummaryCard` | Top card of a screen | Label, one big value, optional round action button, dashed line, label/value rows, optional footnote. Props: `label`, `value`, `valueColor`, `action {icon,onPress,loading,label}`, `rows [{label,value,color}]`, `note`. |
| `GlassCard` | A plain card | Filled surface and hairline border. |
| `PressCard` | A card that opens something | Paper `Card` with press feedback (shrinks to 97%, dims to 85%). Pass `onPress`. |
| Home cards | Portfolio overview and breakdowns | Use a flat surface, radius 18, a one-pixel border and 20px padding. |
| `SectionHeader` | Title above a group | |
| `TabBarSpacer` | End of every scrolling screen | Height = tab bar + its offset + 16. |

## Rows and identity

| Component | Use it for | Notes |
|---|---|---|
| `StockRow` | Holding row on Investments | |
| `MemberRow` | Directory row with a 40px `UserAvatar`, member name, and phone number. A single badge beside the phone shows Admin, You, or Admin · You when applicable. |
| `CompanyLogo` | Any company logo | Props: `symbol`, `name`, `size`. Transparent, 8 radius, letter fallback. Batches lookups through `logoStore`. |
| `UserAvatar` | Any member picture | Props: `person {avatar, name, avatar_color}`, `size`. Plain image or a letter circle. |
| `AvatarPicker` | Choose own avatar | Paper `Dialog` with the 14 avatars. Saves with `PATCH /auth/profile/`. |
| `ProfileButton` | Header avatar | Opens Profile. |

## Forms

| Component | Use it for | Notes |
|---|---|---|
| `PremiumInput` | Text and number input | Label above, container shows focus. `loading` shows a small spinner on the right inside the field (search). |
| `PremiumButton` | Primary and secondary buttons | `buttonStyle` prop for size tweaks. |
| `DatePickerField` | Dates | Exports `todayString`, `formatDateDisplay`. |
| `HoldingSelect` | Pick one holding (Add Dividend) | Select field plus a dialog with search. Row: name, then a shares chip and the buyer name. |

## Data display

| Component | Use it for | Notes |
|---|---|---|
| `PortfolioHistory` | Home value history | Selects the date window and loads additional snapshot pages as needed. |
| `GrowthChart` | Home line chart | Receives ascending dated values. Horizontal drag or the previous and next buttons select a snapshot. Vertical swipes scroll the page. |
| `AllocationDonut` | Holding allocation | `half` draws a half ring. The caption moves below the ring when the text exceeds the space in its center. |
| `LoadingSkeleton` | Loading state | |
| `StatCard` | Small stat | Older. Prefer `SummaryCard`. |

## Forms (Add / Edit / Sell)

Every form screen uses the shared shell. Do not rebuild it.

| Component | Use |
|---|---|
| `FormScreen` | Props: `title`, `subtitle`, `onBack`, `children`. Gives header, keyboard-safe scroll body, side padding 20 and the bottom spacer. |
| `FormCard` | Bordered card for a group of fields or a preview. Prop: `style`. |
| `FormLabel` | Small title above a group ("Purchase details"). |
| `BuyerPicker` | Select field with a member dialog. Props: `members`, `value`, `onChange(id)`, `error`, `readOnly`. |
| `SwitchRow` | On/off setting in a form: title, optional grey `hint`, flat pill switch on the right, no box. Props: `label`, `hint`, `value`, `onValueChange`. Use it for every form toggle. |
| `MonthPickerDialog` | Month picker that stays small with any number of months: year arrows and a 12-month grid, months without data greyed out, "All months" button. Props: `visible`, `value` ("YYYY-MM" or null), `enabledMonths`, `onSelect(month or null)`, `onClose`. |
| `PreviewCard` / `PreviewRow` / `PreviewTotal` | Preview card of Add Stock and Sell: title with divider, rows (bold label, optional grey `sub`, value in the right half) and a totals block under a divider. |

Rules: every control is full width, one per line, with an Iconsax icon through the `icon` prop (emoji names are mapped in `Icon.js`).

## React Native Paper

Installed and themed from the app colors (`PaperProvider` in `App.js`). Use for: `Card`, `Chip`, `Button` (text button such as "View all"), `Divider`, `IconButton`, `ProgressBar`, `Dialog`. Style them with tokens, never with Paper defaults.

## Feedback

- **Toast:** `Toast.show({ type: 'success' | 'error' | 'info', text1, text2 })` from `react-native-toast-message`. The look is a dark pill with a colored icon badge (`config/toastConfig.js`). Use toasts for results. Do not use a modal for a plain success message.
- **Popups and confirmations:** call `Alert.alert(title, message, buttons)` from `utils/alert.js` (same call as React Native, buttons with `style: 'cancel' | 'destructive'`). It shows the app's own dialog (`DialogHost` mounted in `App.js`, built on `DialogCard`), so it looks the same on iOS, Android and web and also works on top of other modals. For a confirm that needs a loading state (delete), use `ConfirmDialog` (`visible`, `title`, `message`, `confirmText`, `destructive`, `loading`, `onConfirm`, `onCancel`). Every dialog uses `DialogCard`: title on the left with a round X close button on the right, optional message and `children` (list, grid, input), then full-width pill buttons (the last one is solid blue, or solid red when its color is `COLORS.loss`; others are light; `variant: 'secondary'` forces light). Pick-lists (`BuyerPicker`, `HoldingSelect`, `AvatarSelect`, `AvatarPicker`, `MonthPickerDialog`, `DatePickerField`) have no bottom button of their own because the X closes them. Never use Paper's `Dialog`. Never use `window.confirm` or React Native's own `Alert`.

## Adding a component

1. Check this list. If a close one exists, add a prop.
2. Put it in `mobile/src/components`, named in PascalCase.
3. Style with `themedStyles` and tokens only. Support light and dark.
4. Add a row here with its props.
