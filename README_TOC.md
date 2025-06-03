# Table of Contents Component

This project includes a comprehensive Table of Contents (ToC) component that provides both desktop and mobile-friendly navigation for blog posts.

## Features

### Desktop (≥1280px)
- **Sticky sidebar**: ToC appears on the right side of the content with a minimum width of 240px
- **Hierarchical structure**: Shows H2 headings by default, with H3 and H4 subheadings that expand when their parent is active
- **Active heading highlighting**: Current section is highlighted with accent color and left border
- **Smart positioning**: ToC appears behind wide content (like full-width images) as the page scrolls
- **Responsive grid**: Content uses CSS grid `grid-template-columns: 1fr min(66ch, 100%) 1fr` to limit main content to ~800px while allowing some elements to be wider

### Mobile & Narrow Displays (<1280px)
- **Sticky header**: Shows current heading in a fixed header that appears when scrolling past the first heading
- **Overlay navigation**: Hamburger menu button opens a slide-out ToC panel from the right
- **Touch-friendly**: Large touch targets and smooth animations
- **Auto-close**: ToC closes automatically when a link is clicked

### Interactive Features
- **Intersection Observer**: Automatically detects which heading is currently in view
- **Smooth scrolling**: Links smoothly scroll to the target heading
- **Expandable sections**: Desktop ToC shows/hides subheadings based on active section
- **Responsive behavior**: Automatically switches between desktop and mobile modes

## Implementation

### Files Modified/Created
1. `src/components/TableOfContents.astro` - Main ToC component
2. `src/pages/blog/[...slug].astro` - Updated to extract headings from markdown
3. `src/layouts/BlogPost.astro` - Updated to include ToC and responsive grid

### How It Works

1. **Heading Extraction**: The blog post page (`[...slug].astro`) uses Astro's `render()` function to extract headings from markdown content during build time.

2. **Hierarchical Structure**: The component builds a nested structure from the flat array of headings, organizing H2, H3, and H4 headings into a tree.

3. **Responsive Layout**: CSS Grid and media queries handle the responsive behavior:
   - Desktop: 3-column grid with ToC in the third column
   - Mobile: Single column with overlay ToC

4. **Active State Management**: JavaScript uses Intersection Observer API to track which heading is currently visible and updates the ToC accordingly.

### CSS Grid Layout

The blog post layout uses a responsive CSS Grid:

```css
.prose {
  display: grid;
  grid-template-columns: 1fr min(66ch, 100%) 1fr;
  gap: 2rem;
}

/* Most content goes in the center column */
.prose > :global(*) {
  grid-column: 2;
}

/* Some elements can span full width */
.title {
  grid-column: 1 / 4 !important;
}

/* ToC goes in the third column on desktop */
.desktop-toc {
  grid-column: 3;
  grid-row: 2;
}
```

### Heading Structure Support

The ToC supports headings from H2 to H4:
- **H2**: Main sections (always visible)
- **H3**: Subsections (visible when parent H2 is active)
- **H4**: Sub-subsections (visible when parent H3 is active)

## Usage

The ToC is automatically included in all blog posts. No additional configuration is needed.

### Customization

To customize the ToC appearance, modify the CSS variables in `src/components/TableOfContents.astro`:

- `--accent`: Accent color for active links
- `--gray`: Text color for inactive links
- `--gray-light`: Background color for desktop ToC
- Responsive breakpoint: Currently set to 1280px

### Adding Wide Content

To make content span the full width (like the title), add the CSS class:

```css
.full-width-element {
  grid-column: 1 / 4 !important;
}
```

## Browser Support

- Modern browsers with CSS Grid support
- Intersection Observer API support
- CSS backdrop-filter support (for blur effects)

## Performance

- ToC generation happens at build time (no runtime performance impact)
- Intersection Observer is efficient for scroll tracking
- CSS animations use transform properties for smooth performance 