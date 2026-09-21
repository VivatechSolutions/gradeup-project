"""
Fixtures for the avatar model benchmark - a LABELLED image set with known truth.

Scoring the vision gate needs images whose correct verdict is not a matter of
opinion. Every case below was pinned by URL and then LOOKED AT before it was
labelled, which is the only way this set is worth anything: the first attempt
harvested images automatically and labelled the top hit CLEAN, and inspection
showed five of six were images the gate is supposed to REJECT - a Kurdish
heart, a Russian plant cell, a French regional volcano section, a moons poster
for "planet order", and an unlabelled fill-in-the-blank worksheet. Ground
truth assumed rather than checked is worse than no benchmark at all, because
every model then gets marked against a wrong key.

The five case classes
---------------------
  CLEAN        a real, English, labelled teaching diagram asked about its own
               topic                                     -> gate must ACCEPT
  WATERMARK    the SAME image with a stock-preview stamp burned into the
               pixels by Pillow                          -> gate must REJECT
  OFFTOPIC     the same clean image, asked about an unrelated subject
                                                         -> gate must REJECT
  FOREIGN      an image whose TITLE is English but whose in-picture labels are
               not (Romanian planet names)               -> gate must REJECT
  UNLABELLED   a worksheet diagram with blank label lines and no readable text
                                                         -> gate must REJECT

WATERMARK and OFFTOPIC are derived from the CLEAN images, so no model can score
well through a blanket bias: accepting everything fails four classes, rejecting
everything fails CLEAN. That is the property that makes the accuracy number
mean something.

FOREIGN and UNLABELLED are the two cases that justify paying for a vision model
at all. Neither is detectable from the URL or the title - "Planets and dwarf
planets of the Solar System, sizes to scale" is a perfectly English filename on
a picture whose labels read "Pamant" and "Planete pitice" - so they measure
exactly what the vision gate adds over the cheap host and title filters that
run before it.

Note that two topics are deliberately NOT what their slot id suggests: the
best English image the pipeline could find for "plant cell" was a cell-membrane
diagram, and for "volcano" it was Earth's internal structure. Both are
excellent teaching diagrams, so rather than discard them the topic text was
corrected to match what the picture actually shows. The benchmark cares only
that the image/topic pairing is TRUTHFUL, not which topic it is.

Run directly to (re)build the set:

    venv/Scripts/python.exe bench/avatar_bench_fixtures.py --force
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import avatar_visuals  # noqa: E402

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"
MANIFEST = FIXTURE_DIR / "manifest.json"

# Every entry is pinned to the exact file that was inspected, so a rebuild
# reproduces the reviewed set instead of re-running a search whose results move.
VERIFIED: List[Dict[str, Any]] = [
    {
        "id": "heart",
        "verdict": "clean",
        "title": "Heart diagram corrected labels",
        "origin": "https://upload.wikimedia.org/wikipedia/commons/1/1c/Heart_diagram_corrected_labels.JPG",
        "shows": "a labelled diagram of the heart's four chambers with arrows "
                 "for the direction blood flows",
        "topic": "the chambers of the human heart",
        "subject": "science",
        "class_number": "10",
        "teaching_text": (
            "The heart has four chambers. The two on top are the atria, and "
            "the two below them are the ventricles. Blood comes in at the top "
            "and is pushed out from the bottom."
        ),
        "offtopic_topic": "the causes of the First World War",
        "offtopic_subject": "social science",
    },
    {
        "id": "water_cycle",
        "verdict": "clean",
        "title": "Diagram of the Water Cycle",
        "origin": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Diagram_of_the_Water_Cycle.jpg/1280px-Diagram_of_the_Water_Cycle.jpg",
        "shows": "a landscape cutaway labelling evaporation, condensation, "
                 "precipitation, runoff and infiltration",
        "topic": "how water moves between the sea, the sky and the land",
        "subject": "science",
        "class_number": "7",
        "teaching_text": (
            "Water from the sea heats up and rises as vapour. High in the sky "
            "it cools into clouds, and then it falls back down as rain."
        ),
        "offtopic_topic": "solving a pair of linear equations",
        "offtopic_subject": "mathematics",
    },
    {
        # Slot id kept for file continuity; the picture is a cell MEMBRANE.
        "id": "plant_cell",
        "verdict": "clean",
        "title": "Cell membrane detailed diagram en",
        "origin": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Cell_membrane_detailed_diagram_en.svg/1280px-Cell_membrane_detailed_diagram_en.svg.png",
        "shows": "a labelled phospholipid bilayer with protein channels, "
                 "cholesterol and glycoproteins",
        "topic": "the structure of the cell membrane",
        "subject": "science",
        "class_number": "9",
        "teaching_text": (
            "The cell membrane is a double layer of fat molecules. Proteins "
            "sit inside that layer, and some of them form channels that let "
            "particular substances through."
        ),
        "offtopic_topic": "the rules of English tenses",
        "offtopic_subject": "english",
    },
    {
        # Slot id kept for file continuity; the picture is EARTH'S INTERIOR.
        "id": "volcano",
        "verdict": "clean",
        "title": "Earth Internal Structure",
        "origin": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Earth_Internal_Structure.svg/1280px-Earth_Internal_Structure.svg.png",
        "shows": "a cutaway of the Earth labelling crust, rigid mantle, "
                 "asthenosphere, lower mantle, outer core and inner core",
        "topic": "the layers inside the Earth",
        "subject": "social science",
        "class_number": "8",
        "teaching_text": (
            "The Earth is built in layers. The thin rocky crust is on the "
            "outside, the mantle lies beneath it, and right at the centre "
            "there is a core that is liquid on the outside and solid inside."
        ),
        "offtopic_topic": "the multiplication of fractions",
        "offtopic_subject": "mathematics",
    },
    {
        # English filename, ROMANIAN in-picture labels (Pamant, Marte, Planete
        # pitice). Invisible to the title filter - only the vision gate can
        # catch this, which is exactly why it is in the set.
        "id": "solar_system",
        "verdict": "foreign",
        "title": "Planets and dwarf planets of the Solar System, sizes to scale",
        "origin": "https://upload.wikimedia.org/wikipedia/commons/a/a5/Planets_and_dwarf_planets_of_the_Solar_System%2C_sizes_to_scale.png",
        "shows": "the planets in order out from the Sun, labelled in Romanian",
        "topic": "the order of the planets around the Sun",
        "subject": "science",
        "class_number": "6",
        "teaching_text": (
            "The Sun sits at the centre and the planets go around it. The "
            "ones closest in are small and rocky, and the giants are further "
            "out."
        ),
    },
    {
        # A fill-in-the-blank worksheet: label lines drawn to every organ with
        # nothing written on them. Useless in a lesson, and again invisible to
        # every filter before the vision gate.
        "id": "digestive",
        "verdict": "unlabelled",
        "title": "Diagram of the digestive system-VOID",
        "origin": "https://upload.wikimedia.org/wikipedia/commons/7/77/Diagram_of_the_digestive_system-VOID.png",
        "shows": "a digestive-system worksheet whose label lines are all blank",
        "topic": "the path food takes through the body",
        "subject": "science",
        "class_number": "8",
        "teaching_text": (
            "Food goes down a long tube from the mouth to the stomach. From "
            "there it moves into the intestines, where the useful parts are "
            "taken into the blood."
        ),
    },
]

# What a stock-photo preview actually looks like: a large, low-contrast
# diagonal wordmark plus a repeating tile. Both are the tells the vision gate
# is supposed to catch, and burning them into the pixels means the label is
# certain in a way a scraped image's never is.
_STAMP_TEXT = "SHUTTERSTOCK"
_STAMP_SUB = "PREVIEW - NOT LICENSED"


def _font(size: int):
    """A real TrueType face if one is installed, else Pillow's bitmap default.

    The default font cannot scale, which would make the stamp too small to be
    a fair test, so the common Windows/Linux faces are tried first.
    """
    for name in ("arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf",
                 "DejaVuSans.ttf", "LiberationSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def watermark(image_bytes: bytes) -> bytes:
    """Burn a stock-preview watermark into an image. Returns JPEG bytes."""
    base = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    w, h = base.size

    overlay = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    # Repeating faint tile, the way a real preview grid looks.
    tile_font = _font(max(14, w // 28))
    step_x, step_y = max(140, w // 4), max(90, h // 5)
    for y in range(0, h + step_y, step_y):
        for x in range(0, w + step_x, step_x):
            draw.text((x, y), _STAMP_TEXT, font=tile_font, fill=(255, 255, 255, 70))

    # One large diagonal wordmark across the middle - the unmissable tell.
    big = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    big_draw = ImageDraw.Draw(big)
    big_font = _font(max(28, w // 9))
    sub_font = _font(max(14, w // 24))
    bbox = big_draw.textbbox((0, 0), _STAMP_TEXT, font=big_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    big_draw.text(((w - tw) / 2, (h - th) / 2 - th * 0.6), _STAMP_TEXT,
                  font=big_font, fill=(255, 255, 255, 165))
    sub_bbox = big_draw.textbbox((0, 0), _STAMP_SUB, font=sub_font)
    sw = sub_bbox[2] - sub_bbox[0]
    big_draw.text(((w - sw) / 2, (h - th) / 2 + th * 0.9), _STAMP_SUB,
                  font=sub_font, fill=(255, 255, 255, 150))
    overlay = Image.alpha_composite(overlay, big.rotate(30, resample=Image.BICUBIC))

    stamped = Image.alpha_composite(base, overlay).convert("RGB")
    buf = io.BytesIO()
    stamped.save(buf, format="JPEG", quality=avatar_visuals.JPEG_QUALITY)
    return buf.getvalue()


def _fetch(origin: str) -> Optional[Dict[str, Any]]:
    """Download and normalise one pinned image through production's own path."""
    raw = avatar_visuals._download(origin)
    if not raw:
        return None
    return avatar_visuals._normalize_image(raw)


