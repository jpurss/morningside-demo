# Build Plan — Executive Dashboard Charts

## Objective
Upgrade the executive dashboard with charts and visualizations that match the product’s design language and improve quick readability / information digestion.

## Success Criteria (verifiable)
- **Readability**: In <5 seconds, a user can identify:
  - where work is stuck (pipeline by stage),
  - whether capacity is strained (capacity mix),
  - what’s stale/at risk (aging risk).
- **Design consistency**:
  - charts use CSS variables `--color-chart-1..5`,
  - tooltips and typography match existing UI patterns,
  - no light-mode-only styles; dark mode is readable.
- **Stability**: Existing KPIs and triage queue behavior remain unchanged.
- **Accessibility**: Each chart has an accessible title and a short `sr-only` summary; focus rings are visible.

## Task List (mirrors Cursor TODOs)

### docs-bootstrap
- **Deliverables**:
  - `reminders.md` with “Project Status” section (updated at session start and end)
  - `build_plan.md` (this file)
  - `pseudocode/executive_dashboard_charts.md`
- **Done when**: files exist, contain the described sections, and the Project Status is updated.

### add-recharts
- **Deliverables**: `recharts` added to `package.json` and installed (Bun).
- **Done when**: `bun run build` succeeds and the app compiles with Recharts imports.

### chart-ui-wrapper
- **Deliverables**: `src/components/ui/chart.tsx` wrapper utilities.
- **Done when**: charts can use a standardized container + tooltip and CSS-variable colors.

### pipeline-by-stage-chart
- **Deliverables**: `PipelineByStageChart` component + dashboard integration.
- **Done when**: pipeline distribution by stage is visible, tooltipped, and uses existing stage ordering.

### capacity-mix-chart
- **Deliverables**: `CapacityMixChart` component + dashboard integration.
- **Done when**: capacity risk is instantly legible and preserves existing callouts.

### aging-risk-chart
- **Deliverables**: `AgingRiskChart` component + stalest items list + dashboard integration.
- **Done when**: aging distribution is visible with thresholds and “awaiting client” risk is highlighted.

### a11y-polish
- **Deliverables**: accessible summaries/titles and consistent focus behavior across charts.
- **Done when**: keyboard and screen-reader users can understand the high-level insight of each chart.


