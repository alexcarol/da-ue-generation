# Content Discovery Methodology

How to discover the actual content authored on an EDS/DA site, so block models can be built from real-world usage rather than assumptions.

## Why Content Discovery Matters

Block templates capture the da-block-collection's own implementation, but target repos may use blocks differently — extra paragraphs, CTA links, different heading levels, additional images. The `.plain.html` endpoint reveals the raw block structure as authored, which is the source of truth for what the UE model must support.

## Site URL Patterns

Given a GitHub repo `{org}/{repo}` on the `main` branch:

- **Site preview**: `https://main--{repo}--{org}.aem.page/`
- **Content source** (if DA): `https://content.da.live/{org}/{repo}/`
- **fstab.yaml**: check the repo root for `fstab.yaml` which defines the content source

## Content Access Endpoints

### `/query-index.json` — Page Index

Fetch `https://main--{repo}--{org}.aem.page/query-index.json` to get a JSON array of all published pages:

```json
{
  "data": [
    {
      "path": "/",
      "title": "Home",
      "description": "...",
      "image": "/media_1234.jpeg"
    },
    {
      "path": "/about",
      "title": "About Us",
      ...
    }
  ]
}
```

Use this to find candidate pages that might contain a specific block. Common heuristics:
- Home page (`/`) often has hero, cards, columns
- Pages with short paths are usually top-level landing pages with diverse blocks
- The `description` or `title` fields may hint at content type

### `{path}.plain.html` — Raw Block HTML

Append `.plain.html` to any page path to get the raw, undecorated HTML — the block structure **before** any JavaScript runs:

```
https://main--{repo}--{org}.aem.page/about.plain.html
```

For the home page:
```
https://main--{repo}--{org}.aem.page/.plain.html
```

This returns HTML like:

```html
<body>
  <header></header>
  <main>
    <div>
      <div class="hero">
        <div>
          <div>
            <picture>...</picture>
          </div>
        </div>
        <div>
          <div>
            <h1>Welcome to Our Site</h1>
            <p>We help businesses grow with innovative solutions.</p>
            <p class="button-container"><a href="/contact">Get Started</a></p>
          </div>
        </div>
      </div>
    </div>
    <div>
      <div class="cards">
        <div>
          <div><picture>...</picture></div>
          <div>
            <h3>Card Title</h3>
            <p>Card description text</p>
            <p class="button-container"><a href="/learn-more">Learn More</a></p>
          </div>
        </div>
        <!-- more card rows... -->
      </div>
    </div>
  </main>
</body>
```

## How to Find Pages Containing a Block

1. **Fetch `/query-index.json`** using WebFetch
2. **Pick 2-3 candidate pages** — start with `/` (home), then try pages with short paths
3. **Fetch `{path}.plain.html`** for each candidate
4. **Search for `<div class="{blockname}">`** in the HTML
5. If the block isn't found on those pages, try additional paths from the index

## Analyzing Raw Block HTML

Once you find the block in `.plain.html`, catalog every content element inside it:

### Element types to look for

| HTML Element | Typical UE Field Type | Notes |
|---|---|---|
| `<picture>` / `<img>` | `reference` (image) | Always comes wrapped in `<picture>` in EDS |
| `<h1>` through `<h6>` | `richtext` or `text` | Note the heading level used |
| `<p>` (plain text) | `richtext` | Often combined with headings in a single richtext container |
| `<p class="button-container"><a>` | Part of `richtext`, or separate `aem-content` field | CTA links get `button-container` class |
| `<ul>`, `<ol>` | `richtext` | Lists within block cells |
| `<a>` (standalone) | `aem-content` or `text` | Links without button styling |

### Block structure in `.plain.html`

EDS blocks follow a table-like structure in raw HTML:

```
<div class="blockname">          <!-- block wrapper -->
  <div>                          <!-- row -->
    <div>content cell 1</div>    <!-- column 1 -->
    <div>content cell 2</div>    <!-- column 2 -->
  </div>
  <div>                          <!-- another row (for container blocks) -->
    <div>...</div>
    <div>...</div>
  </div>
</div>
```

- **Rows** = direct child `<div>`s of the block wrapper
- **Columns** = child `<div>`s within each row
- A single-row block with 2 columns (e.g., image | text) is a simple block
- Multiple rows with the same structure = container block with repeating items

### What to record

For each block cell, note:
1. Which row and column it's in
2. All elements present (h1, p, a, picture, etc.)
3. Whether multiple elements share a single cell (candidates for richtext container)
4. Whether there are multiple rows with the same structure (container block pattern)

## Mapping Content to UE Model Fields

### Single-element cells
If a cell contains only an image or only a single heading, map it directly:
- Image cell -> `reference` field
- Single heading -> `text` field

### Multi-element cells
If a cell contains mixed elements (e.g., h1 + p + a), use the **richtext container pattern**:
- Model it as a single `richtext` field targeting the container `<div>`
- This lets authors edit all the text content naturally
- See the "Richtext Container Pattern" section in `block-models.md`

### Repeating rows
If the block has multiple rows with identical structure:
- It's a container block — model the parent and a child item separately
- The child item model describes one row
- Add a filter to control which child types are allowed
