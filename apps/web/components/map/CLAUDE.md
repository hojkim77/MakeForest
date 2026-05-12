# Map — Map System Spec (D)

## Mode Distinction

- **Pixel mode** (default): national overview — hover by city/district, click to enter forest mode
- **Forest mode**: shows only the clicked city/district area — dong-level pixels + breathing animation + user overlay
- **Mode switch**: determined by click, not by zoom level

## Pixel Mode

- Displays dong-level pixels (1 pixel = 1 dong)
- Dongs with active users → green brightness reflects activity level
- Dongs with no active users → gray (#707972)
- **Hover unit: city/district**
  - Special/metropolitan cities (Seoul, Busan, Daegu, Incheon, Gwangju, Daejeon, Ulsan, Sejong): the whole 시 is one unit (first 2 chars of dongCode)
  - Provincial regions (Gyeonggi, Gangwon, etc.): 시/군구 unit (first 5 chars of dongCode)
- **Hover effect**: immediately highlights the entire city/district area with a translucent light-green overlay
- **Hover held for 0.5s** → tooltip: region name + aggregated data from `/api/creature/:regionCode`
- **Click** → zoom to fill screen with the city/district, switch to forest mode

## Forest Mode

- Only pixels within the clicked city/district are rendered (background: #0e2318)
- Scale and translate auto-adjusted so the region fills the viewport (92% padding)
- Pixels = dong level — green brightness based on active user count
- Dongs with active users → **breathing animation** (brightness oscillates as a sine wave, ~900ms period)
- Dongs with no active users → gray (#707972), no animation
- **User overlay** (`UserOverlay.tsx`): renders each active user's creature sprite at their dongCode lat/lng position
  - Opacity: RUNNING 0.75 / PAUSED 0.5 / IDLE 0.25
  - Users in the same dong are spread in a circular layout by index (JITTER_RADIUS 0.5px — half the hit area, no overlap)
  - Hit area: 1×1px div (overflow: visible shows a 2px sprite visually); spread ensures every user is hoverable
  - Hover popover: nickname + neighborhood rank (#N위) + session status + `todayWaterCount` (N/12) + task list (hidden if `todosPublic=false`)
  - Popover rendered via `createPortal` to `document.body` (unaffected by canvas scale transform)
- **No panning** (drag and wheel locked)
- Bottom-right button → back to pixel mode

## Common

- Pixel mode: mouse wheel / trackpad pinch → zoom in/out (no mode switch)
- Drag to pan (pixel mode only)
- Bottom-right button: pixel mode = reset to full view / forest mode = return to pixel mode

## Pixel Mode Tooltip Fields (`/api/creature/:regionCode` response)

| Field | Content |
|---|---|
| Active users | Today's active user count (`userCount`) |
| Water total | Region's total water count (`totalWaterCount`) |

## Real-time Subscriptions

- Per-dong activity heatmap (SSE `heatmap:update` — `/map/activity-stream`)
- User overlay positions and states (SSE `users:overlay` — `/map/activity-stream`, 10s interval + immediate on water/session change)
