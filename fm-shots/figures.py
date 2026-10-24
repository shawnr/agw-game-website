#!/usr/bin/env python3
"""Build the Field Manual's screenshot figures from the masters in this folder.

Each figure is written into its page between marker comments:

    <!-- fig:NAME -->  ...generated...  <!-- /fig:NAME -->

so re-running replaces it in place. Images are read from the sidecars
(<shot>.json) for their size, caption, alt text and callout rectangles; the
SPEC below decides placement, legend wording, numbering order and where each
numbered marker sits.

Callout drawing:
  - "box": outline the sidecar rectangle (good for buildings, components,
    tooltip rows). Default for rectangles up to 140px in both directions.
  - "at": [x, y] puts the numbered marker at that point instead of the box's
    corner (used for conduits, zones and panels, whose rectangles are too
    coarse to outline).
  - "side": "left" | "right" | "corner" for where the marker sits on a box.

Usage (from the website repo root):
    python3 fm-shots/figures.py            # update every page
    cwebp -lossless -z 9 fm-shots/X.png -o src/assets/images/field-manual/X.webp
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "fm-shots")
PAGES = os.path.join(ROOT, "src", "field-manual")
IMG_URL = "../assets/images/field-manual/"


def load(name):
    with open(os.path.join(SHOTS, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------------------------------------------
# What goes where. "callouts" lists sidecar labels in legend order, each with
# its legend text (HTML allowed) and optional drawing overrides.
# --------------------------------------------------------------------------
SPEC = [
    {
        "fig": "map", "page": "how-to-play.html",
        "shots": [{"name": "fm-map"}],
        "full_size": True,
        "callouts": [
            ("source", 'Source (a <a href="buildings.html#ley-line-nexus">Ley Line Nexus</a>)', {"side": "left"}),
            ("conduit with pulses", "Conduit, with mana pulses", {"at": [262, 196]}),
            ("customer", "Customer (a Wizard Academy)", {"side": "below"}),
            ("mood ring", 'Mood ring (<a href="#satisfaction">satisfaction</a>)', {"side": "above"}),
            ("need dots (bright = supplied)", "Need dots: bright means that type is supplied", {"side": "left", "pad": 5}),
            ("transformer", '<a href="components.html#transformer">Transformer</a>', {"side": "left"}),
            ("splitter", '<a href="components.html#splitter">Splitter</a>', {"side": "right"}),
            ("hybrid", '<a href="buildings.html#hybrids">Hybrid</a> (a Dwarven Forge)', {"side": "right"}),
            ("goal and streak bar", 'Goal and <a href="#winning">Contentment streak</a> bar', {"side": "right"}),
            ("budget and credit limit", 'Budget and <a href="#debt">credit limit</a>', {"side": "below", "grow_w": 52}),
            ("daily income", "Daily income", {"side": "below"}),
            ("day", "Day and speed", {"side": "below"}),
            ("[Info] tab", "[Info] tab: press <kbd>N</kbd>", {"side": "right"}),
            ("minimap", "Minimap: press <kbd>M</kbd>", {"side": "right"}),
            ("speed control", 'Speed control (<a href="#time">time</a>)', {"side": "left"}),
            ("taskbar", "Taskbar: back to the terminal", {"at": [300, 706], "box": False}),
        ],
    },
    {
        "fig": "conduit-drawing", "page": "how-to-play.html",
        "shots": [{"name": "fm-conduit-drawing"}],
        "callouts": [
            ("source", "Start: the source you clicked", {"side": "left"}),
            ("pinned waypoint", "Pinned waypoint", {"side": "corner"}),
            ("route preview", "Route preview", {"at": [520, 112], "box": False}),
            ("cost line", "Cost, and the pin hint", {"side": "right"}),
            ("prediction panel", "Prediction: what will arrive, and whether it's short", {"side": "left"}),
        ],
    },
    {
        "fig": "dissipation", "page": "how-to-play.html",
        "shots": [{"name": "fm-tip-conduit-dissipation"}],
        "callouts": [
            ("delivered / capacity", "Delivered against capacity", {"side": "right"}),
            ("distance loss", "Lost to distance", {"side": "right"}),
        ],
    },
    {
        "fig": "moods", "page": "how-to-play.html",
        "caption": "Customer moods, from Content to Furious. Angry and Furious customers pay nothing.",
        "shots": [
            {"name": "fm-mood-content", "label": "Content", "alt": "Customer with a green Content ring."},
            {"name": "fm-mood-annoyed", "label": "Annoyed", "alt": "Customer with a yellow Annoyed ring."},
            {"name": "fm-mood-frustrated", "label": "Frustrated", "alt": "Customer with an orange Frustrated ring."},
            {"name": "fm-mood-angry", "label": "Angry", "alt": "Customer with a red Angry ring."},
            {"name": "fm-mood-furious", "label": "Furious", "alt": "Customer with a bright red Furious ring."},
        ],
        "row": "moods",
        "callouts": [],
    },
    {
        "fig": "customer-short", "page": "how-to-play.html",
        "caption": "Hovering over a customer shows what each mana type receives against what it needs. The !! marks a type that's short.",
        "shots": [{"name": "fm-tip-customer-short"}],
        "callouts": [
            ("declining trend", "Mood trend", {"side": "right"}),
            ("got / need", "Received against need, per type", {"side": "left"}),
            ("!! means short", "<code>!!</code> marks a type that's short", {"side": "right", "box": False}),
            ("mood multiplier", "Revenue, scaled by mood", {"side": "below"}),
        ],
    },
    {
        "fig": "radial", "page": "components.html",
        "caption": "Right-click to open the radial menu. Build lists every component you've unlocked, with its price.",
        "shots": [
            {"name": "fm-radial-build-root", "label": "Radial menu: Field Manual, Build, Demolish",
             "alt": "Radial menu with three slices: Field Manual, Build and Demolish, with Build highlighted."},
            {"name": "fm-radial-build-submenu", "label": "Build submenu, with prices",
             "alt": "The Build submenu: Relay Station 50gc, Splitter 30gc, Transformer 100gc, Battery 75gc and Filter 60gc, with Splitter highlighted."},
        ],
        "row": "pair",
        "callouts": [],
    },
    {
        "fig": "mixed", "page": "buildings.html",
        "shots": [{"name": "fm-mixed-raw-vs-filtered"}],
        "full_size": True,
        "callouts": [
            ("mixed source", "Mixed source (a Mud Spring)", {"side": "left"}),
            ("raw two-tone line", "Raw mixed line: earth and water together", {"at": [262, 100], "box": False}),
            ("Fertile Growth zone", '<a href="interactions.html#fertile-growth">Fertile Growth</a> along the raw line', {"side": "below", "dash": True}),
            ("filter", '<a href="components.html#filter">Filter</a> on the next hex', {"side": "right"}),
            ("insulated line", 'Insulated water line: passes fire with no reaction', {"at": [610, 38], "box": False}),
        ],
    },
    {
        "fig": "mixed-source-tip", "page": "buildings.html",
        "shots": [{"name": "fm-mixed-tip-source"}],
        "callouts": [
            ("two types", "Two types, 15 of each", {"side": "right"}),
            ("filter hint", "The game's hint to filter it", {"side": "left"}),
        ],
    },
    {
        "fig": "mixed-raw-tip", "page": "components.html",
        "shots": [{"name": "fm-mixed-tip-raw"}],
        "callouts": [
            ("per-type share", "Each type gets half the capacity", {"side": "right"}),
            ("reacts with itself", "Its two types react with each other", {"side": "left"}),
        ],
    },
    {
        "fig": "filter-tip", "page": "components.html",
        "shots": [{"name": "fm-mixed-tip-filter"}],
        "callouts": [
            ("allowed type", "The type it passes", {"side": "right"}),
            ("half capacity", "Insulated, at half capacity", {"side": "left"}),
        ],
    },
    {
        "fig": "inspector", "page": "interactions.html",
        "shots": [{"name": "fm-inspector"}],
        "callouts": [
            ("reacting hex", "Reacting hex (the academy, where both lines end)", {"side": "below"}),
            ("inspector panel", "Inspector: the interaction and what it does", {"at": [448, 30], "box": False}),
            ("strength", "Strength: 100% stacked, 50% adjacent", {"side": "right", "box": True}),
        ],
    },
    {
        "fig": "eruption", "page": "interactions.html",
        "caption": "Before and during an eruption. Every conduit in the zone loses part of its flow until the next day's check, and flashes red.",
        "shots": [
            {"name": "fm-eruption-before", "label": "An ordinary day",
             "alt": "Fire and gas conduits meeting at a goblin bazaar, in their normal colors."},
            {"name": "fm-eruption", "label": "The day it erupts",
             "alt": "The same fire and gas conduits flashing red, with a hazard notice: Eruption! 2 conduits lost up to 30% of their energy today."},
        ],
        "row": "pair",
        "callouts": [
            ("hazard zone", 'Hazard zone: fire and gas meet on the bazaar (<a href="#explosion-risk">Explosion Risk</a>)', {"side": "corner"}),
            ("flashing conduits", "The conduits through the zone", {"at": [240, 226], "box": False}),
            ("HAZARD notice", "Hazard notice (after only)", {"side": "left"}),
        ],
    },
    {
        "fig": "eruption-tip", "page": "interactions.html",
        "shots": [{"name": "fm-eruption-tip"}],
        "callouts": [
            ("distance loss", "Distance loss", {"side": "left"}),
            ("eruption loss", "Eruption loss, shown separately", {"side": "left"}),
            ("zone tag", "The zone it's in", {"side": "left"}),
        ],
    },
]


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------
def esc(s):
    return html.escape(s, quote=True)


def marker_r(w):
    return max(11, round(w / 70))


def svg_for(shot, callouts, numbers):
    """SVG overlay for one image. numbers maps sidecar label -> legend number."""
    w, h = shot["crop"]["w"], shot["crop"]["h"]
    r = marker_r(w)
    rects = {c["label"]: c for c in shot["callouts"]}
    parts = []
    badges = []
    for label, _legend, opt in callouts:
        if label not in rects or label not in numbers:
            continue
        c = dict(rects[label])
        if opt.get("trim_right"):
            c["w"] -= opt["trim_right"]
        if opt.get("grow_w"):
            c["w"] += opt["grow_w"]
        pad = opt.get("pad", 3)
        x, y, cw, ch = c["x"] - pad, c["y"] - pad, c["w"] + 2 * pad, c["h"] + 2 * pad
        big = cw > 140 and ch > 140
        draw_box = opt.get("box", not big and "at" not in opt)
        if draw_box:
            dash = ' stroke-dasharray="6 4"' if opt.get("dash") else ""
            parts.append(
                f'<rect class="fm-co-halo" x="{x}" y="{y}" width="{cw}" height="{ch}" rx="4"/>'
                f'<rect class="fm-co-box" x="{x}" y="{y}" width="{cw}" height="{ch}" rx="4"{dash}/>')
        if "at" in opt:
            bx, by = opt["at"]
        else:
            side = opt.get("side", "corner")
            if side == "left":
                bx, by = x - r - 2, y + ch / 2
            elif side == "right":
                bx, by = x + cw + r + 2, y + ch / 2
            elif side == "below":
                bx, by = x + cw / 2, y + ch + r + 2
            elif side == "above":
                bx, by = x + cw / 2, y - r - 2
            else:
                bx, by = x, y
        bx = min(max(bx, r + 1), w - r - 1)
        by = min(max(by, r + 1), h - r - 1)
        n = numbers[label]
        badges.append(
            f'<g class="fm-co-badge"><circle cx="{bx:.0f}" cy="{by:.0f}" r="{r}"/>'
            f'<text x="{bx:.0f}" y="{by:.0f}" font-size="{round(r * 1.5)}">{n}</text></g>')
    if not parts and not badges:
        return ""
    return (f'<svg class="fm-shot-callouts" viewBox="0 0 {w} {h}" preserveAspectRatio="xMinYMin meet" aria-hidden="true" focusable="false">'
            + "".join(parts) + "".join(badges) + "</svg>")


def shot_block(entry, item, numbers, callouts):
    shot = load(item["name"])
    w, h = shot["crop"]["w"], shot["crop"]["h"]
    alt = item.get("alt") or shot["meta"].get("alt", "")
    src = IMG_URL + item["name"] + ".webp"
    img = (f'<img src="{src}" width="{w}" height="{h}" alt="{esc(alt)}" '
           f'loading="lazy" decoding="async">')
    svg = svg_for(shot, callouts, numbers)
    return f'<div class="fm-shot" style="max-width:{w}px">{img}{svg}</div>', shot


def figure_html(entry):
    labels = [c[0] for c in entry["callouts"]]
    numbers = {lab: i + 1 for i, lab in enumerate(labels)}
    blocks, first = [], None
    for item in entry["shots"]:
        block, shot = shot_block(entry, item, numbers, entry["callouts"])
        first = first or shot
        if entry.get("row"):
            label = f'<p class="fm-shot-label">{esc(item["label"])}</p>' if item.get("label") else ""
            blocks.append(f'<div class="fm-shot-item">{block}{label}</div>')
        else:
            blocks.append(block)
    body = "".join(blocks)
    if entry.get("row"):
        body = f'<div class="fm-shot-row {entry["row"]}">{body}</div>'
    caption = entry.get("caption") or first["meta"].get("caption", "")
    cap = f"<p>{esc(caption)}"
    if entry.get("full_size"):
        name = entry["shots"][0]["name"]
        cap += f' <a class="fm-shot-full" href="{IMG_URL}{name}.webp">View full size</a>'
    cap += "</p>"
    if labels:
        items = "".join(f"<li><span>{c[1]}</span></li>" for c in entry["callouts"])
        cap += f'<ol class="fm-callouts" role="list">{items}</ol>'
    return (f'<figure class="fm-figure" id="fig-{entry["fig"]}">'
            f"{body}<figcaption>{cap}</figcaption></figure>")


def main():
    changed = {}
    for entry in SPEC:
        page = os.path.join(PAGES, entry["page"])
        text = changed.get(page) or open(page, encoding="utf-8").read()
        tag = entry["fig"]
        pat = re.compile(r"(<!-- fig:%s -->).*?(<!-- /fig:%s -->)" % (re.escape(tag), re.escape(tag)), re.S)
        if not pat.search(text):
            sys.exit(f"missing marker <!-- fig:{tag} --> in {entry['page']}")
        markup = figure_html(entry)
        text = pat.sub(lambda m: m.group(1) + "\n      " + markup + "\n      " + m.group(2), text)
        changed[page] = text
    for page, text in changed.items():
        with open(page, "w", encoding="utf-8") as f:
            f.write(text)
        print("updated", os.path.relpath(page, ROOT))


if __name__ == "__main__":
    main()
