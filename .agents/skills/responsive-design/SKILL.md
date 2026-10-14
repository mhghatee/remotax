---
name: responsive-design
description: >-
  Use this skill whenever you are designing, editing, or generating UI code (HTML, CSS, Tailwind, React, Vue, Svelte, etc.) to ensure the output is fully responsive, mobile-first, fluid, and conforms to modern RWD standards.
---

# Responsive Design & UI Styling Skill

This skill provides comprehensive instructions, patterns, and checklists to ensure that all UI layouts generated or modified are fully responsive, accessible, and performant across all screen sizes (mobile, tablet, desktop).

## Key Principles & Rules

1. **Mobile-First Approach**:
   - Write base styles for the smallest screens (mobile) first.
   - Use media queries or utility prefixes (e.g., Tailwind's `sm:`, `md:`, `lg:`, `xl:`) only to scale up for larger viewports.
   - Do NOT write styles for desktop first and then use max-width to shrink them down unless specifically requested.

2. **Fluid & Flexible Layouts**:
   - Prefer CSS Grid and Flexbox over fixed dimensions.
   - Use relative units (`%`, `vw`, `vh`, `fr`, `rem`, `em`) for layouts, margins, and paddings instead of fixed `px` values.
   - Avoid hardcoded values like `width: 350px` or `height: 500px`. Use `max-width`, `min-width`, and `clamp()` instead.

3. **Responsive Typography**:
   - Use relative font sizes (`rem` or `em`) to respect user browser font size preferences.
   - Utilize CSS `clamp()` for fluid typography (e.g., `font-size: clamp(1rem, 2.5vw, 2rem);`).

4. **Touch & Interactive Targets**:
   - Ensure interactive targets (buttons, links) are at least `44px x 44px` on mobile screens to prevent misclicks.
   - Provide ample spacing between interactive elements.

---

## Detailed References

For detailed guidelines and framework-specific patterns, read the following:

- **Tailwind CSS Best Practices**: [Tailwind Guidelines](./references/tailwind.md)
- **Common CSS & Layout Patterns**: [Common Layout Patterns](./references/common_patterns.md)

---

## Responsive Design Verification Checklist

Before completing a UI-related task, verify the implementation against this checklist:
- [ ] Base styles are mobile-friendly (no horizontal scrolling on viewports as small as 320px).
- [ ] Layout scales smoothly from mobile (375px) to tablet (768px), laptop (1024px), and large desktop (1440px+).
- [ ] Navigation menu collapses into a hamburger menu or bottom-nav bar on mobile.
- [ ] Images and media scale responsively (`max-width: 100%`, `height: auto`, or `object-fit: cover`).
- [ ] Form inputs, fields, and buttons stack vertically on narrow viewports.
- [ ] Text remains readable and doesn't overlap on smaller screen widths.
