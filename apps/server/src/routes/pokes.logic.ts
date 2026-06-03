export function isCooldownActive(
  lastPokeAt: Date,
  cooldownMs: number,
  now: Date = new Date(),
): { active: false } | { active: true; endsAt: Date } {
  const elapsed = now.getTime() - lastPokeAt.getTime();
  if (elapsed < cooldownMs) {
    return { active: true, endsAt: new Date(lastPokeAt.getTime() + cooldownMs) };
  }
  return { active: false };
}
