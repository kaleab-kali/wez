# Wez Platform — UI Design System

This document describes the design language used in the prototype. Reproduce this *visual approach* in production. Colors are defined as design tokens (CSS variables) so they can be swapped without touching components.

The prototype's exact look should be the target. Reference the prototype file (`wez_prototype.jsx`) for visual confirmation. This doc captures the *system* behind it.

---

## Design philosophy

- **Editorial, professional, warm.** This is a system that handles real people's livelihoods and money. It needs to feel trustworthy, not playful, but also not corporate-cold.
- **Clarity over decoration.** Information density is fine; visual noise is not.
- **Type-led hierarchy.** Different type sizes and weights do most of the work; minimal use of color for decoration.
- **Generous whitespace.** Every card and section has breathing room.
- **Subtle warmth.** Cream backgrounds, terracotta accents, gold highlights — never primary blues, never gradients on body content.

---

## Typography

### Two-typeface system

```css
:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-sans: 'DM Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

- **Fraunces** (serif) — used for display headings, big numbers, hero text. The serif gives editorial gravitas.
- **DM Sans** — body, UI text, labels, buttons. Clean and humanist.
- **JetBrains Mono** — monospaced data (Fayda IDs, TIN, station codes, time stamps).

### Type scale

```css
.text-display-xl { font-family: var(--font-display); font-size: 56px; line-height: 1.05; letter-spacing: -0.02em; }
.text-display-lg { font-family: var(--font-display); font-size: 42px; line-height: 1.1;  letter-spacing: -0.02em; }
.text-display-md { font-family: var(--font-display); font-size: 36px; line-height: 1.15; letter-spacing: -0.02em; }
.text-display-sm { font-family: var(--font-display); font-size: 28px; line-height: 1.2;  letter-spacing: -0.01em; }
.text-display-xs { font-family: var(--font-display); font-size: 22px; line-height: 1.25; }

.text-h1 { font-size: 28px; font-weight: 600; line-height: 1.2; }
.text-h2 { font-size: 22px; font-weight: 600; line-height: 1.25; }
.text-h3 { font-size: 18px; font-weight: 600; line-height: 1.3; }
.text-h4 { font-size: 16px; font-weight: 600; line-height: 1.35; }

.text-body-lg { font-size: 16px; font-weight: 400; line-height: 1.5; }
.text-body    { font-size: 14px; font-weight: 400; line-height: 1.5; }
.text-body-sm { font-size: 13px; font-weight: 400; line-height: 1.45; }

.text-caption { font-size: 12px; font-weight: 400; line-height: 1.4; }
.text-overline { font-size: 11px; font-weight: 600; line-height: 1.3; letter-spacing: 0.05em; text-transform: uppercase; }

