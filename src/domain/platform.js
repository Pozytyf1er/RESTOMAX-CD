const VALID_GRANT_HOURS = [1, 2, 4];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function canCreatePlatformRestaurant(input, restaurants, users, plans) {
  const name = input.name?.trim(); const ownerName = input.ownerName?.trim();
  const ownerEmail = input.ownerEmail?.trim().toLowerCase();
  const city = input.city?.trim(); const country = input.country?.trim();
  const plan = plans.find((entry) => entry.id === input.planId && entry.active);
  if (!name || !ownerName || !city || !country || !EMAIL.test(ownerEmail ?? "") || !plan) return false;
  if (restaurants.some((entry) => entry.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr") || entry.ownerEmail.toLowerCase() === ownerEmail)) return false;
  return !users.some((entry) => entry.email.toLowerCase() === ownerEmail);
}

export function canChangeRestaurantStatus(restaurant, nextStatus) {
  if (!restaurant || restaurant.status === "terminated" || restaurant.status === nextStatus) return false;
  const allowed = {
    active: ["suspended", "terminated"],
    trial: ["active", "suspended", "terminated"],
    overdue: ["active", "suspended", "terminated"],
    suspended: ["active", "terminated"],
    terminated: [],
  };
  return allowed[restaurant.status].includes(nextStatus);
}

export function canCreateSupportGrant(restaurant, reason, scope, durationHours) {
  return Boolean(restaurant && restaurant.status !== "terminated")
    && typeof reason === "string" && reason.trim().length >= 8 && reason.trim().length <= 240
    && ["read_only", "limited"].includes(scope)
    && VALID_GRANT_HOURS.includes(durationHours);
}

export function canReviewSupportGrant(grant, action) {
  if (!grant) return false;
  return action === "approve" ? grant.status === "pending" : action === "revoke" ? grant.status === "active" : false;
}

export function canTogglePlatformUser(user, users, nextActive) {
  if (!user || user.active === nextActive) return false;
  if (user.role === "super_admin" && !nextActive) return users.filter((entry) => entry.role === "super_admin" && entry.active).length > 1;
  return true;
}
