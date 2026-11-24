# Components

All shared components live in `mobile/src/components`. Reuse these before writing new UI. Styles use `themedStyles` so they follow the theme.

## Layout and cards

| Component | Use it for | Notes |
|---|---|---|
| `ScreenHeader` | Top of every screen | Props: `title`, `subtitle`, `showBack`, `onBack`, `rightAction`, `rightIcon`, `rightLabel`, `hideProfile`. Shows the profile avatar at the right unless `hideProfile`. |
| `SummaryCard` | Top card of a screen | Label, one big value, optional round action button, dashed line, label/value rows, optional footnote. Props: `label`, `value`, `valueColor`, `action {icon,onPress,loading,label}`, `rows [{label,value,color}]`, `note`. |
| `GlassCard` | A plain card | Filled surface and hairline border. |
| `PressCard` | A card that opens something | Paper `Card` with press feedback (shrinks to 97%, dims to 85%). Pass `onPress`. |
| Paper `Card` (outlined) | Home cards | Use style `paperCard` (radius 18, border `border`, bottom margin 20) and `Card.Content` with padding 20. |
| `SectionHeader` | Title above a group | |
| `TabBarSpacer` | End of every scrolling screen | Height = tab bar + its offset + 16. |

## Rows and identity

| Component | Use it for | Notes |
|---|---|---|
| `StockRow` | Holding row on Investments | |
| `MemberRow` | Member on the Members list | Uses `UserAvatar` 44. |
| `CompanyLogo` | Any company logo | Props: `symbol`, `name`, `size`. Transparent, 8 radius, letter fallback. Batches lookups through `logoStore`. |
| `UserAvatar` | Any member picture | Props: `person {avatar, name, avatar_color}`, `size`. Plain image or a letter circle. |
| `AvatarPicker` | Choose own avatar | Paper `Dialog` with the 14 avatars. Saves with `PATCH /auth/profile/`. |
| `ProfileButton` | Header avatar | Opens Profile. |

## Forms

| Component | Use it for | Notes |
|---|---|---|
| `PremiumInput` | Text and number input | Label above, container shows focus. |
| `PremiumButton` | Primary and secondary buttons | `buttonStyle` prop for size tweaks. |
| `DatePickerField` | Dates | Exports `todayString`, `formatDateDisplay`. |
| `HoldingSelect` | Pick one holding (Add Dividend) | Select field plus a dialog with search. Row: name, then a shares chip and the buyer name. |

## Data display

| Component | Use it for | Notes |
|---|---|---|
| `GrowthChart` | Home line chart | Height 120. Drag to read a point. Drag locks page scroll. |
| `AllocationDonut` | Top Holdings and Asset Allocation | `half` prop draws a half ring. |
| `OwnershipCard` | The member's ownership | On the Members screen. |
| `LoadingSkeleton` | Loading state | |
| `StatCard` | Small stat | Older. Prefer `SummaryCard`. |

## React Native Paper

Installed and themed from the app colors (`PaperProvider` in `App.js`). Use for: `Card`, `Chip` (range filter), `Button` (text button such as "View all"), `Divider`, `IconButton`, `ProgressBar` (dividend bars), `Dialog`. Style them with tokens, never with Paper defaults.

## Feedback

- **Toast:** `Toast.show({ type: 'success' | 'error' | 'info', text1, text2 })` from `react-native-toast-message`. The look is a dark pill with a colored icon badge (`config/toastConfig.js`). Use toasts for results. Do not use a modal for a plain success message.
- **Confirm before destructive actions:** `utils/alert.js` (`Alert.alert`) with Cancel and a destructive button.

## Adding a component

1. Check this list. If a close one exists, add a prop.
2. Put it in `mobile/src/components`, named in PascalCase.
3. Style with `themedStyles` and tokens only. Support light and dark.
4. Add a row here with its props.
