# Homepage Generation - 2025-08-28

## Changes Summary

This change implements the initial homepage generation for the website. The primary goal was to build a dynamic, SEO-optimized homepage based on data from a JSON file and configuration from a Markdown file, following the detailed specifications in `AGENTS.md`.

## Implementation Details

1.  **Framework**: The page is generated within the Hono web framework running on Cloudflare Workers.
2.  **Entry Point**: The core logic was added to `src/index.ts`, replacing the placeholder "Hello Hono!" response for the root `/` route.
3.  **Data Sources**:
    *   **Menu Content**: The page dynamically ingests menu data from `raw/index.json`. This file is directly imported into the TypeScript code.
    *   **Site Configuration**: Global settings like site name, colors, and navigation structure are sourced from `site.md`. As file I/O is not available at runtime, the content of `site.md` was embedded as a string in `src/index.ts` and is parsed by a custom, lightweight parser.
4.  **HTML Generation**:
    *   The code is organized into helper functions (`generateHead`, `generateHeader`, `generateMainContent`, `generateFooter`) to improve readability and maintainability.
    *   **Head**: A comprehensive `<head>` section is generated, including:
        *   Creative, SEO-friendly `title` and `meta description` tags.
        *   Canonical and hreflang links.
        *   Open Graph and Twitter social media cards.
        *   Links for favicons (`.ico` and `.webp` for apple-touch-icon).
        *   A `<script type="application/ld+json">` block with `WebSite`, `Organization`, and `WebPage` schemas for structured data.
        *   Inlined, mobile-first CSS using variables derived from the colors in `site.md`.
    *   **Body**:
        *   The page features a responsive layout with a main container.
        *   The header and footer are dynamically built from the `navigation` section of `site.md`.
        *   The main content area displays all menu categories and items from the JSON data.
        *   Each menu item is presented in a card format, displaying its name, image, and calorie count.
        *   Images are rendered using the `<picture>` element for future flexibility (e.g., serving different formats) and include `loading="lazy"` and descriptive `alt` text for performance and accessibility.
        *   A "Quick Jumps" table of contents is automatically generated from the menu categories to improve user navigation.
5.  **Styling**:
    *   All CSS is inlined in the `<head>` as required.
    *   Styling is modern and clean, focusing on readability and a good user experience. It uses CSS variables for theming based on `site.md`.

This implementation successfully creates the homepage as requested, adhering to the project's technical stack and the detailed agent instructions.
