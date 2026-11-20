import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionPreparationStatus } from "../src/domain/kitchen.js";

test("a new preparation must start before it can be marked ready", () => {
  assert.equal(canTransitionPreparationStatus("new", "preparing"), true);
  assert.equal(canTransitionPreparationStatus("new", "ready"), false);
});

test("a preparation can become ready only after it has started", () => {
  assert.equal(canTransitionPreparationStatus("preparing", "ready"), true);
  assert.equal(canTransitionPreparationStatus("preparing", "new"), false);
});

test("ready preparations cannot be reopened or moved backwards", () => {
  assert.equal(canTransitionPreparationStatus("ready", "preparing"), false);
  assert.equal(canTransitionPreparationStatus("ready", "new"), false);
  assert.equal(canTransitionPreparationStatus("ready", "ready"), false);
});

test("duplicate and unsupported transitions are rejected", () => {
  assert.equal(canTransitionPreparationStatus("new", "new"), false);
  assert.equal(canTransitionPreparationStatus("preparing", "preparing"), false);
  assert.equal(canTransitionPreparationStatus("invalid", "ready"), false);
});
