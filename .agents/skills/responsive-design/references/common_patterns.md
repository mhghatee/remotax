# Common Responsive Layout Patterns

Use these CSS/HTML boilerplate structures and concepts to implement common responsive UI components.

## 1. Responsive Navigation Bar (Hamburger Menu Pattern)
A navigation bar should collapse on mobile and display a menu button, while expanding horizontally on desktop.

```html
<nav class="nav-container">
  <div class="nav-brand">Logo</div>
  <!-- Hamburger button shown only on mobile -->
  <button class="menu-toggle" aria-expanded="false" aria-label="Toggle menu">
    <span class="hamburger-line"></span>
  </button>
  <!-- Nav items list -->
  <ul class="nav-links">
    <li><a href="#">Home</a></li>
    <li><a href="#">Services</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
</nav>

<style>
/* Base/Mobile Styles */
.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}
.nav-links {
  display: none; /* Hidden on mobile by default */
  flex-direction: column;
  position: absolute;
  top: 60px;
  left: 0;
  width: 100%;
  background: #fff;
}
.nav-links.is-open {
  display: flex; /* Toggle via simple JS */
}
.menu-toggle {
  display: block;
}

/* Tablet & Desktop Styles */
@media (min-width: 768px) {
  .menu-toggle {
    display: none; /* Hide toggle button */
  }
  .nav-links {
    display: flex; /* Show always on desktop */
    flex-direction: row;
    position: static;
    width: auto;
    background: transparent;
  }
}
</style>
```

## 2. Fluid Typography with CSS `clamp()`
Use `clamp()` to scale typography linearly between a minimum and maximum size based on viewport width.

```css
/* Syntax: clamp(minimum, preferred, maximum) */
h1 {
  font-size: clamp(1.75rem, 4vw + 1rem, 3.5rem);
}

p {
  font-size: clamp(1rem, 1.5vw + 0.5rem, 1.25rem);
  line-height: 1.6;
}
```

## 3. Auto-Responsive CSS Grid (No Media Queries)
You can create a fully responsive cards grid without writing any media queries using `auto-fit` or `auto-fill` with `minmax()`.

```css
.card-grid {
  display: grid;
  /* Grid items will be at least 280px wide. They will fill the row and expand to fit the space. */
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

## 4. Responsive Video / Aspect Ratio
To prevent layout shifts and keep media responsive:

```css
.responsive-video-container {
  width: 100%;
  aspect-ratio: 16 / 9; /* Modern standard */
}

.responsive-video-container iframe,
.responsive-video-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```
