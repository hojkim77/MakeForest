# Web — Layout & Auth UI

## B. Main Layout

- Fixed split: left panel + right map (ratio is fixed, not adjustable)
- On first load: zoom into the user's city/district forest + initialize panel to their neighborhood

## A. Auth UI / Onboarding

**Login**
- Social login only: Kakao / Google
- Unauthenticated user attempting timer/watering → show `LoginPrompt` inside the panel (no popup)

**Neighborhood setup (once)**
- Dedicated screen immediately after first login (Karrot-style flow)
- Request GPS permission → auto-detect → "Is this OO-dong?" confirmation UI
- GPS denied or detection failed → guidance text + auto-switch to text search mode
- One neighborhood only; change flow is not yet implemented

## H. Mypage UI

**Profile**: nickname + avatarUrl / neighborhood name / join date

**Stats (`StatsGrid`)** — parallel calls to `/stats/focus` and `/stats/rank`
- Total focus time (cumulative sum of DailySession.elapsedSec)
- Current streak / all-time longest streak
- Neighborhood contribution rank (neighborhoodRank / neighborhoodTotal)

**Weekly chart (`WeeklyChartSection`)** — calls `/stats/weekly`
- Bar chart of water counts for the last 4 weeks
- 4-week average water count

**My creature (`MyCreature`)** — calls `/user/me?userId=`
- Current UserCreature sprite (stage 0–9)
- Stage names: 씨앗 / 새싹 / 나무1 / 나무2 / 나무3 / 고목 / 노거수 / 정령수 / 신수 / 세계수
- Lifetime cumulative water count
- Stage progress badges (current stage highlighted)

**Unimplemented**
- Creature collection: Fossil calendar/grid for days the user watered (Fossil table exists, UI not built)
- Per-stage tree list
