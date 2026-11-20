import test from "node:test";
import assert from "node:assert/strict";
import { canChangeRestaurantStatus, canCreatePlatformRestaurant, canCreateSupportGrant, canReviewSupportGrant, canTogglePlatformUser } from "../src/domain/platform.js";

const restaurant = { id: "R-1", name: "Chez Awa", ownerName: "Awa Koné", ownerEmail: "awa@example.ci", city: "Abidjan", country: "Côte d’Ivoire", planName: "Business", status: "active", userCount: 4, createdAtISO: "2026-01-01T00:00:00Z", lastActivityISO: "2026-11-19T00:00:00Z" };
const plans = [{ id: "PLAN-1", name: "Business", description: "Test", maxUsers: 10, maxEstablishments: 1, maxTables: 20, features: [], active: true }];
const users = [{ id: "U-1", name: "Admin", email: "admin@example.ci", role: "super_admin", active: true }];
const input = { name: "Le Bistrot", ownerName: "Moussa", ownerEmail: "moussa@example.ci", city: "Abidjan", country: "Côte d’Ivoire", planId: "PLAN-1" };

test("creates platform restaurants only with unique valid owner and active plan", () => {
  assert.equal(canCreatePlatformRestaurant(input, [restaurant], users, plans), true);
  assert.equal(canCreatePlatformRestaurant({ ...input, ownerEmail: "awa@example.ci" }, [restaurant], users, plans), false);
  assert.equal(canCreatePlatformRestaurant({ ...input, ownerEmail: "bad-email" }, [restaurant], users, plans), false);
  assert.equal(canCreatePlatformRestaurant({ ...input, planId: "inactive" }, [restaurant], users, plans), false);
  assert.equal(canCreatePlatformRestaurant({ ...input, name: "Chez Awa" }, [restaurant], users, plans), false);
});

test("enforces safe restaurant status transitions and immutable logical closure", () => {
  assert.equal(canChangeRestaurantStatus(restaurant, "suspended"), true);
  assert.equal(canChangeRestaurantStatus({ ...restaurant, status: "suspended" }, "active"), true);
  assert.equal(canChangeRestaurantStatus({ ...restaurant, status: "terminated" }, "active"), false);
  assert.equal(canChangeRestaurantStatus(restaurant, "active"), false);
  assert.equal(canChangeRestaurantStatus(restaurant, "trial"), false);
});

test("support access requires a reason, supported scope and bounded duration", () => {
  assert.equal(canCreateSupportGrant(restaurant, "Diagnostic paiement", "read_only", 1), true);
  assert.equal(canCreateSupportGrant(restaurant, "Court", "read_only", 1), false);
  assert.equal(canCreateSupportGrant(restaurant, "Diagnostic", "admin", 1), false);
  assert.equal(canCreateSupportGrant(restaurant, "Diagnostic", "read_only", 24), false);
  assert.equal(canCreateSupportGrant({ ...restaurant, status: "terminated" }, "Diagnostic", "read_only", 1), false);
});

test("support grants can only be approved from pending and revoked from active", () => {
  const grant = { id: "G-1", restaurantId: "R-1", restaurantName: "Chez Awa", requestedBy: "Support", reason: "Diagnostic", scope: "read_only", startsAtISO: "2026-11-19T08:00:00Z", expiresAtISO: "2026-11-19T09:00:00Z", status: "pending" };
  assert.equal(canReviewSupportGrant(grant, "approve"), true);
  assert.equal(canReviewSupportGrant({ ...grant, status: "active" }, "revoke"), true);
  assert.equal(canReviewSupportGrant({ ...grant, status: "expired" }, "approve"), false);
  assert.equal(canReviewSupportGrant({ ...grant, status: "pending" }, "revoke"), false);
});

test("prevents disabling the last active Super-admin account", () => {
  assert.equal(canTogglePlatformUser(users[0], users, false), false);
  const twoAdmins = [...users, { id: "U-2", name: "Admin 2", email: "admin2@example.ci", role: "super_admin", active: true }];
  assert.equal(canTogglePlatformUser(twoAdmins[0], twoAdmins, false), true);
  assert.equal(canTogglePlatformUser(users[0], users, true), false);
});