.text-meta    { font-size: 11px; font-weight: 400; line-height: 1.3; color: var(--color-muted); }
.text-tiny    { font-size: 10px; font-weight: 600; line-height: 1.3; letter-spacing: 0.05em; text-transform: uppercase; }
```

### Display vs sans choice

- Use **display (serif)** for: page titles, hero headlines, big stat numbers (e.g., "5,500 birr"), modal titles.
- Use **sans** for: section headings (h3/h4), labels, body, buttons, navigation, all functional UI text.

```typescript
// In React
<h1 className="text-display-md">Browse Workers</h1>
<div className="text-overline">CURRENT STATUS</div>
<div className="text-display-lg">Available for work</div>
```

### Font weights

- 400 — body text
- 500 — emphasized body, button text, secondary headings
- 600 — bold body, primary headings
- 700 — display headings (rare)

---

## Color tokens

The prototype uses warm, earthy tones inspired by Ethiopian textiles. The token system below allows swapping colors without code changes.

### Token definitions

```css
:root {
  /* Surfaces */
  --color-bg:        #FAF6F0;   /* warm cream — page background */
  --color-surface:   #FFFFFF;   /* card/panel background */
  --color-surface-2: #F5EFE6;   /* subtle alternate */
  --color-line:      #E8DFD2;   /* borders, dividers */

  /* Text */
  --color-ink:       #1C1814;   /* primary text */
  --color-ink-soft:  #3D352C;   /* secondary text */
  --color-muted:     #8A7E6F;   /* tertiary, captions */

  /* Brand */
  --color-accent:        #B8542F;   /* terracotta — primary brand */
  --color-accent-soft:   #E89A7A;
  --color-accent-tint:   rgba(184, 84, 47, 0.06);   /* very subtle wash */

  /* Functional */
  --color-forest:    #3F5D3A;   /* success, positive states */
  --color-gold:      #C99846;   /* certifications, achievements */
  --color-warn:      #C97F1B;   /* warnings */
  --color-danger:    #A8341B;   /* errors, destructive */

  /* Semantic */
  --color-success:   var(--color-forest);
  --color-info:      var(--color-ink);
  --color-on-accent: #FFFFFF;
  --color-on-dark:   #FFFFFF;
}
```

### Usage rules

- **Page background**: always `--color-bg`. No exceptions.
- **Card / panel background**: `--color-surface`. No subtle gradients, no shadows on cards by default.
- **Borders**: `--color-line` always. 1px solid by default.
- **Primary CTA**: `--color-accent` background, white text.
- **Secondary CTA**: outlined with `--color-line` border, `--color-ink` text.
- **Destructive CTA**: `--color-danger` background, white text. Use sparingly.
- **Status badges** (success/warn/danger): use the functional colors AT 12% opacity for background and the solid color for text. Don't use them at full opacity for fills.

### Color usage examples

```typescript
// Status badge
<span className="bg-[rgba(63,93,58,0.12)] text-forest px-2 py-1 rounded text-xs font-semibold">
  Active
</span>

// Hero card with brand gradient
<div className="bg-gradient-to-br from-ink to-forest text-white p-8 rounded-xl">
  ...
</div>

// Primary action
<button className="bg-accent text-white px-4 py-2 rounded-md hover:bg-[#A04A2A]">
  Submit
