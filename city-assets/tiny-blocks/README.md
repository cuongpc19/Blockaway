# Tiny block design reference

`tiny-block-kit.glb` is a visual sample showing the proposed tiny-block palette and face-mark language. `design-spec.json` is the handoff contract for the session that will arrange blocks around the 30 mission objects.

- One grid cell is 1 metre; block body fills 94% of the cell.
- Use a small bevel (about 8.5% of the cell) and keep the center of each face flat.
- Give each cube one clear, saturated color. The sample palette is green, blue, yellow, orchid and coral.
- The outward/free face gets a white arrow. The opposite face gets a pale oval. Keep both marks away from the bevel.
- The object's GLB stays intact; the cube field is built as a separate level layer, aligned to integer grid coordinates.

The main game already contains a rounded cube and directional face-mark shader in `../../main.js`; the GLB kit is a compact visual guide for the follow-up content pass.
