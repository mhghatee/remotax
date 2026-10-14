# Tailwind CSS Responsive Guidelines

Tailwind CSS makes responsive design straightforward using responsive modifiers, but following a disciplined approach ensures clean and maintainable styles.

## 1. Always Mobile-First
By default, un-prefixed utilities (e.g. `block`) apply to all screen sizes (from `320px` upwards). Responsive modifiers (e.g. `md:flex`) only apply at the specified breakpoint and larger.

```html
<!-- BAD: desktop-first thinking, trying to override with smaller screens (doesn't work this way in Tailwind) -->
<div class="lg:w-1/2 w-full">...</div>

<!-- GOOD: mobile-first (starts at w-full on mobile, scales to w-1/2 at md screens and above) -->
<div class="w-full md:w-1/2">...</div>
```

## 2. Standard Screen Breakpoints
Use the default Tailwind breakpoints effectively:
- `sm:` (640px) — Small devices (large phones, small tablets).
- `md:` (768px) — Medium devices (tablets).
- `lg:` (1024px) — Large devices (laptops, small desktops).
- `xl:` (1280px) — Extra large devices (desktops).
- `2xl:` (1536px) — Large desktops/monitors.

## 3. Responsive Layout Patterns

### Responsive Grid
Use grid with auto-fitting or varying column counts to automatically adapt.
```html
<!-- Grid that has 1 column on mobile, 2 on tablet, and 3 on desktop -->
<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>
```

### Flex Direction Toggle
Switch layout direction between column and row depending on space.
```html
<!-- Stacks vertically on mobile, aligns horizontally on tablet/desktop -->
<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div>Main Title</div>
  <button class="w-full md:w-auto">Action Button</button>
</div>
```

## 4. Avoiding Layout Shifts (CLS)
Ensure you set explicit aspect ratios or height/width placeholders for dynamic content to avoid layouts jumping around while loading.
- Use `aspect-video` or `aspect-square`.
- Use responsive min-height classes, e.g. `min-h-[200px] md:min-h-[400px]`.