</button>
```

### Dark mode

Phase 1: not supported. Token system is structured to enable later by overriding the variables under `.dark` selector.

### Color swap exercise

If you want to change brand color (e.g., switch from terracotta to deep blue), only `--color-accent` and `--color-accent-soft` need to change. Components consume the token, not the literal hex.

---

## Spacing system

8-point grid. Every measurement is a multiple of 4px (and prefer 8px).

```css
:root {
  --space-0:  0;
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

Tailwind's default `spacing` scale aligns with this (1 = 4px, 2 = 8px, etc.). Use `p-4`, `gap-3`, `mt-6` etc.

### Common spacing patterns

- Card padding: `p-5` (20px)
- Card padding (compact): `p-4` (16px)
- Card padding (hero): `p-7` (28px)
- Gap between cards: `gap-4` (16px) horizontal, `gap-5` or `gap-6` vertical
- Gap inside a card row: `gap-2` or `gap-3`
- Section spacing: `mb-7` to `mb-8` between major sections
- Page padding: `px-10 py-8` on the main content area

---

## Border radius

```css
:root {
  --radius-sm: 4px;    /* tags, badges */
  --radius-md: 6px;    /* small inputs, secondary buttons */
  --radius-lg: 8px;    /* primary buttons, form inputs */
  --radius-xl: 10px;   /* small cards, modals */
  --radius-2xl: 12px;  /* main cards, panels */
  --radius-full: 9999px; /* avatars, pills */
}
```

- Cards: `rounded-xl` (12px)
- Buttons: `rounded-lg` (8px)
- Inputs: `rounded-lg` (8px)
- Badges: `rounded` (4px)
- Avatars: `rounded-full`

Don't use `rounded-2xl` (16px+) on functional elements. It feels casual and out of step with the editorial tone.

---

## Shadows

Used sparingly. The design relies on borders, not shadows, for layering.

```css
:root {
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
  --shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.15);
}
```

- Default cards: NO shadow. Use `border` only.
- Elevated cards (dropdowns, popovers): `--shadow-md`.
- Modals: `--shadow-xl`.
- Floating action buttons (rare): `--shadow-md` on rest, `--shadow-lg` on hover.

---

## Layout patterns

### Application shell

```
┌────────────────────────────────────────────────────────────────┐
│  TopBar (height 64px, sticky, surface bg, line border-bottom) │
├──────────────┬─────────────────────────────────────────────────┤
│              │                                                  │
│  Sidebar     │  Main content                                   │
│  (240px,     │  (flex-1, max-width 1440px,                     │
│   surface,   │   padding 32px 40px)                            │
│   line       │                                                  │
│   border-    │                                                  │
│   right)     │                                                  │
│              │                                                  │
│              │                                                  │
└──────────────┴─────────────────────────────────────────────────┘
```

### Page header

```typescript
<div className="anim-fade mb-7 flex items-end justify-between">
  <div>
    <h1 className="text-display-md font-semibold tracking-tight m-0">{title}</h1>
    {subtitle && <div className="text-sm text-muted mt-1.5">{subtitle}</div>}
  </div>
  {actions && <div className="flex gap-2">{actions}</div>}
</div>
```

### Card

```typescript
<div className="bg-surface rounded-xl border border-line p-5 transition-all">
  {children}
</div>
```

### Hero card (gradient feature panel)

```typescript
<div className="bg-gradient-to-br from-ink to-forest text-white p-7 rounded-xl mb-6">
  <div className="text-xs opacity-70 tracking-wider">CURRENT STATUS</div>
  <div className="text-display-md font-semibold mt-2">Available for work</div>
  <div className="opacity-80 mt-1">3 jobs match your roles</div>
</div>
```

### Stat card

```typescript
<div className="bg-surface rounded-xl border border-line p-5 flex justify-between items-start">
  <div>
    <div className="text-xs text-muted tracking-wider">PLACEMENTS</div>
    <div className="text-display-md font-semibold mt-1.5 text-accent">14</div>
    <div className="text-xs text-muted mt-1">since launch</div>
  </div>
  <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
    <Icon size={18} />
  </div>
</div>
```

### Stat grid

```typescript
<div className="grid grid-cols-4 gap-4 mb-7">
  <StatCard /> <StatCard /> <StatCard /> <StatCard />
</div>
```

Always 4 columns on desktop for the standard stat row. Responsive collapse to 2 then 1.

### Two-column layout (dashboard split)

```typescript
<div className="grid grid-cols-2 gap-5">
  <div>{leftPanel}</div>
  <div>{rightPanel}</div>
</div>
```

Or `grid-cols-[2fr_1fr]` for asymmetric.

---

## Component patterns

### Button variants

```typescript
type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'danger' | 'ok';

// primary  — dark ink background, white text. Default action in most contexts.
// accent   — terracotta brand. Used for the most important conversion actions (Submit, Confirm).
// ghost    — outlined, transparent background. Secondary action.
// danger   — red background. Destructive action.
// ok       — forest green. Confirmation of completion.
```

```typescript
<Button variant="primary">Save</Button>
<Button variant="accent" icon={Plus}>New worker</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger" icon={Trash2}>Delete</Button>
<Button variant="ok" icon={Check}>Mark complete</Button>
```

Sizes: `sm` (6px 12px / 12px), `md` (default, 10px 16px / 13px), `lg` (12px 20px / 14px).

### Badge variants

```typescript
type BadgeKind = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent' | 'gold';
```

- **neutral**: gray, default
- **ok**: green tint, success
- **warn**: amber tint, attention
- **danger**: red tint, errors
- **accent**: terracotta tint, brand emphasis
- **gold**: gold tint, certifications, premium

```typescript
<Badge kind="ok">Active</Badge>
<Badge kind="warn"><AlertTriangle size={11} /> Limited tenure</Badge>
<Badge kind="gold"><Award size={11} /> Wez Certified</Badge>
```

### Avatar

```typescript
<Avatar
  initials="HT"
  size="md"  // sm 32px, md 40px, lg 56px, xl 80px
  gradient="accent-gold"  // 'accent-gold' | 'forest-gold' | 'muted'
/>
```

Avatar generation: linear-gradient from accent to gold (or other combos). Initials come from name.

### Input fields

```typescript
<Field label="Phone *" hint="Include +251 country code">
  <Input
    placeholder="+251911..."
    error={form.formState.errors.phone?.message}
    {...form.register('phone')}
  />
</Field>
```

Input style:
- 1px solid `--color-line` border
- 8px border radius
- 10px 12px padding
- 14px font size
- Focus: border becomes `--color-accent`
- Error: border becomes `--color-danger`, error message below in red

### Modal

```typescript
<Modal open={open} onClose={onClose} title="Worker profile">
  <ModalContent>...</ModalContent>
  <ModalFooter>
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
    <Button variant="accent" onClick={onConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

- Centered, max-width 720px (or 480px for confirm dialogs).
- Background: rgba(28,24,20,0.5).
- Modal panel: white, rounded-xl, shadow-xl.
- Sticky close button top-right.
- Slide-up animation on open.

### Toast notifications

- Bottom-center positioning.
- Auto-dismiss after 3 seconds (success) or 5 seconds (error).
- Color: ok = forest, warn = warn, danger = danger, info = ink.
- Icon at the start, message text.
- Single-line preferred; truncate if long.

---

## Form patterns

### Field grid

```typescript
<div className="grid grid-cols-2 gap-3">
  <Field label="First name *">
    <Input {...form.register('firstName')} />
  </Field>
  <Field label="Last name *">
    <Input {...form.register('lastName')} />
  </Field>
</div>
```

### Multi-step wizard

```typescript
<div className="anim-fade">
  <PageHeader title="Register Worker" subtitle={`Step ${step} of 3`} />
  <Card>
    {step === 1 && <Step1Identity />}
    {step === 2 && <Step2Skills />}
    {step === 3 && <Step3Verification />}

    <div className="flex justify-between mt-5">
      {step > 1 && <Button variant="ghost" icon={ArrowLeft} onClick={back}>Back</Button>}
      {step < 3 && <Button variant="primary" icon={ArrowRight} onClick={next}>Continue</Button>}
      {step === 3 && <Button variant="accent" icon={Check} onClick={submit}>Finalize</Button>}
    </div>
  </Card>
</div>
```

### Filter panel

```typescript
<Card className="mb-4">
  <div className="flex items-center gap-2.5 mb-4">
    <Search size={16} className="text-accent" />
    <div className="text-h4">Filters</div>
    {activeCount > 0 && <Badge kind="accent">{activeCount} active</Badge>}
    {activeCount > 0 && <Button variant="ghost" size="sm" icon={X} onClick={reset}>Clear all</Button>}
  </div>

  <Field label="Free-text search">
    <Input {...} />
  </Field>

  <div className="grid grid-cols-3 gap-3">
    <Field label="Role">...</Field>
    <Field label="Category">...</Field>
    <Field label="Area">...</Field>
  </div>
</Card>
```

---

## List patterns

### Table

```typescript
<Card>
  <table className="w-full border-collapse">
    <thead>
      <tr className="border-b border-line">
        <th className="th-cell">Worker</th>
        <th className="th-cell">Role</th>
        <th className="th-cell">Salary</th>
        <th className="th-cell">Status</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(row => (
        <tr key={row.id} className="border-b border-line">
          <td className="td-cell">{row.worker}</td>
          <td className="td-cell">{row.role}</td>
          <td className="td-cell">{row.salary}</td>
          <td className="td-cell"><Badge kind={row.status}>{row.statusLabel}</Badge></td>
        </tr>
      ))}
    </tbody>
  </table>
