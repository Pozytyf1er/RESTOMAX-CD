import type { PlatformPlan, PlatformRestaurant, PlatformRestaurantStatus, PlatformUser, SupportAccessGrant } from "./types";

export function canCreatePlatformRestaurant(input: { name: string; ownerName: string; ownerEmail: string; city: string; country: string; planId: string }, restaurants: PlatformRestaurant[], users: PlatformUser[], plans: PlatformPlan[]): boolean;
export function canChangeRestaurantStatus(restaurant: PlatformRestaurant | undefined, nextStatus: PlatformRestaurantStatus): boolean;
export function canCreateSupportGrant(restaurant: PlatformRestaurant | undefined, reason: string, scope: "read_only" | "limited", durationHours: number): boolean;
export function canReviewSupportGrant(grant: SupportAccessGrant | undefined, action: "approve" | "revoke"): boolean;
export function canTogglePlatformUser(user: PlatformUser | undefined, users: PlatformUser[], nextActive: boolean): boolean;
