const onboarding = new Map();
const remindSetup = new Map();

export function getOnboardingState(userId) {
  return onboarding.get(String(userId)) || null;
}

export function setOnboardingState(userId, state) {
  onboarding.set(String(userId), state);
}

export function clearOnboardingState(userId) {
  onboarding.delete(String(userId));
}

export function getRemindState(userId) {
  return remindSetup.get(String(userId)) || null;
}

export function setRemindState(userId, state) {
  remindSetup.set(String(userId), state);
}

export function clearRemindState(userId) {
  remindSetup.delete(String(userId));
}
