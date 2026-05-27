import { determineFriendStatus } from '../friends.logic';

describe('determineFriendStatus', () => {
  it('활성 세션이 있으면 RUNNING을 반환한다', () => {
    expect(determineFriendStatus(true, false)).toBe('RUNNING');
    expect(determineFriendStatus(true, true)).toBe('RUNNING');
  });

  it('활성 세션이 없고 오늘 세션이 있으면 IDLE을 반환한다', () => {
    expect(determineFriendStatus(false, true)).toBe('IDLE');
  });

  it('활성 세션도 오늘 세션도 없으면 OFFLINE을 반환한다', () => {
    expect(determineFriendStatus(false, false)).toBe('OFFLINE');
  });
});
