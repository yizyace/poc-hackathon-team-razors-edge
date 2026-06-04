# VisionOps: Demo Test Images

A quick, human-readable guide to the two images the demo runs on. For the
**authoritative** values — exact tracking numbers, expected agent outputs,
fallback constants — this page defers to
[`claude/design_specification.md`](./claude/design_specification.md) **§9 "Demo
Scenario Configurations"** (and §6 for the fallback constants). If a value ever
needs to change, change it there; this is the friendly overview that points at it.

## You need exactly two images

One per demo run. No more. The whole demo is a back-to-back contrast between a
*destroyed* box (the guardrail / no-match case) and a *barely-touched* box (the
happy path), and that contrast has to read instantly on screen.

|  | Run 1 — Guardrail | Run 2 — Happy path |
|---|---|---|
| Filename | `crushed_box_torn_label.jpg` | `scuffed_box_clean_label.jpg` |
| Box | Heavily crushed — structural, torn cardboard | Lightly scuffed — cosmetic scratch only |
| Label | Partially destroyed by the same impact | Perfectly intact, fully readable |
| Carrier | UPS | FedEx |
| Tracking # | Last digit torn off → **genuinely incomplete** | Fully visible, reads cleanly |
| Vendor | "Acme Packaging" (partial) | "FastShip Supply" (clear) |
| Severity | high | low |
| Outcome | No PO match → manual review + Slack alert | PO match → silent file, no Slack |

The exact strings (UPS `1Z999AA10123456784` torn to `1Z999AA1012345678`, FedEx
`74891234567890`, vendors, expected per-agent outputs) live in
design_specification.md §9 — the table above is just the at-a-glance version.

## Run 1 — Crushed box, torn label (the guardrail)

A heavily crushed box where the **same impact that damaged the box also tore the
shipping label.** The UPS tracking number is missing its final digit because the
tear runs through it — so the number is *genuinely* incomplete, not stylized.
"Acme Packaging" is partially readable. The vision model should still call the
damage **high severity** and identify the carrier; it just can't complete the
number. That's the whole point: the system extracts what it can, finds no
matching purchase order, and escalates to a human instead of fabricating a dispute.

## Run 2 — Scuffed box, clean label (the happy path)

A lightly scuffed box — a scuff mark or small scratch, nothing structural. The
label is pristine and the FedEx tracking number `74891234567890` reads cleanly.
"FastShip Supply" is clearly visible. Low severity. The system reads the number,
finds the purchase order, and files the dispute **silently** — no one gets woken
up for a scuffed box.

## How the tracking number gets read (no barcodes)

The Vision Inspector reads the label **text** via the GMI vision model in JSON
mode — **not** a barcode scanner, so the images don't need barcodes. OCR can
misread, so the demo's safety net is the set of **hardcoded fallback constants**
(design_specification.md §6), which the demo harness selects **by filename**: a
filename containing `crushed` (or `no_match`) yields the Run 1 no-match output;
anything else (e.g. `scuffed`) yields the Run 2 happy-path output. That guarantees
the two scripted runs produce the right result even if a live OCR read is off.

> **Filenames matter.** Keep the canonical names `crushed_box_torn_label.jpg` and
> `scuffed_box_clean_label.jpg`. The fallback selector keys off the word in the
> filename — renaming Run 1 to something without `crushed`/`no_match` silently
> breaks the guardrail demo.

## We do NOT need training images

There is no dataset to build and no model to train. The vision model is **hosted
and pre-trained on GMI Cloud** (Model-as-a-Service): we send one image, we get
JSON back. It has already seen millions of package and label images — it knows
what a crushed box looks like and how to read a tracking number. So the only
images in this project are the **two demo stills above.** (design_specification.md
§11 says it outright: *"Do not generate any test image files."*)

## The one thing we can't pre-make: Phinite configuration

Every artifact above can be prepared in advance. The **Phinite manual
configuration** — the agent topology / Graph Studio wiring, routing, and API
triggers — is the single piece that has to be figured out **live**, from Phinite's
docs, the sponsor walkthrough, or trial and error. That's the 3-person track's
job; they're the ground-truth team for exactly this unknown.
(design_specification.md §11 likewise: *"Phinite is configured manually."*)

## Sourcing the two images

Real photographs or AI-generated stills are both fine — the model is pre-trained
either way. The only hard requirements are the attributes above: Run 1's number
**genuinely incomplete** (the tear cuts through the digits), Run 2's number
exactly `74891234567890` and cleanly legible, the **obvious** destroyed-vs-scuffed
contrast, and the canonical filenames so the fallbacks resolve.
