# Repo-Level UE Setup Guide

This guide describes how to set up Universal Editor (UE) support in an AEM Edge Delivery Services repo.

## Prerequisites

- An AEM EDS repo with `scripts/scripts.js` and a `blocks/` directory
- Node.js and npm installed

## Directory Structure

After setup, the repo should have:

```
ue/
  scripts/
    ue.js          # UE mutation observers and event handlers
    ue-utils.js    # Utility functions for moving instrumentation attributes
  models/
    component-definition.json  # References all definition files
    component-models.json      # References all model files
    component-filters.json     # References all filter files
    page.json                  # Page metadata model
    section.json               # Section definition, model, and filter
    text.json                  # Default text content definition
    image.json                 # Default image content definition
    blocks/                    # Block-specific model files
      <blockname>.json
```

## Setup Steps

### 1. Create UE Scripts

Copy `ue/scripts/ue.js` and `ue/scripts/ue-utils.js` from the reference examples.

**Important**: `ue.js` imports `showSlide` from `../../blocks/carousel/carousel.js`. If the target repo doesn't have a carousel block, either:
- Remove the import and the carousel cases in `setupObservers` and `setupUEEventHandlers`
- Or wrap the import in a try/catch

Similarly, remove or adjust mutation observer cases for blocks that don't exist in the target repo (cards, accordion, carousel, tabs).

### 2. Create Base Model Files

Copy these files to `ue/models/`:
- `component-definition.json` — Aggregates all definitions using `"..."` spread references
- `component-models.json` — Aggregates all models using `"..."` spread references
- `component-filters.json` — Aggregates all filters using `"..."` spread references
- `page.json` — Page metadata model (title, description, image, robots)
- `section.json` — Section definition with empty `components` filter array
- `text.json` — Default text content type
- `image.json` — Default image content type

The three root aggregation files use a `"..."` reference syntax that `merge-json-cli` resolves at build time:
```json
{ "...": "./blocks/*.json#/definitions" }
```
This pattern pulls in the `definitions` array from every JSON file in `blocks/`.

### 3. Add UE Integration to scripts.js

Add this snippet to `scripts/scripts.js` **before** the `loadPage()` call:

```js
// UE Editor support before page load
if (/\.(stage-ue|ue)\.da\.live$/.test(window.location.hostname)) {
  // eslint-disable-next-line import/no-unresolved
  await import(`${window.hlx.codeBasePath}/ue/scripts/ue.js`).then(({ default: ue }) => ue());
}
```

This conditionally loads UE support only when the page is served from a UE-enabled DA hostname.

### 4. Add npm Dependencies and Scripts

Add to `package.json`:

**devDependencies:**
```json
"merge-json-cli": "^1.0.4",
"npm-run-all": "^4.1.5"
```

**scripts:**
```json
"build:json": "npm-run-all -p build:json:models build:json:definitions build:json:filters",
"build:json:models": "merge-json-cli -i \"ue/models/component-models.json\" -o \"component-models.json\"",
"build:json:definitions": "merge-json-cli -i \"ue/models/component-definition.json\" -o \"component-definition.json\"",
"build:json:filters": "merge-json-cli -i \"ue/models/component-filters.json\" -o \"component-filters.json\""
```

### 5. Install and Build

```bash
npm install
npm run build:json
```

This generates the root-level `component-definition.json`, `component-models.json`, and `component-filters.json` files.

## Verification Checklist

- [ ] `ue/scripts/ue.js` exists and imports are valid for the target repo's blocks
- [ ] `ue/scripts/ue-utils.js` exists
- [ ] `ue/models/` contains all base files
- [ ] `scripts/scripts.js` has the UE hostname check before `loadPage()`
- [ ] `package.json` has `merge-json-cli` and `npm-run-all` in devDependencies
- [ ] `package.json` has `build:json` scripts
- [ ] `npm run build:json` succeeds
- [ ] Root-level `component-definition.json`, `component-models.json`, `component-filters.json` are generated
