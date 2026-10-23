# Field Manual screenshots (masters)

Lossless captures for the Field Manual, taken from game 1.1.0 on 2026-10-23 (M7 and M9 recaptured the same day per the doc's recapture notes). This folder sits outside `src/`, so nothing here is deployed. Convert to WebP into `src/assets/images/` when placing an image on a page.

- `<name>.png`: the cropped capture. No labels or callouts are drawn in.
- `<name>.json`: the sidecar. `meta.caption` and `meta.alt` are draft caption and alt text. `callouts` are label rectangles in the PNG's own pixels, for the web side to draw.
- `index.html`: contact sheet with the callout boxes overlaid. Serve the folder to view it: `python3 -m http.server 8765 --directory fm-shots`.

Shot list and placement, from the "AG&W Field Manual Screenshot Requests" doc:

| Shot | Files | Used on |
|---|---|---|
| M1 | `fm-map` | How to Play › The map (main image); Overview › Quick start |
| M2 | `fm-tip-customer-short` | How to Play › Customer satisfaction; Tips › win timer resets, arriving just short |
| M3 | `fm-mood-content`, `-annoyed`, `-frustrated`, `-angry`, `-furious` | How to Play › Customer satisfaction, beside the Moods table |
| M4 | `fm-conduit-drawing` | How to Play › Building conduits, Distance; Tips › arriving just short |
| M5 | `fm-tip-conduit-dissipation` | How to Play › Distance, Capacity; Components › Basic conduit |
| M6 | `fm-radial-build-root`, `fm-radial-build-submenu` | Components › Placing and removing; Controls › Radial menu |
| M7 | `fm-mixed-raw-vs-filtered`, `fm-mixed-tip-source`, `-raw`, `-filter` | Sources & Customers › Mixed sources; Components › Filter, Raw mixed and merged, Insulated |
| M8 | `fm-inspector` | Interactions › How interactions work |
| M9 | `fm-eruption-before`, `fm-eruption`, `fm-eruption-tip` | Interactions › Eruptions, Explosion Risk (before and after side by side) |

## Placing on the site

The WebP copies live in `src/assets/images/field-manual/` (`cwebp -lossless -z 9 X.png -o src/assets/images/field-manual/X.webp`). `figures.py` builds each figure (image, numbered callout overlay from the sidecar, caption, legend) and writes it into its page between `<!-- fig:NAME -->` and `<!-- /fig:NAME -->` markers. Placement, legend wording and marker positions are in its `SPEC`. Re-run it from the website repo root after any recapture:

    python3 fm-shots/figures.py

To regenerate the captures, from the `agw-game` repo: `love . --test fm_shots` (or `--op M7` for one shot). See its `test/README.md`.
