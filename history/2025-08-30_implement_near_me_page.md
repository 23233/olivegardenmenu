# Near Me Page Implementation - 2025-08-30

## Changes Summary

This change introduces the new "Olive Garden Near Me" page, located at the `/near-me/` route. The primary goal was to provide users with a dedicated page to find restaurant locations easily, featuring an interactive map and a comprehensive, sortable table of all locations. This work follows the two-stage, blueprint-driven process outlined in `AGENTS.md`.

## Implementation Details

1.  **Stage 1: Page Blueprint (`raw/near_me.json`)**
    *   A new page blueprint was created at `raw/near_me.json`.
    *   **Metadata**: Crafted SEO-optimized metadata, including a compelling H1 and description, to attract users searching for nearby Olive Garden locations.
    *   **Content Blocks**: Defined a clear structure using `contentBlocks`:
        *   A `richText` block for a welcoming introduction.
        *   A `googleMap` block to display the interactive map.
        *   A `dataTable` block to list up to 100 unique store locations. The data was sourced from `raw/maps_position.json`, then cleaned by removing duplicates and invalid entries.

2.  **Stage 2: HTML Generation (`src/index.ts`)**
    *   **Data Import**: Imported the new `near_me.json` blueprint.
    *   **Code Refactoring**:
        *   The existing `generateMainContent` function was refactored into a more generic `generatePageBody` function. This new function can render various content blocks, making the codebase more modular and scalable.
        *   The root `/` route was updated to use `generatePageBody` and dynamically append its unique "Near Me" promotional section, preserving existing functionality.
    *   **New Component Renderers**:
        *   `renderGoogleMap`: A new function to render the Google Maps `<iframe>`.
        *   `renderStoreDataTable`: A new function to render a `<table>` from header and row data, specifically for the store list.
    *   **New Route**:
        *   Added a new route handler for `/near-me/`.
        *   This handler uses the generic page generation functions (`generateHead`, `generateHeader`, `generatePageBody`, `generateFooter`) to build and serve the complete, standalone "Near Me" page from its JSON blueprint.
    *   **Styling & Scripting**: The new page reuses the existing mobile-first CSS and the generic JavaScript for navigation and the scroll-to-top button, ensuring a consistent user experience.

This implementation successfully creates the `/near-me/` page as requested, enhancing user navigation and providing valuable location-based information, all while improving the underlying codebase structure.
