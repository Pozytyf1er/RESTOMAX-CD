export type PreparationStatus = "new" | "preparing" | "ready";
export function canTransitionPreparationStatus(current: PreparationStatus, next: PreparationStatus): boolean;