</Card>

/* Tailwind component classes */
.th-cell { @apply text-left px-3 py-2.5 text-overline text-muted; }
.td-cell { @apply px-3 py-3 text-body-sm; }
```

### Card grid

For browse views: 2-3 columns of cards.

```typescript
<div className="grid grid-cols-3 gap-4">
  {workers.map(w => <WorkerCard key={w.id} worker={w} />)}
</div>
```

### Empty state

```typescript
<Card>
  <div className="p-15 text-center text-muted">
    <Icon size={36} className="mx-auto mb-3 opacity-40" />
    <div className="text-base font-medium mb-1">No workers found</div>
    <div className="text-sm">Try removing some filters</div>
    <Button variant="primary" size="sm" className="mt-4">Clear filters</Button>
  </div>
</Card>
```

---

## Iconography

- **Library**: lucide-react ONLY
- **Sizes**: 11px (in badges), 14px (in buttons), 18px (default), 24px (large/hero)
- **Stroke width**: default (2px) — never alter
- **Colors**: inherit from text color via `currentColor`. Don't apply colors directly except for status icons.

```typescript
import { Users, Plus, Check } from 'lucide-react';

<Icon size={18} />  // default
<Icon size={11} className="align-middle" />  // inline with text
```

---

## Animation

Keep it minimal. The design is editorial, not animated.

```css
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.anim-fade { animation: fadeIn 0.3s ease-out; }
.anim-slide { animation: slideUp 0.4s ease-out; }
```

- Page transition: `anim-fade` on the route component.
- Modal open: `anim-slide`.
- Tooltip / popover: `anim-fade`.
- No bouncy animations. No spring physics. No micro-interactions on hover beyond `transition-colors`.

---

## Accessibility

- Color contrast: text on bg meets WCAG AA (4.5:1 for body, 3:1 for large text).
- Focus visible: every interactive element shows a focus ring on keyboard navigation. Use `focus-visible:ring-2 ring-accent/50`.
- Touch targets: minimum 44px x 44px for primary actions on mobile.
- Reduced motion: honor `prefers-reduced-motion`. Disable our animations.
- Screen reader: every icon button has an `aria-label`. Decorative icons have `aria-hidden`.

---

## Responsive breakpoints

```css
/* Tailwind defaults are fine */
sm:  640px   /* mobile-large to small-tablet */
md:  768px   /* tablet */
lg:  1024px  /* small-desktop */
xl:  1280px  /* desktop */
2xl: 1536px  /* large-desktop */
```

Phase 1 priority: desktop (agents on station laptops/tablets, admins on laptops). Mobile responsiveness for employer self-service in Phase 2.

Never hide important functionality on mobile. Cards stack, multi-column grids collapse to single, sidebars become drawers.

---

## Component library — what we ship

Inside `packages/ui/`:

```
packages/ui/
├── primitives/         (extends shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── textarea.tsx
│   ├── checkbox.tsx
│   ├── radio.tsx
│   ├── label.tsx
│   ├── form.tsx
│   ├── dialog.tsx
│   ├── popover.tsx
│   ├── tooltip.tsx
│   ├── tabs.tsx
│   ├── badge.tsx
│   └── avatar.tsx
│
├── composed/
│   ├── card.tsx
│   ├── stat-card.tsx
│   ├── page-header.tsx
│   ├── empty-state.tsx
│   ├── filter-panel.tsx
│   ├── data-table.tsx
│   ├── tier-badge.tsx
│   ├── employer-rating-badge.tsx
│   ├── hop-flag-badge.tsx
│   └── modal.tsx
│
├── layout/
│   ├── app-shell.tsx
│   ├── top-bar.tsx
│   └── sidebar.tsx
│
└── hooks/
    ├── use-toast.tsx
    └── use-modal.tsx
```

Each component:
- Has TypeScript types exported
- Has Storybook stories (Phase 2)
- Has a test file (basic render + props variants)
- Uses CSS variables, NOT hardcoded hex

---

## Don't do these

- Don't introduce a second font.
- Don't add animations beyond what's documented above.
- Don't use `bg-accent` for non-action elements (it draws the eye to where action belongs).
- Don't use shadows as a primary layering technique. Use borders.
- Don't make text smaller than 11px on screens. Below that is for tiny meta only.
- Don't use centered text in body content. Headings can be centered when alone; body paragraphs left-align.
- Don't use ALL CAPS for body. Reserve for overlines and labels.
- Don't use icons without text labels on primary actions. Power users learn icons; new users don't.
- Don't make the prototype look "Material Design" or "iOS-y." Editorial > platform-specific.

---

## Final principle

**The design serves the work, not the opposite.** When in doubt, simplify. Strip an element rather than add one. Whitespace is a feature.
