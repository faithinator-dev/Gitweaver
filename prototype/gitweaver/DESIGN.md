---
name: GitWeaver
colors:
  surface: '#10141a'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#8c909f'
  outline-variant: '#424753'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e68'
  primary-container: '#0969da'
  on-primary-container: '#ecefff'
  inverse-primary: '#005bc0'
  secondary: '#6bde80'
  on-secondary: '#003913'
  secondary-container: '#2fa54f'
  on-secondary-container: '#003210'
  tertiary: '#d0bcff'
  on-tertiary: '#3c0091'
  tertiary-container: '#7c4ce6'
  on-tertiary-container: '#f5ecff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#88fb99'
  secondary-fixed-dim: '#6bde80'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#00531f'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#10141a'
  on-background: '#dfe2eb'
  surface-variant: '#31353c'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding-desktop: 24px
  container-padding-mobile: 16px
  gutter: 16px
  sidebar-width: 260px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for high-performance Git management and repository orchestration. The brand personality is **precise, surgical, and efficient**, catering to developers who prioritize signal over noise. 

The visual style is **Professional / Technical**, leaning into a sophisticated "Dark Mode First" aesthetic. It utilizes a high-density information architecture characterized by:
- **Functional Minimalism:** Every pixel must serve a purpose. Whitespace is used for data separation rather than purely aesthetic breathing room.
- **Subtle Technicality:** Drawing from "Geist" and "Developer Tooling" movements, the system uses sharp edges, low-contrast borders, and monospaced accents to evoke a sense of a high-end IDE.
- **Reliability:** The UI feels like a solid instrument—stable, predictable, and fast.

## Colors
The palette is rooted in the "GitHub Dark Dimmed" spectrum to ensure instant familiarity for engineers while maintaining a unique identity through specific accent usage.

- **Primary (#0969da):** Used for actionable items, active states, and primary navigation links.
- **Success (#2da44e):** Reserved for passing builds, merged PRs, and "Clean" system statuses.
- **Surface & Background:** We utilize a tiered dark-gray system. The base background is `#0d1117`, with surfaces elevated using `#161b22`.
- **Borders (#30363d):** This is the most critical token. Since we avoid shadows, borders provide all the structural definition.

## Typography
The typography strategy employs a dual-font system to distinguish between UI controls and data content.

- **UI & Interface (Inter):** A sharp sans-serif used for all functional labels, navigation, and headings. It provides a modern, readable foundation.
- **Data & Logic (JetBrains Mono):** Used for repository names, commit SHAs, code snippets, and any technical metadata. The increased x-height of JetBrains Mono ensures that complex strings remain legible at small sizes.
- **Hierarchy:** Use `label-caps` (Uppercase Inter) for sidebar category headers and table column headers to provide clear structural breaks in high-density views.

## Layout & Spacing
This design system utilizes a **sidebar-driven fixed grid** for the main application shell, transitioning to a fluid layout for content areas.

- **Density:** We adhere to a 4px baseline grid. Padding within components should be tight (usually 8px or 12px) to maximize information density on professional displays.
- **Sidebar:** A fixed left-hand navigation (260px) anchors the experience. This area uses a slightly darker shade than the main content area to provide visual grounding.
- **Grid:** On the dashboard, a 12-column grid is used. Metric cards typically span 3 or 4 columns, while main repository lists or code views span the full width or 8/12 layout.
- **Breakpoints:**
  - Desktop: 1280px+ (Standard dashboard view)
  - Tablet: 768px - 1279px (Sidebar collapses to icons)
  - Mobile: <767px (Full-screen navigation overlay)

## Elevation & Depth
In line with the "surgical" aesthetic, this design system rejects heavy drop shadows in favor of **Tonal Layering and Border Definition**.

- **Level 0 (Base):** `#0d1117` - The main canvas for the application.
- **Level 1 (Surface):** `#161b22` - Used for cards, sidebars, and input fields.
- **Level 2 (Overlay):** `#21262d` - Used for modals and popovers.
- **Borders:** Every surface is defined by a 1px solid border (`#30363d`).
- **Depth via Contrast:** Instead of shadows, we use a subtle `1px` inner highlight on the top edge of primary buttons to give a microscopic sense of "pressability" without breaking the flat technical aesthetic.

## Shapes
The shape language is **Soft (0.25rem)**, providing just enough radius to feel modern while maintaining a disciplined, grid-aligned look.

- **Components:** Buttons, Input fields, and small Tags use the base `rounded (4px)`.
- **Containers:** Large dashboard cards and Modals use `rounded-lg (8px)`.
- **Exceptions:** Status indicators (active dots) are fully circular. Avatar images are 6px rounded squares (not circles) to maintain the "blocky" developer aesthetic.

## Components
- **Buttons:** 
  - **Primary:** Background `#238636` (GitHub Green), text `#ffffff`, 4px radius. 
  - **Secondary:** Background `#21262d`, border `#30363d`, text `#c9d1d9`.
- **Metrics Cards:** Use a `#161b22` background with a `#30363d` border. Headlines should be `label-caps` in secondary text color, with the value in `headline-md`.
- **Inputs:** Dark backgrounds (`#0d1117`) with a 1px border that turns `#0969da` on focus. Use JetBrains Mono for the input text to match code input styles.
- **Chips / Badges:** Small, low-contrast pills. For example, a "Bug" label uses a dark red background with a high-saturation red text.
- **Code Block:** Use a specific surface (`#010409`) with syntax highlighting based on the GitHub Dark theme. Line numbers should be rendered in `code-sm` with a dimmed text color.
- **Data Tables:** No vertical borders. Only horizontal 1px dividers. Header row should have a subtle background tint (`#161b22`).