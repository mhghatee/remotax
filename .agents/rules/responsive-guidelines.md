# Global Responsive Design Guidelines

You must adhere to the following rules when creating or modifying any frontend code in this workspace:

1. **Prioritize Mobile-First Approach**:
   - All styling code should start with mobile layouts as default.
   - Use screen size queries or class modifiers (e.g. Tailwind `md:`, `lg:`) to scale layouts UP, never down, unless explicitly instructed.

2. **Strict Aspect Ratios and Aspect-Ratio Units**:
   - To avoid Cumulative Layout Shift (CLS) on responsive devices, always define explicit `aspect-ratio` or responsive min-height classes for media, cards, and dynamic containers.

3. **Check responsive scaling**:
   - Verify that your layout shifts gracefully across common device sizes: 320px, 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop).
   - Ensure text wrapping, button widths, and grids wrap appropriately.

4. **Touch Friendliness**:
   - Touch targets (buttons, input fields, checkboxes, links) must have a minimum interactive size of 44px on mobile viewports.
