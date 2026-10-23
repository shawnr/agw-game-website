# Field Manual screenshots (masters)

Lossless captures for the Field Manual, taken from game 1.1.0 on 2026-10-23. This folder sits outside `src/`, so nothing here is deployed. Convert to WebP into `src/assets/images/` when placing an image on a page.

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
| M9 | `fm-eruption`, `fm-eruption-tip` | Interactions › Eruptions, Explosion Risk |

To regenerate, from the `agw-game` repo: `love . --test fm_shots` (or `--op M7` for one shot). See its `test/README.md`.
