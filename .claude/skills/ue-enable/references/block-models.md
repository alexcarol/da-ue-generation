# How to Create Block Model JSONs

This guide explains how to create a UE model JSON file for a block.

## File Structure

Each block model JSON lives at `ue/models/blocks/<blockname>.json` and contains three top-level keys:

```json
{
  "definitions": [...],
  "models": [...],
  "filters": [...]
}
```

### Definitions

The `definitions` array declares the components that appear in the editor's component picker. Each definition has:

- `title` — Human-readable name shown in the editor
- `id` — Unique identifier (must be lowercase, hyphenated)
- `model` — References a model ID from the `models` array
- `filter` — (Optional) References a filter ID from the `filters` array. Only needed if the block contains child components
- `plugins.da` — DA-specific configuration for how the block renders in the editor

**Simple block** (no child components):
```json
{
  "title": "Hero",
  "id": "hero",
  "model": "hero",
  "plugins": {
    "da": {
      "unsafeHTML": "<div class=\"hero\"><div><div>...</div></div></div>",
      "fields": [
        { "name": "image", "selector": "div>div>picture>img[src]" },
        { "name": "text", "selector": "div>div>h1" }
      ]
    }
  }
}
```

**Container block** (has child components like cards, accordion, carousel):
```json
{
  "title": "Cards",
  "id": "cards",
  "model": "cards",
  "filter": "cards",
  "plugins": {
    "da": {
      "rows": 1,
      "columns": 2
    }
  }
}
```

Container blocks also need a child item definition:
```json
{
  "title": "Card",
  "id": "card",
  "model": "card",
  "plugins": {
    "da": {
      "rows": 1,
      "columns": 2,
      "fields": [
        { "name": "image", "selector": "div:nth-child(1)>picture>img[src]" },
        { "name": "text", "selector": "div:nth-child(2)" }
      ]
    }
  }
}
```

### Models

The `models` array defines the editable fields for each component. Each model has:

- `id` — Must match the `model` reference in a definition
- `fields` — Array of field objects (see `field-types.md` for available types)

```json
{
  "id": "card",
  "fields": [
    {
      "component": "reference",
      "name": "image",
      "label": "Image",
      "multi": false
    },
    {
      "component": "richtext",
      "name": "text",
      "label": "Text",
      "valueType": "string"
    }
  ]
}
```

### Filters

The `filters` array controls which child components can be inserted inside a container block:

```json
{
  "id": "cards",
  "components": ["card"]
}
```

- If a block has no child components, use an empty array: `"filters": []`
- The filter `id` must match the `filter` reference in the definition

## Step-by-Step Process

1. **Read the block's code** (`blocks/<blockname>/<blockname>.js` and `.css`) to understand:
   - What fields/cells the block expects (images, text, links, etc.)
   - Whether it has repeating child items (cards, slides, tabs, etc.)
   - Whether it performs DOM mutations (replacing divs with other elements)

2. **Check for a matching template** in the known block templates (accordion, cards, carousel, columns, fragment, hero, quote, search, tabs, video)

3. **Define the component(s):**
   - One definition for the block itself
   - Additional definitions for child item types (if container block)

4. **Define the model(s):**
   - Map each editable content area to a field
   - Choose appropriate field types (text, richtext, reference, boolean, etc.)
   - Use `classes_*` naming for fields that map to CSS classes on the block

5. **Define filters** (if container block):
   - List which child component IDs can be inserted

6. **Configure DA plugin properties:**
   - For table-based blocks: set `rows` and `columns`
   - For custom HTML blocks: use `unsafeHTML` with the initial structure
   - Map fields to selectors with `fields` array

## Common Patterns

### Image + Text Block
```json
"fields": [
  { "name": "image", "selector": "div:nth-child(1)>picture>img[src]" },
  { "name": "imageAlt", "selector": "div:nth-child(1)>picture>img[alt]" },
  { "name": "text", "selector": "div:nth-child(2)" }
]
```

### Link-based Block
```json
"fields": [
  { "name": "url", "selector": "div>div>p>a[href]" },
  { "name": "urlText", "selector": "div>div>p>a" }
]
```

### Richtext Container Pattern

When a block cell contains multiple mixed elements — such as a heading, paragraph, and CTA link together — model it as a **single `richtext` field** targeting the container `<div>`, rather than splitting each element into its own field.

This is the standard pattern used by cards, carousel, tabs, accordion, and most blocks where a cell has mixed content.

**When to use richtext container:**
- A cell has `<h1>` + `<p>` + `<a>` (heading, description, CTA)
- A cell has `<h3>` + `<p>` (title + description)
- A cell has any mix of headings, paragraphs, and links

**Model field:**
```json
{
  "component": "richtext",
  "name": "text",
  "label": "Text",
  "valueType": "string"
}
```

**DA plugin selector** — target the container div, not individual children:
```json
{ "name": "text", "selector": "div:nth-child(2)" }
```

**When NOT to use richtext container** — only split into separate fields when elements serve distinct semantic purposes that must be independently controlled:
- A "quote" block with separate `quote` (the text) and `author` (attribution) fields
- A block where the heading maps to one visual area and the paragraph to a completely different area

**Example — hero block with richtext:**

In `.plain.html`, a hero cell might contain:
```html
<div>
  <h1>Welcome</h1>
  <p>We help businesses grow.</p>
  <p class="button-container"><a href="/contact">Get Started</a></p>
</div>
```

Model this entire cell as one richtext field rather than three separate fields. The UE editor will let authors edit all the text content within that container naturally.

### Block with Style Variants
Use `classes_*` fields in the model to toggle CSS classes:
```json
{
  "component": "boolean",
  "name": "classes_autoplay",
  "label": "Autoplay",
  "valueType": "boolean"
}
```
