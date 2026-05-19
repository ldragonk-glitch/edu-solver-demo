import test from "node:test";
import assert from "node:assert/strict";

import { computeCostUsd } from "../lib/usage";

test("computes known Claude model cost", () => {
  assert.equal(computeCostUsd("claude-sonnet-4-6", 1_000_000, 1_000_000), 18);
});

test("returns null for non-Claude or unknown model pricing", () => {
  assert.equal(computeCostUsd("glm-5v-turbo", 1_000_000, 1_000_000), null);
  assert.equal(computeCostUsd("kimi-k2.6", 1_000_000, 1_000_000), null);
});
