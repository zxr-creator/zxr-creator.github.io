# zxr-creator.github.io

Personal site of Xinrui Zhong: https://zxr-creator.github.io/

Plain HTML/CSS/JS. There is no build step and no Jekyll (`.nojekyll`).

```
index.html             all content (edit text here)
assets/css/style.css   design tokens at the top (colors, fonts), light + dark
assets/js/main.js      theme toggle, paper filters, live GitHub stars, figure "plates"
assets/favicon.svg
```

## Common edits

- **Add a paper:** copy one `<li class="pub">` block in `index.html`. Set `data-tags` (`first`, `ml`, `sys`, `rsi`) for the filter chips, and `data-glyph` to one of the plate patterns in `main.js` (`risa`, `vortex`, `serverbench`, `compressionbench`, `sparsp`, `r2dllm`, `genserve`, `qrmark`), or add a new pattern.
- **Venue badges:** `badge--accept` (solid, accepted), `badge--review` (outlined, under review), plain `badge` (arXiv).
- **Open-source card with live stars:** add `data-repo="owner/name"` on the `<article class="repo">` (public repos only).

## Preview locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
