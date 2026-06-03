import { isCooldownActive } from '../pokes.logic';

const COOLDOWN_MS = 30 * 60 * 1000; // 30분

describe('isCooldownActive — 쿨다운 검사', () => {
  it('쿨다운 내 (1초 전): active = true, endsAt 반환', () => {
    const now = new Date('2024-01-05T12:00:00Z');
    const lastPokeAt = new Date(now.getTime() - COOLDOWN_MS + 1000); // 1초 남음
    const result = isCooldownActive(lastPokeAt, COOLDOWN_MS, now);
    expect(result.active).toBe(true);
    if (result.active) {
      expect(result.endsAt.getTime()).toBe(lastPokeAt.getTime() + COOLDOWN_MS);
    }
  });

  it('정확히 쿨다운 시간 경과 시: active = false', () => {
    const now = new Date('2024-01-05T12:00:00Z');
    const lastPokeAt = new Date(now.getTime() - COOLDOWN_MS);
    const result = isCooldownActive(lastPokeAt, COOLDOWN_MS, now);
    expect(result.active).toBe(false);
  });

  it('쿨다운 이후 (1ms 초과): active = false', () => {
    const now = new Date('2024-01-05T12:00:00Z');
    const lastPokeAt = new Date(now.getTime() - COOLDOWN_MS - 1);
    const result = isCooldownActive(lastPokeAt, COOLDOWN_MS, now);
    expect(result.active).toBe(false);
  });

  it('방금 찌른 경우 (elapsed=0): active = true', () => {
    const now = new Date('2024-01-05T12:00:00Z');
    const result = isCooldownActive(now, COOLDOWN_MS, now);
    expect(result.active).toBe(true);
  });
});