def build(force: bool = False) -> List[Dict[str, Any]]:
    """Build (or reuse) the labelled set. Returns the manifest cases."""
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)

    if MANIFEST.exists() and not force:
        cases = json.loads(MANIFEST.read_text(encoding="utf-8"))
        if all((FIXTURE_DIR / c["file"]).exists() for c in cases):
            print(f"[fixtures] reusing {len(cases)} case(s) in {FIXTURE_DIR}")
            return cases

    cases: List[Dict[str, Any]] = []
    for entry in VERIFIED:
        print(f"[fixtures] {entry['id']}: {entry['title'][:55]}", flush=True)
        norm = _fetch(entry["origin"])
        if not norm:
            print(f"[fixtures]   FAILED to fetch - skipped")
            continue

        base_name = f"{entry['id']}_clean.jpg"
        (FIXTURE_DIR / base_name).write_bytes(norm["bytes"])

        common = {
            "topic_id": entry["id"],
            "origin": entry["origin"],
            "commons_title": entry["title"],
            "shows_truth": entry["shows"],
            "subject": entry["subject"],
            "class_number": entry["class_number"],
            "teaching_text": entry["teaching_text"],
        }

        if entry["verdict"] == "clean":
            cases.append({**common,
                          "case_id": f"{entry['id']}::clean",
                          "kind": "CLEAN", "file": base_name,
                          "topic": entry["topic"],
                          "expect_usable": True,
                          "expect_watermark": False,
                          "expect_on_topic": True})

            wm_name = f"{entry['id']}_watermarked.jpg"
            (FIXTURE_DIR / wm_name).write_bytes(watermark(norm["bytes"]))
            cases.append({**common,
                          "case_id": f"{entry['id']}::watermarked",
                          "kind": "WATERMARK", "file": wm_name,
                          "topic": entry["topic"],
                          "expect_usable": False,
                          "expect_watermark": True,
                          "expect_on_topic": True})

            cases.append({**common,
                          "case_id": f"{entry['id']}::offtopic",
                          "kind": "OFFTOPIC", "file": base_name,
                          "topic": entry["offtopic_topic"],
                          "subject": entry["offtopic_subject"],
                          "teaching_text": "",
                          "expect_usable": False,
                          "expect_watermark": False,
                          "expect_on_topic": False})
        else:
            # FOREIGN / UNLABELLED - rejected on their own merits, asked about
            # the topic they genuinely depict so that "off-topic" is not the
            # reason a model could get them right by accident.
            cases.append({**common,
                          "case_id": f"{entry['id']}::{entry['verdict']}",
                          "kind": entry["verdict"].upper(), "file": base_name,
                          "topic": entry["topic"],
                          "expect_usable": False,
                          "expect_watermark": False,
                          "expect_on_topic": True})

        print(f"[fixtures]   ok  {norm['width']}x{norm['height']}  ({entry['verdict']})")

    MANIFEST.write_text(json.dumps(cases, indent=2), encoding="utf-8")
    counts: Dict[str, int] = {}
    for c in cases:
        counts[c["kind"]] = counts.get(c["kind"], 0) + 1
    print(f"\n[fixtures] {len(cases)} case(s) -> {MANIFEST}")
    print(f"[fixtures] by class: {counts}")
    return cases


def load() -> List[Dict[str, Any]]:
    """The labelled set, building it on first use."""
    return build(force=False)


def image_bytes(case: Dict[str, Any]) -> bytes:
    return (FIXTURE_DIR / case["file"]).read_bytes()


if __name__ == "__main__":
    build(force="--force" in sys.argv)
