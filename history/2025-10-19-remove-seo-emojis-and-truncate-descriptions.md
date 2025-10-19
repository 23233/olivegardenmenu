# SEO Emoji Removal and Description Truncation

**Date:** 2025-10-19

## Requirements

1.  **Remove Emojis:** All emojis must be removed from the `h1` (title) and `description` fields within the `metadata` (SEO) section of all page configuration files.
2.  **Truncate Descriptions:** The `description` field within the `metadata` section must be no longer than 160 characters.

## Solution

1.  **Identify Target Files:** The page configuration files are located in the `/raw/pages/` directory.
2.  **Iterate and Process:**
    *   Read each JSON file in the `/raw/pages/` directory.
    *   Parse the JSON content to access the `metadata` object.
    *   Use a regular expression to remove emoji characters from the `h1` and `description` strings.
    *   Truncate the `description` string to the first 160 characters.
    *   Overwrite the original file with the updated JSON content.
3.  **Verification:** After processing, manually check a few files to ensure the changes were applied correctly and the JSON structure remains valid.