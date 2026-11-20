const TRANSITIONS = {
  new: ["preparing"],
  preparing: ["ready"],
  ready: [],
};

export function canTransitionPreparationStatus(current, next) {
  return Boolean(TRANSITIONS[current]?.includes(next));
}
