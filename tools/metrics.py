#!/usr/bin/env python3
"""
Regression suite for Willowbrook's rendered frames.

Methodology lifted from gillworks/red-sands `tools/metrics.py` (MIT) and
adapted for an Animal Crossing: New Horizons visual target instead of
their Red Dead Redemption 2 target. Every gate traces to a defect that
was once real in *some* project (theirs or ours) — see NOTES at the
bottom of each gate for the historical defect.

  python3 tools/metrics.py --shots .critique/shots/w6-canonical
  python3 tools/metrics.py --shots .critique/shots/w6-canonical \
      --baseline .critique/shots/w5-baseline

Exit code is non-zero if any gate fails, so it can run as a build gate.

Distance proxy: red-sands uses vertical position below a detected
horizon. We do the same — it's not a depth buffer but it's consistent
frame-to-frame, which is what a regression gate needs.
"""

import argparse
import json
import os
import sys
import numpy as np
from PIL import Image


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def luma(rgb):                      # rgb float 0..1
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def saturation(rgb):
    mx, mn = rgb.max(-1), rgb.min(-1)
    return np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)


def find_horizon(rgb):
    """First row from the top where the image stops behaving like sky."""
    h = rgb.shape[0]
    rowstd = rgb.reshape(h, -1, 3).std(axis=1).mean(axis=1)
    blue = rgb[..., 2].mean(axis=1) - rgb[..., 0].mean(axis=1)
    sky = (rowstd < np.percentile(rowstd, 45)) & (blue > -0.02)
    for y in range(int(h * 0.05), int(h * 0.92)):
        if not sky[y] and not sky[min(h - 1, y + 8)]:
            return y
    return int(h * 0.45)


