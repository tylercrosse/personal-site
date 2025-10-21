# Tyler Crosse's Personal Site

A digital garden built with Astro, featuring technical writing on computer science, machine learning, and systems programming.

## About This Site

This is my personal website where I share my thoughts, projects, and learning journey as I pursue a Master of Science in Computer Science at Georgia Tech. The site serves as a digital garden - a space for ideas in various stages of development, from rough notes to polished articles.

### Content Areas

- **Operating Systems**: Deep dives into GIOS coursework, including multithreaded servers, IPC, and distributed systems
- **Machine Learning**: Projects and retrospectives from ML coursework and research
- **Computer Science Fundamentals**: Explorations of topics like search engines, language models, and system architecture
- **Learning in Public**: Documenting my journey from biomedical engineering to computer science

### Digital Garden Philosophy

Following the digital garden approach pioneered by thinkers like [Maggie Appleton](https://maggieappleton.com/garden-history), this site embraces:

- **Non-chronological organization**: Content is linked by ideas, not publication dates
- **Iterative development**: Posts evolve and improve over time
- **Transparency about completeness**: Each piece shows its current status (seedling, budding, complete)
- **Learning in public**: Sharing works-in-progress alongside finished pieces

## Technical Details

Built with modern web technologies for performance and maintainability:

- **Framework**: [Astro](https://astro.build/) for static site generation
- **Content**: Markdown and MDX with support for citations, diagrams, and callouts
- **Styling**: Custom CSS with Solarized color scheme
- **Search**: Client-side search powered by Pagefind
- **Analytics**: Vercel Analytics and Speed Insights

### Key Features

- ✅ Fast static site generation with Astro
- ✅ MDX support for rich content with React components
- ✅ Academic citations with bibliography support
- ✅ Mermaid diagrams for technical illustrations
- ✅ Client-side search functionality
- ✅ RSS feed for content syndication
- ✅ Responsive design with dark/light themes
- ✅ SEO optimized with structured data

## Project Structure

```text
├── public/                 # Static assets (images, fonts, etc.)
├── src/
│   ├── components/        # Reusable Astro components
│   ├── content/
│   │   ├── ideas/         # Main content collection (digital garden posts)
│   │   ├── books/         # Book covers and references
│   │   └── draft/         # Work-in-progress content
│   ├── layouts/           # Page layouts
│   ├── pages/             # Route definitions
│   └── styles/            # Global CSS
├── astro.config.mjs       # Astro configuration
└── package.json
```

The `src/content/ideas/` directory contains the main content, organized by year and topic. Each post includes frontmatter with metadata like status, tags, and publication dates.

## Development

Requirements:
- Node >=20

All commands are run from the root of the project:

| Command | Action |
| :-- | :-- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start local dev server at `localhost:4321` |
| `pnpm build` | Build production site to `./dist/` |
| `pnpm preview` | Preview build locally before deploying |

## Content Guidelines

When adding new content to the digital garden:

1. **Status tracking**: Use frontmatter to indicate content status (seedling, budding, complete)
2. **Tagging**: Add relevant tags for discoverability
3. **Dating**: Include both creation and update dates
4. **Audience**: Specify the intended audience level
5. **Media**: Store images in topic-specific directories under `public/`

## Inspiration

This site draws inspiration from the digital garden movement and several excellent personal sites:

- [Maggie Appleton](https://maggieappleton.com/) - Digital garden philosophy and design
- [Arlen McCluskey](https://www.arlenmccluskey.com/) - Technical writing style
- [Eugene Yan](https://eugeneyan.com/) - ML content structure
- [Swyx](https://www.swyx.io/) - Learning in public approach

## License

Content is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Code is MIT licensed.
