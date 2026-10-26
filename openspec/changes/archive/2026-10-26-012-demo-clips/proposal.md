# Proposal

## Why

The owner watched the 011 demo and still found it hard to follow. One 21 second clip with six captions asks the viewer to read fast and to know OpenSpec already. A reader who knows neither OpenSpec nor spec-ctx has no place to start.

## What Changes

- The README gets one paragraph that says what OpenSpec is, before the problem. A reader who never saw `openspec/` can follow from there.
- The demo splits into six clips. Each clip is one command, 3 to 7 seconds, with its own SVG. Each clip sits under a heading in plain words. Two or three sentences say what the command does, what the reader sees on screen, and why it matters.
- The clips use the same project in sequence, so step 4 shows the IDs that step 1 wrote.
- The README text follows the `ste-humanize` skill in Human mode, written for a reader who knows neither tool.

Out of scope: engine changes, the sections after the quickstart, metric changes.

## Capabilities

### Modified Capabilities
- `spec-governance`: README order and the demo.

## Impact

- `README.md`, `docs/demo/record.sh`, `docs/demo/clips/*.cast`, `docs/demo/clips/*.svg`, `docs/demo/loop.txt` (the full transcript stays as one file), `tests/gov/readme.test.ts`, `tests/gov/demo.test.ts`.
- `docs/demo/loop.svg` and `loop.cast` go away.
