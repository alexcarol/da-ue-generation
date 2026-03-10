# UE-Enable Skill

Enable Universal Editor (UE) support in an AEM Edge Delivery Services repo, and add UE models for specific blocks.

## Usage

```
/ue-enable [blockname]
```

- With no arguments: sets up the full UE scaffolding for the repo
- With a block name: ensures UE scaffolding exists, then adds the model for that block

## Phase 1: Check if Repo is UE-Enabled

Check for these indicators:
1. `ue/` directory exists with `scripts/ue.js` and `models/` subdirectory
2. `scripts/scripts.js` contains the UE hostname check (`stage-ue|ue`)
3. Root-level `component-definition.json`, `component-models.json`, `component-filters.json` exist
4. `package.json` has `build:json` scripts and `merge-json-cli` dependency

### If NOT UE-enabled, perform full repo setup:

Read the reference guide at `references/ue-setup.md` for full details. In summary:

1. **Create `ue/scripts/ue.js`** from `references/examples/ue.js`
   - IMPORTANT: Check if the target repo has a `blocks/carousel/carousel.js`. If not, remove the `import { showSlide }` line and all carousel-related code in `setupObservers` and `setupUEEventHandlers`.
   - Similarly, remove mutation observer cases (cards, accordion, carousel) for blocks that don't exist in the target repo. Only keep observers for blocks the repo actually has.

2. **Create `ue/scripts/ue-utils.js`** from `references/examples/ue-utils.js` (copy as-is)

3. **Create `ue/models/` base files** from `references/examples/`:
   - `component-definition.json` (copy as-is)
   - `component-models.json` (copy as-is)
   - `component-filters.json` (copy as-is)
   - `page.json` (copy as-is)
   - `section.json` — Use the template which has an **empty** `components` array in the filter. Blocks get added to this list as they are enabled.
   - `text.json` (copy as-is)
   - `image.json` (copy as-is)

4. **Add UE integration to `scripts/scripts.js`**
   - Find the `loadPage()` call
   - Insert the snippet from `references/examples/scripts-integration.js` immediately **before** `loadPage()`
   - The snippet must use `await`, so ensure the surrounding context supports top-level await (EDS repos do)

5. **Add npm dependencies and build scripts to `package.json`**
   - Add `"merge-json-cli": "^1.0.4"` and `"npm-run-all": "^4.1.5"` to `devDependencies`
   - Add these scripts:
     ```
     "build:json": "npm-run-all -p build:json:models build:json:definitions build:json:filters",
     "build:json:models": "merge-json-cli -i \"ue/models/component-models.json\" -o \"component-models.json\"",
     "build:json:definitions": "merge-json-cli -i \"ue/models/component-definition.json\" -o \"component-definition.json\"",
     "build:json:filters": "merge-json-cli -i \"ue/models/component-filters.json\" -o \"component-filters.json\""
     ```

6. **Run `npm install` and `npm run build:json`**

## Phase 2: Add UE Support for a Block

If a block name was provided, add UE model support for it.

### Step 1: Check for existing model

Look for `ue/models/blocks/<blockname>.json`. If it exists, inform the user and skip.

### Step 2: Read the block's code

Read `blocks/<blockname>/<blockname>.js` and `blocks/<blockname>/<blockname>.css` to understand:
- What content cells/fields the block expects
- Whether it has repeating child items (container block)
- What DOM transformations it performs
- Whether it uses images, links, rich text, etc.

### Step 3: Discover actual content using the block

**This is critical.** Before finalizing a model, discover how the block is actually used on the site. Refer to `references/content-discovery.md` for the full methodology.

1. **Determine the site preview URL.** Derive it from the repo name and org: `https://main--{repo}--{org}.aem.page/`. If unclear, check `fstab.yaml` or ask the user.

2. **Fetch `/query-index.json`** (via WebFetch) to get the list of published pages. Pick 2-3 candidate pages likely to contain the block — start with `/` (home page) and other short-path pages.

3. **Fetch `{path}.plain.html`** for each candidate page (via WebFetch). Search the HTML for `<div class="{blockname}">` to find the block's raw authored content.

4. **Catalog ALL content elements** inside the block's raw HTML:
   - Count and identify every element: images, headings (note level), paragraphs, links, lists
   - Note which elements share a cell (candidates for richtext container)
   - Note if there are multiple rows with identical structure (container block)

5. If content discovery fails (site not published, no pages found, block not present on any page), fall back to code analysis from Step 2 and any available template.

### Step 4: Check for a known template

These blocks have pre-built templates in `references/examples/blocks/`:
- accordion, cards, carousel, columns, fragment, hero, quote, search, tabs, video

If the block name matches, use the template as a **starting point** — but verify and adjust it against the content discovered in Step 3. The template represents the da-block-collection's implementation; the target repo may have additional or different fields.

If no template exists, build the model entirely from the content analysis and code reading.

### Step 5: Create or adjust the model

- **Compare** the template (if any) against the discovered content. Add fields for any content elements the template misses (e.g., paragraphs, CTA links).
- When a block cell contains multiple mixed elements (h1 + p + a), use the **richtext container pattern** — a single `richtext` field targeting the container div. See `references/block-models.md` for details.
- If creating from scratch, follow the patterns in `references/block-models.md`
- Create the file at `ue/models/blocks/<blockname>.json`

Refer to `references/block-models.md` for the full guide on creating model JSONs.
Refer to `references/field-types.md` for available field types.

The JSON must have three top-level keys:
```json
{
  "definitions": [...],
  "models": [...],
  "filters": [...]
}
```

### Step 6: Register the block in section.json

Open `ue/models/section.json` and add the block's ID to the `filters[0].components` array.

For example, if adding "hero":
```json
"filters": [
  {
    "id": "section",
    "components": ["hero"]
  }
]
```

### Step 7: Check if ue.js needs updates

If the block performs heavy DOM mutations (replacing divs with other elements like ul/li, details/summary, etc.), it may need a MutationObserver case in `ue/scripts/ue.js`.

Known blocks that need mutation observers:
- **cards** — replaces div children with ul/li
- **accordion** — replaces divs with details/summary
- **carousel** — maps removed divs to slide elements

If adding such a block to a repo that was just set up (Phase 1), add the corresponding observer case to `ue/scripts/ue.js`. Use the reference examples as a guide.

### Step 8: Build

Run `npm run build:json` to regenerate the root-level JSON files.

### Step 9: Verify

1. Confirm `ue/models/blocks/<blockname>.json` exists with valid JSON
2. Confirm the block ID appears in `ue/models/section.json` filters
3. Confirm `npm run build:json` succeeds
4. Confirm root-level `component-definition.json` contains the new block's definitions

## Reference Files

All reference files are in this skill's directory:

| File | Purpose |
|------|---------|
| `references/ue-setup.md` | Full repo-level UE setup guide |
| `references/block-models.md` | How to create block model JSONs |
| `references/field-types.md` | UE field type reference |
| `references/content-discovery.md` | How to discover actual site content via .plain.html |
| `references/examples/scripts-integration.js` | The scripts.js snippet to add |
| `references/examples/ue.js` | Full ue.js with mutation observers |
| `references/examples/ue-utils.js` | UE utility functions |
| `references/examples/component-definition.json` | Template for component-definition.json |
| `references/examples/component-models.json` | Template for component-models.json |
| `references/examples/component-filters.json` | Template for component-filters.json |
| `references/examples/page.json` | Page metadata model |
| `references/examples/section.json` | Section model (empty components filter) |
| `references/examples/text.json` | Text content model |
| `references/examples/image.json` | Image content model |
| `references/examples/blocks/*.json` | Known block model templates |
