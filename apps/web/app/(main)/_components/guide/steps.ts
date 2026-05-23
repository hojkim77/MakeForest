import type { FullTourStepIdType, DailyGuideStepIdType, GuideStateResType } from '@makeforest/types';

interface StepConfig {
  targetSelector: string;
  title: string;
  description: string;
}

export const FULL_TOUR_STEPS: Record<FullTourStepIdType, StepConfig> = {
  'panel.myNeighborhood': {
    targetSelector: '[data-guide="panel.myNeighborhood"]',
    title: '내 동네',
    description: '이곳에서 내 동네의 집중 현황과 이웃들의 활동을 확인할 수 있어요.',
  },
  'panel.peek': {
    targetSelector: '[data-guide="panel.peek"]',
    title: '엿보기',
    description: '다른 동네의 숲도 구경할 수 있어요. 지도에서 다른 지역을 클릭해 보세요.',
  },
  'timer.start': {
    targetSelector: '[data-guide="timer.start"]',
    title: '타이머 시작',
    description: '30분 집중하면 물주기 기회가 생겨요. 버튼을 눌러 타이머를 시작해 보세요.',
  },
  'water.action': {
    targetSelector: '[data-guide="water.action"]',
    title: '물주기',
    description: '30분 집중을 완료하면 내 동네 숲에 물을 줄 수 있어요. 하루 최대 12번 가능해요.',
  },
  'map.modeToggle': {
    targetSelector: '[data-guide="map.modeToggle"]',
    title: '지도 모드 전환',
    description: '지역을 클릭하면 픽셀 숲 모드로 전환돼요. 동네별 활동 현황을 확인해 보세요.',
  },
  'creature.stage': {
    targetSelector: '[data-guide="creature.stage"]',
    title: '내 생명체',
    description: '물을 줄수록 생명체가 성장해요. 씨앗에서 세계수까지, 10단계의 변화가 기다려요.',
  },
  'community.entry': {
    targetSelector: '[data-guide="community.entry"]',
    title: '커뮤니티',
    description: '다른 사용자들과 집중 경험을 나눠보세요. 동네 이웃들의 이야기를 확인할 수 있어요.',
  },
  'mypage.entry': {
    targetSelector: '[data-guide="mypage.entry"]',
    title: '마이페이지',
    description: '내 집중 기록과 생명체 성장 현황을 확인할 수 있어요.',
  },
};

type DailyPayload = Extract<GuideStateResType, { kind: 'daily' }>['payload'];

export function buildDailyStepConfig(
  stepId: DailyGuideStepIdType,
  payload: DailyPayload,
): StepConfig {
  switch (stepId) {
    case 'daily.streak': {
      const { currentStreak, todayWaterCount, dailyGoal } = payload.streak;
      return {
        targetSelector: '[data-guide="creature.stage"]',
        title: '오늘의 집중',
        description:
          currentStreak > 0
            ? `현재 ${currentStreak}일 연속 집중 중이에요! 오늘 ${todayWaterCount}/${dailyGoal}번 물을 줬어요.`
            : `오늘 ${todayWaterCount}/${dailyGoal}번 물을 줬어요. 연속 집중을 시작해 보세요!`,
      };
    }
    case 'daily.creatureProgress': {
      const { stage, watersUntilNextStage } = payload.creature;
      return {
        targetSelector: '[data-guide="creature.stage"]',
        title: '생명체 성장',
        description:
          watersUntilNextStage !== null
            ? `현재 Lv.${stage + 1}이에요. ${watersUntilNextStage}번 더 물을 주면 다음 단계로 진화해요!`
            : `최고 단계에 도달했어요! 세계수로 완전히 성장했어요.`,
      };
    }
    case 'daily.neighborhoodDelta': {
      const { newTreesYesterday } = payload.neighborhood;
      return {
        targetSelector: '[data-guide="map.modeToggle"]',
        title: '동네 변화',
        description:
          newTreesYesterday > 0
            ? `어제 우리 동네에 나무가 ${newTreesYesterday}그루 새로 심어졌어요!`
            : '어제는 우리 동네에 새 나무가 없었어요. 오늘 집중해서 첫 번째 나무를 심어 보세요!',
      };
    }
  }
}
