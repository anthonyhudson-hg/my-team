/** Pure, DOM-free formatting helpers — unit tested directly (see js/format.test.js). */

export function initialOf(name, fallback = '?') {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed[0].toUpperCase() : fallback;
}

export function formatClockTime(date = new Date()) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

export function greetingForHour(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function greeting(date = new Date()) {
  return greetingForHour(date.getHours());
}

export function modelShortLabel(model) {
  return model && model.trim() ? model : 'Default';
}

export function effortShortLabel(effort) {
  return effort && effort.trim() ? effort : 'Default';
}

export function fuzzyMatch(query, label) {
  return label.toLowerCase().includes((query || '').trim().toLowerCase());
}

/** Derives the real "getting started" checklist from actual app state instead of hand-toggled booleans. */
export function deriveChecklist({ onboardingComplete, hasSentToCeo, hasGeneralMessage }) {
  return [
    { id: 'profile', label: 'Complete your profile with your AI CEO', done: !!onboardingComplete },
    { id: 'meet-ceo', label: 'Say hi to your AI CEO', done: !!hasSentToCeo },
    { id: 'first-message', label: 'Send a message in #general', done: !!hasGeneralMessage },
  ];
}
