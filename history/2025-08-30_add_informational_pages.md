# 2025-08-30: Add Informational Pages

## Summary

This update adds four new informational pages to the website, based on the content and structure of the reference site `olivegardenmenue.com`. The new pages are:

-   Specials (`/specials/`)
-   Happy Hours (`/happy-hours/`)
-   Coupons (`/coupons/`)
-   Holiday Hours (`/holiday-hours/`)

## Changes

-   **Created Raw Data JSON:** Four new JSON files were created in `raw/` to hold the data for the new pages:
    -   `specials.json`
    -   `happy-hours.json`
    -   `coupons.json`
    -   `holiday-hours.json`
-   **Updated Page Generation Logic:** The main `src/index.ts` file was modified to:
    -   Import the four new data files.
    -   Add new routes (`/specials/`, `/happy-hours/`, `/coupons/`, `/holiday-hours/`) to render the pages.
-   **Content and Persona:** All new content was written to align with the "Savvy Foodie Superfan" persona defined in `AGENTS.md`, including the use of an engaging tone and emojis.
-   **Navigation:** No changes were needed to the navigation, as the links were already present in `raw/site.json`.
