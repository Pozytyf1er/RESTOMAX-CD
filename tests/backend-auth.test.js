import test from "node:test";
import assert from "node:assert/strict";
import { canManageTargetRole, hasServerPermission, isRole, normalizeTenantInput } from "../src/domain/authorization.js";

test("seuls les rôles restaurant connus sont acceptés", () => {
  for (const role of ["owner", "manager", "cashier", "server", "kitchen"]) assert.equal(isRole(role), true);
  assert.equal(isRole("super_admin"), false);
  assert.equal(isRole("unknown"), false);
});

test("un membre inactif ou absent ne possède aucune permission", () => {
  assert.equal(hasServerPermission(null, "orders.view"), false);
  assert.equal(hasServerPermission({ role: "owner", active: false }, "orders.view"), false);
});

test("le propriétaire dispose de son plafond de permissions", () => {
  assert.equal(hasServerPermission({ role: "owner", active: true }, "finance.manage"), true);
});

test("le manager ne peut pas gérer les paramètres ni la finance avancée", () => {
  const member = { role: "manager", active: true };
  assert.equal(hasServerPermission(member, "finance.view"), true);
  assert.equal(hasServerPermission(member, "finance.manage"), false);
  assert.equal(hasServerPermission(member, "settings.manage"), false);
});

test("le caissier reçoit uniquement ses permissions par défaut", () => {
  const member = { role: "cashier", active: true };
  assert.equal(hasServerPermission(member, "payments.collect"), true);
  assert.equal(hasServerPermission(member, "payments.refund"), false);
  assert.equal(hasServerPermission(member, "tables.manage"), false);
});

test("une permission personnalisée peut être accordée dans le plafond du rôle", () => {
  const member = { role: "cashier", active: true, permissions: { "payments.refund": true } };
  assert.equal(hasServerPermission(member, "payments.refund"), true);
});

test("une permission personnalisée ne peut jamais dépasser le plafond", () => {
  const member = { role: "cashier", active: true, permissions: { "finance.manage": true } };
  assert.equal(hasServerPermission(member, "finance.manage"), false);
});

test("une permission explicitement refusée reste refusée", () => {
  const member = { role: "owner", active: true, permissions: { "orders.create": false } };
  assert.equal(hasServerPermission(member, "orders.create"), false);
});

test("le propriétaire et le manager ne peuvent pas promouvoir au-delà de leur plafond", () => {
  const owner = { role: "owner", active: true };
  const manager = { role: "manager", active: true };
  assert.equal(canManageTargetRole(owner, "manager"), true);
  assert.equal(canManageTargetRole(owner, "owner"), false);
  assert.equal(canManageTargetRole(manager, "cashier"), true);
  assert.equal(canManageTargetRole(manager, "manager"), false);
  assert.equal(canManageTargetRole({ role: "cashier", active: true }, "server"), false);
});

test("les données de création tenant sont validées et normalisées", () => {
  assert.deepEqual(normalizeTenantInput({ name: " Chez Awa ", city: " Abidjan " }), {
    name: "Chez Awa", city: "Abidjan", currency: "XOF", timezone: "Africa/Abidjan", status: "active",
  });
  assert.equal(normalizeTenantInput({ name: "A", city: "Abidjan" }), null);
  assert.equal(normalizeTenantInput({ name: "Chez Awa", city: " " }), null);
  assert.equal(normalizeTenantInput(null), null);
});
