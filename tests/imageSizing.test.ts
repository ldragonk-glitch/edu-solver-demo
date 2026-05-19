import test from "node:test";
import assert from "node:assert/strict";

import { fitWithinMaxSide } from "../lib/imageSizing";

test("keeps images that already fit within the max side", () => {
  assert.deepEqual(fitWithinMaxSide(1200, 800, 1600), {
    width: 1200,
    height: 800,
  });
});

test("scales landscape images to the max side", () => {
  assert.deepEqual(fitWithinMaxSide(4000, 3000, 1600), {
    width: 1600,
    height: 1200,
  });
});

test("scales portrait images to the max side", () => {
  assert.deepEqual(fitWithinMaxSide(3000, 4000, 1600), {
    width: 1200,
    height: 1600,
  });
});
