# UE Field Type Reference

This document describes the available field types for Universal Editor component models.

## Field Components

Each field in a model's `fields` array has a `component` property that determines its editor widget.

### `text`
Single-line text input.
```json
{
  "component": "text",
  "name": "title",
  "label": "Title",
  "valueType": "string"
}
```

### `richtext`
Multi-line rich text editor with formatting support (bold, italic, links, lists).
```json
{
  "component": "richtext",
  "name": "text",
  "label": "Text",
  "valueType": "string"
}
```

### `reference`
Media/asset picker. Used for images and other media references.
```json
{
  "component": "reference",
  "name": "image",
  "label": "Image",
  "multi": false
}
```

### `boolean`
Toggle/checkbox for true/false values.
```json
{
  "component": "boolean",
  "name": "classes_autoplay",
  "label": "Autoplay Video",
  "valueType": "boolean"
}
```
Note: When the field name starts with `classes_`, the value maps to a CSS class on the block element (e.g., `classes_autoplay` adds/removes the `autoplay` class).

### `number`
Numeric input with optional min/max validation.
```json
{
  "component": "number",
  "name": "columns",
  "label": "Number of Columns",
  "valueType": "number",
  "value": 2,
  "validation": {
    "numberMin": 1,
    "numberMax": 6
  }
}
```

### `select`
Dropdown selection (single value).
```json
{
  "component": "select",
  "name": "type",
  "label": "Type",
  "valueType": "string",
  "options": [
    { "name": "Option A", "value": "option-a" },
    { "name": "Option B", "value": "option-b" }
  ]
}
```

### `multiselect`
Multi-value dropdown selection.
```json
{
  "component": "multiselect",
  "name": "style",
  "label": "Style",
  "options": [
    { "name": "Highlight", "value": "highlight" },
    { "name": "Dark", "value": "dark" }
  ]
}
```

## Common Field Properties

| Property | Type | Description |
|----------|------|-------------|
| `component` | string | The editor widget type (see above) |
| `name` | string | Field identifier. Maps to `data-aue-prop` in the DOM |
| `label` | string | Display label in the editor panel |
| `valueType` | string | Value type: `"string"`, `"number"`, `"boolean"` |
| `value` | any | Default value |
| `required` | boolean | Whether the field is required |
| `multi` | boolean | For `reference` fields, whether multiple items are allowed |
| `description` | string | Help text shown below the field |
| `validation` | object | Validation rules (e.g., `numberMin`, `numberMax`) |
| `options` | array | For `select`/`multiselect`, the available options |

## DA Plugin Fields

The `plugins.da.fields` array in definitions maps model fields to DOM selectors. Each entry has:

| Property | Description |
|----------|-------------|
| `name` | Must match a field `name` in the model |
| `selector` | CSS selector relative to the block's content structure |

Common selector patterns:
- `div:nth-child(1)` — first cell in a row
- `div:nth-child(1)>picture>img[src]` — image source in first cell
- `div:nth-child(1)>picture>img[alt]` — image alt text in first cell
- `div:nth-child(2)` — second cell (usually text content)
- `div>div>p>a[href]` — link URL in a cell
- `div>div>p>a` — link text in a cell

## DA Plugin Properties

The `plugins.da` object in definitions controls how DA creates the block's initial HTML:

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Block name identifier |
| `type` | string | Content type: `"text"`, `"image"` (for default content only) |
| `rows` | number | Number of initial rows in the block table |
| `columns` | number | Number of columns per row |
| `behaviour` | string | Special layout behavior: `"columns"`, `"columns-row"`, `"columns-cell"` |
| `unsafeHTML` | string | Raw HTML template for the block's initial structure |
| `fields` | array | Field-to-selector mappings (see above) |
