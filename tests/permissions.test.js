import test from "node:test";
import assert from "node:assert/strict";
import { canAssignRole, canGrantCustomPermission, canManageStaff, canRefund, hasPermission, rolePermissionCeiling } from "../src/domain/permissions.js";

test("owner has restaurant permissions but cannot grant platform permissions", () => {
  assert.equal(hasPermission("owner", "finance.manage"), true);
  assert.equal(rolePermissionCeiling("owner").includes("settings.manage"), true);
});

test("manager can manage only lower-level restaurant staff", () => {
  assert.equal(canManageStaff("manager", "cashier"), true);
  assert.equal(canManageStaff("manager", "server"), true);
  assert.equal(canManageStaff("manager", "owner"), false);
  assert.equal(canManageStaff("manager", "manager"), false);
  assert.equal(canAssignRole("manager", "kitchen"), true);
  assert.equal(canAssignRole("manager", "manager"), false);
});

test("owner may grant custom permissions only within a role ceiling", () => {
  assert.equal(canGrantCustomPermission("owner", "cashier", "orders.cancel"), true);
  assert.equal(canGrantCustomPermission("owner", "cashier", "payments.refund"), true);
  assert.equal(canGrantCustomPermission("owner", "cashier", "finance.manage"), false);
  assert.equal(canGrantCustomPermission("manager", "cashier", "orders.cancel"), false);
  assert.equal(canGrantCustomPermission("owner", "owner", "finance.manage"), false);
});

test("cashier permissions default to least privilege and respect explicit overrides", () => {
  assert.equal(hasPermission("cashier", "payments.collect"), true);
  assert.equal(hasPermission("cashier", "orders.cancel"), false);
  assert.equal(hasPermission("cashier", "payments.refund"), false);
  assert.equal(hasPermission("cashier", "orders.cancel", { "orders.cancel": true }), true);
  assert.equal(hasPermission("cashier", "finance.view", { "finance.view": true }), false);
  assert.equal(hasPermission("cashier", "payments.collect", { "payments.collect": false }), false);
});

test("server and kitchen roles cannot access financial reports or cashier operations", () => {
  assert.equal(hasPermission("server", "payments.collect"), false);
  assert.equal(hasPermission("server", "finance.view"), false);
  assert.equal(hasPermission("kitchen", "finance.view"), false);
  assert.equal(hasPermission("kitchen", "payments.collect"), false);
  assert.equal(hasPermission("kitchen", "kitchen.manage"), true);
});

test("refunds require an explicit permission and a configured ceiling", () => {
  assert.equal(canRefund("manager", 5000, 10000), true);
  assert.equal(canRefund("manager", 15000, 10000), false);
  assert.equal(canRefund("cashier", 5000, 10000), false);
  assert.equal(canRefund("cashier", 5000, 10000, { "payments.refund": true }), true);
  assert.equal(canRefund("cashier", 5000, undefined, { "payments.refund": true }), false);
});
