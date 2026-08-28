#!/usr/bin/env python3
"""
Manual capture helper for Willowbrook canonical shots.

This script prints the URLs to load in the in-app browser and tells the
user where to save each screenshot. Run it, walk through the URLs in
order, take the screenshot in your browser, save it to the indicated
path. When all paths exist, run:

  python3 tools/metrics.py --shots .critique/shots/w6-canonical

The "single_sun" gate is now sky-band-only (red-sands defect), so
lanterns, water, and roof ridges don't count as false positives.

We can't programmatically screenshot from this script because:
  1. external Chrome / Puppeteer / Playwright are explicitly forbidden
  2. the in-app browser tool's screenshot action is intermittently wedged

The URLs use the autostart + ?shot= helpers in main.js (already wired
for the wave-4 capture rig) so reload-to-test is fast.
"""

CANONICAL = [
    # (filename, url, description)
    ("noon-plaza",
     "http://localhost:8080/index.html?autostart=1&hour=14&x=0&z=2&shot=noon-plaza",
     "noon plaza overview"),
    ("dawn-plaza",
     "http://localhost:8080/index.html?autostart=1&hour=6.5&x=0&z=2&shot=dawn-plaza",
     "dawn peach-band sky over the plaza"),
    ("dusk-plaza",
     "http://localhost:8080/index.html?autostart=1&hour=18&x=0&z=2&shot=dusk-plaza",
     "dusk rose-band sky + lanterns warming up"),
    ("night-plaza",
     "http://localhost:8080/index.html?autostart=1&hour=20&x=0&z=2&shot=night-plaza",
     "night — all 4 lantern PointLights lit"),
    ("cottage-close",
     "http://localhost:8080/index.html?autostart=1&hour=14&x=8&z=4&shot=cottage-close",
     "close-up on a cottage (eaves / shutters / chimney)"),
    ("cottage-wide",
     "http://localhost:8080/index.html?autostart=1&hour=14&x=0&z=8&shot=cottage-wide",
     "wide shot of 2-3 cottages + trees"),
    ("noon-trees",
     "http://localhost:8080/index.html?autostart=1&hour=14&x=-8&z=-2&shot=noon-trees",
     "tree species variety — cedar / oak / birch / fruit all visible"),
    ("dawn-trees",
     "http://localhost:8080/index.html?autostart=1&hour=6.5&x=-8&z=-2&shot=dawn-trees",
     "tree silhouette against dawn sky"),
    ("bunny-day",
     "http://localhost:8080/index.html?autostart=1&hour=12&day=7&season=Spring&x=0&z=2&shot=bunny-day",
     "Spring day 7 — hidden bunny in the plaza"),
    ("maple-birthday",
     "http://localhost:8080/index.html?autostart=1&hour=12&day=17&season=Spring&x=4&z=2&shot=maple-birthday",
     "Maple the bear's birthday — cake sprite above her head"),
    ("night-stars",
     "http://localhost:8080/index.html?autostart=1&hour=2&x=0&z=2&shot=night-stars",
     "deep night — should see 2000 deterministic stars"),
    ("interior-home",
     "http://localhost:8080/index.html?autostart=1&hour=12&enter=home&nofade=1&shot=interior-home",
     "walkable home interior"),
    ("interior-shop",
     "http://localhost:8080/index.html?autostart=1&hour=12&enter=shop&nofade=1&shot=interior-shop",
     "walkable shop interior"),
    ("interior-museum",
     "http://localhost:8080/index.html?autostart=1&hour=12&enter=museum&nofade=1&shot=interior-museum",
     "walkable museum interior"),
]


def main():
    out = ".critique/shots/w6-canonical"
    os.makedirs(out, exist_ok=True)
    print(f"\n=== Willowbrook canonical capture — saving to {out} ===\n")
    for name, url, desc in CANONICAL:
        print(f"  {name}.png  ←  {url}")
        print(f"    {desc}")
        print()
    print("Save each browser screenshot as <name>.png into the path above.")
    print("Then run: python3 tools/metrics.py --shots", out)
    print()


import os  # noqa: E306  — keep last so the imports read top-down


if __name__ == "__main__":
    main()