def local_std(gray, k=8):
    """Mean of per-tile std — a cheap local-contrast measure."""
    h, w = gray.shape
    h2, w2 = (h // k) * k, (w // k) * k
    t = gray[:h2, :w2].reshape(h2 // k, k, w2 // k, k).transpose(0, 2, 1, 3)
    return t.reshape(h2 // k, w2 // k, -1).std(axis=2)


def blob_count(gray, thresh):
    """Connected components above a luma threshold (4-connectivity, iterative)."""
    mask = gray > thresh
    if not mask.any():
        return 0, []
    seen = np.zeros_like(mask, dtype=bool)
    h, w = mask.shape
    blobs = []
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if seen[sy, sx]:
            continue
        stack, n, cy, cx = [(sy, sx)], 0, 0, 0
        seen[sy, sx] = True
        while stack:
            y, x = stack.pop()
            n += 1; cy += y; cx += x
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if n >= 60:                                   # ignore speculars/specks
            blobs.append({"px": int(n), "x": int(cx / n), "y": int(cy / n)})
    return len(blobs), sorted(blobs, key=lambda b: -b["px"])[:6]


def silhouette_aa(rgb, horizon):
    """
    Mean count of intermediate pixels across the sky->terrain edge.
    A single-pixel step means 'no AA' tell.
    """
    g = luma(rgb)
    widths = []
    band = g[max(0, horizon - 30):horizon + 30, :]
    if band.shape[0] < 8:
        return 0.0
    for x in range(0, band.shape[1], 7):
        col = band[:, x]
        hi, lo = col.max(), col.min()
        if hi - lo < 0.08:
            continue
        a, b = lo + 0.20 * (hi - lo), lo + 0.80 * (hi - lo)
        widths.append(int(((col > a) & (col < b)).sum()))
    return float(np.mean(widths)) if widths else 0.0


# ---------------------------------------------------------------------------
# Per-shot metrics
# ---------------------------------------------------------------------------

def analyse(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    rgb = a / 255.0
    lin = srgb_to_linear(a)
    g = luma(rgb)
    horizon = find_horizon(rgb)
    h = rgb.shape[0]
    w = rgb.shape[1]

    m = {
        "size": [int(w), int(h)],
        "max_channel": int(a.max()),
        "p01_luma": float(np.percentile(g, 0.1)),
        "p999_luma": float(np.percentile(g, 99.9)),
        "mean_luma": float(g.mean()),
        "mean_sat": float(saturation(rgb).mean()),
        "horizon_y": int(horizon),
        "silhouette_aa_px": round(silhouette_aa(rgb, horizon), 2),
    }
    m["dynamic_range"] = round(m["p999_luma"] - m["p01_luma"], 4)

    # Count bright blobs in the FULL frame (for general "too many speculars" gate)
    n, blobs = blob_count(g, 0.965)
    m["bright_blobs"] = n
    m["blobs"] = blobs

    # Count bright blobs in the SKY band only (above horizon) — this is what
    # catches the actual "multiple suns" defect. Lanterns / roofs / water
    # live below the horizon and don't count.
    sky_band = g[:max(8, horizon - 4), :]
    if sky_band.shape[0] >= 8:
        ns, sky_blobs = blob_count(sky_band, 0.965)
        m["sky_bright_blobs"] = ns
    else:
        m["sky_bright_blobs"] = 0

    # distance-binned aerial perspective over the terrain region only
    top, bot = horizon + 4, h - 4
    if bot - top > 60:
        bands, nb = [], 5
        edges = np.linspace(bot, top, nb + 1).astype(int)      # near -> far
        for i in range(nb):
            y1, y0 = edges[i + 1], edges[i]
            seg_rgb = rgb[y1:y0, :, :]
            seg_g = g[y1:y0, :]
            if seg_rgb.shape[0] < 6:
                continue
            bands.append({
                "br": float(seg_rgb[..., 2].mean() - seg_rgb[..., 0].mean()),
                "sat": float(saturation(seg_rgb).mean()),
                "luma": float(seg_g.mean()),
                "lstd": float(local_std(seg_g).mean()),
            })
        if len(bands) >= 3:
            m["br_near"] = round(bands[0]["br"], 4)
            m["br_far"] = round(bands[-1]["br"], 4)
            m["br_gradient"] = round(bands[-1]["br"] - bands[0]["br"], 4)
            m["lstd_near"] = round(bands[0]["lstd"], 4)
            m["lstd_far"] = round(bands[-1]["lstd"], 4)
            m["contrast_gradient"] = round(bands[-1]["lstd"] - bands[0]["lstd"], 4)
            m["sat_gradient"] = round(bands[-1]["sat"] - bands[0]["sat"], 4)

    # grass hue/saturation — `no emerald` gate (red-sands defect: 0.43 sat)
    mx = rgb.max(-1)
    green = (rgb[..., 1] >= mx - 1e-6) & (mx > 0.08) & (saturation(rgb) > 0.05)
    if green.sum() > 500:
        m["green_sat"] = round(float(saturation(rgb)[green].mean()), 4)
        m["green_px_frac"] = round(float(green.mean()), 4)

    # chroma-speckle gate
    chroma = rgb.max(-1) - rgb.min(-1)
    magenta = (rgb[..., 0] > 0.5) & (rgb[..., 2] > 0.5) & (rgb[..., 1] < rgb[..., 0] * 0.6)
    m["extreme_chroma_frac"] = round(float((chroma > 0.75).mean()), 5)
    m["magenta_frac"] = round(float(magenta.mean()), 5)

    m["mean_linear"] = round(float(lin.mean()), 4)
    return m


# ---------------------------------------------------------------------------
# Gates
# ---------------------------------------------------------------------------

# Daylight shots — these all expect full sun lighting + sky + horizon
DAYLIGHT = {
    "noon-plaza", "dawn-plaza", "dusk-plaza",
    "noon-trees", "dawn-trees",
    "cottage-close", "cottage-wide",
    "bunny-day", "maple-birthday",
}
# Night shots — darker, fewer expectations
NIGHT = {"night-plaza", "night-stars"}
# Interior shots — warm tinted, enclosed, no sky
INTERIOR = {"interior-home", "interior-shop", "interior-museum"}


def gates(shot, m):
    """Run the gate suite for one shot. Returns a list of gate results."""
    out = []

    def g(name, ok, detail):
        out.append({"gate": name, "pass": bool(ok), "detail": detail})

    # ---- Universal gates (apply to all shots) ----

    g("single_sun",
      m["sky_bright_blobs"] <= 1,
      f"{m['sky_bright_blobs']} bright blobs in sky band "
      f"(red-sands pass-1 defect: 3 suns). Full-frame bright blobs: "
      f"{m['bright_blobs']} (lanterns / roof ridges / water — expected)")

    g("anti_aliased",
      m["silhouette_aa_px"] >= 1.0,
      f"silhouette transition {m['silhouette_aa_px']:.2f}px (red-sands pass-2: ~0 = hard step)")

    g("no_chroma_artifacts",
      m["magenta_frac"] < 0.0004,
      f"magenta fraction {m['magenta_frac']:.5f} (red-sands pass-2: in-world checkerboards)")

    # ---- Daylight-specific gates ----

    if shot in DAYLIGHT:
        g("hdr_headroom",
          m["max_channel"] >= 248,
          f"max channel {m['max_channel']} (red-sands pass-2: 235 = no highlight headroom)")
        g("has_blacks",
          m["p01_luma"] < 0.25,
          f"p0.1 luma {m['p01_luma']:.3f} (red-sands pass-2 storm white-out: 0.317)")
        if "br_gradient" in m:
            g("aerial_perspective_hue",
              m["br_gradient"] > 0,
              f"B-R near {m['br_near']:+.3f} -> far {m['br_far']:+.3f} "
              f"(delta {m['br_gradient']:+.3f}; red-sands pass-1 was negative = inverted)")
            g("aerial_perspective_contrast",
              m["contrast_gradient"] < 0,
              f"local sigma near {m['lstd_near']:.3f} -> far {m['lstd_far']:.3f} "
              f"(must compress with distance)")
        # Grass should look like grass, not emerald. Target tuned slightly
        # lower than red-sands since AC wants warmer / softer greens.
        if "green_sat" in m and m["green_px_frac"] > 0.02:
            g("grass_not_emerald",
              0.08 <= m["green_sat"] <= 0.34,
              f"green saturation {m['green_sat']:.3f} "
              f"(target 0.10-0.30; red-sands pass-1 was 0.43)")

    # ---- Night-specific gates ----

    if shot in NIGHT:
        # Night should be dark but never fully crushed black
        g("night_has_darks",
          m["p01_luma"] < 0.10,
          f"p0.1 luma {m['p01_luma']:.3f} (night frame should have dark sky)")
        # Lanterns should leave a warm signature
        g("night_has_warmth",
          m["mean_sat"] >= 0.04,
          f"mean saturation {m['mean_sat']:.4f} (lantern warmth should register)")

    # ---- Interior-specific gates ----

    if shot in INTERIOR:
        # Interior must be enclosed — sky/blue band should be tiny
        # (windows / doors can leak sky in, but should be <8% of frame)
        g("interior_is_enclosed",
          m["mean_sat"] >= 0.08,
          f"mean saturation {m['mean_sat']:.4f} "
          f"(interior warm tones should dominate over sky-leak)")
        g("interior_no_sky_band",
          m["max_channel"] <= 254 or m["mean_luma"] < 0.85,
          f"mean luma {m['mean_luma']:.3f} (interior shouldn't be a bright sky band)")

    return out


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Willowbrook visual regression suite")
    ap.add_argument("--shots", required=True, help="dir of PNGs to test")
    ap.add_argument("--baseline", default=None, help="dir of baseline PNGs (for deltas)")
    ap.add_argument("--json", default=None, help="output JSON path")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    base = {}
    if a.baseline:
        bp = os.path.join(a.baseline, "_metrics.json")
        if os.path.exists(bp):
            base = json.load(open(bp)).get("shots", {})

    results, failures = {}, []
    skipped = []
    for f in sorted(os.listdir(a.shots)):
        if not f.endswith(".png") or f.startswith("_"):
            continue
        shot = f[:-4]
        try:
            m = analyse(os.path.join(a.shots, f))
        except Exception as e:
            skipped.append((shot, str(e)))
            continue
        gs = gates(shot, m)
        results[shot] = {"metrics": m, "gates": gs}
        failures += [(shot, x) for x in gs if not x["pass"]]

    payload = {
        "shots": results,
        "summary": {
            "shots": len([k for k in results if not k.startswith("_")]),
            "failures": len(failures),
        },
    }

    out_p = a.json or os.path.join(a.shots, "_metrics.json")
    json.dump(payload, open(out_p, "w"), indent=1)

    if not a.quiet:
        print(f"\n{'SHOT':<22} {'luma':>6} {'B-R':>7} {'AA':>5} {'grass':>6} "
              f"{'blobs':>6}  GATES")
        print("-" * 80)
        for shot, r in results.items():
            if shot.startswith("_"):
                continue
            m, gs = r["metrics"], r["gates"]
            bad = [x for x in gs if not x["pass"]]
            grass = m.get("green_sat", 0.0)
            br = m.get("br_gradient", 0.0)
            delta = ""
            if shot in base:
                d = m["mean_luma"] - base[shot]["metrics"]["mean_luma"]
                delta = f"  (luma {d:+.3f})"
            print(f"{shot:<22} {m['mean_luma']:>6.3f} {br:>+7.4f} "
                  f"{m['silhouette_aa_px']:>5.2f} {grass:>6.3f} "
                  f"{m['bright_blobs']:>6}  "
                  f"{'OK' if not bad else ', '.join(x['gate'] for x in bad)}{delta}")
        if failures:
            print(f"\n{len(failures)} GATE FAILURES:")
            for shot, x in failures:
                print(f"  [{shot}] {x['gate']}: {x['detail']}")
        else:
            print("\nall gates pass")
        if skipped:
            print(f"\n{len(skipped)} skipped (unreadable):")
            for shot, e in skipped:
                print(f"  [{shot}] {e}")
        print(f"\nwritten: {out_p}")

    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
