# 0007 Visual language: GymBro dark-first tokens

Status: proposed (awaiting founder approval). Changes no CLAUDE.md rule and adds no dependency.

## Context
The founder approved the GymBro visual design in HTML prototypes (`prototype/gymbro-client.html`, `prototype/gymbro-trainer.html`
in the parent project folder): a near-black background, solid content cards, capsule controls, a light primary button,
orange and blue accents, and a floating capsule tab bar. The app shipped a light blue palette. Every screen already reads
colors, spacing, radii and type from `packages/ui/src/tokens.ts` (no literals in `apps/mobile`), so the language changes in
one place. NFR-A11Y-006 requires WCAG contrast (text 4.5:1, control borders 3:1) in light and dark themes, checked on tokens.

## Decision
- `tokens.ts` holds two palettes with identical keys: `darkColors` and `lightColors`. `colors` is `darkColors`; the app renders dark.
- New semantic keys: `surfaceRaised`, `accent` (orange), `info` (blue), `divider`, `dangerContrast` (text on the danger fill),
  `dangerText` (danger text on dark surfaces). `danger` is now the fill of destructive buttons only.
- `tokens.test.ts` checks both palettes: `#RRGGBB` format and contrast of every rendered pair (NFR-A11Y-006).
- Shared components keep their API; only their styling follows the tokens (capsule buttons, raised inputs, dark keyboard).
- Navigator chrome uses `expo-router`'s `ThemeProvider` with a token-built theme; both tab navigators share one floating
  capsule tab bar (`apps/mobile/src/shared/theme`). The status bar is light.

## Not decided here (each needs its own ADR and founder approval)
| Item | Why it is out | Needs |
|---|---|---|
| Theme switching by system setting | Screens build `StyleSheet` from static `colors`; switching means a `useTheme` hook in ~25 files | ADR + refactor once stage 2 is committed |
| Liquid Glass blur | React Native has no backdrop filter | `expo-blur` (new dependency) |
| Brand fonts (Golos Text, Oswald) | System font today | `expo-font` + font assets |
| Mascot and SVG icons | No vector drawing without a library | `react-native-svg` (new dependency) |
| Brand rename NoExcuse → GymBro | Release and store identity, not visual tokens | Founder decision |

## Consequences
- The whole app switches to the dark language without touching feature code.
- The light palette stays contrast-tested, so theme switching later is a wiring change, not a redesign.
- Screens that need prototype-specific structure (week strip, cards with status pills, step bar) get new `packages/ui`
  components when those screens are reworked; none are added speculatively.
