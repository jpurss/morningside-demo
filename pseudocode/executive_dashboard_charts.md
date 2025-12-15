# Pseudocode — Executive Dashboard Charts

## Inputs (existing)
- `items: ExecutiveItem[]` from `useExecutiveDashboard()`
- `workstreamItems: ExecutiveItem[]` already filtered by tab in `DashboardPage`
- `EXEC_STAGES` + `stageRank()` for stable stage ordering
- `consultingCapacity` already computed in `DashboardPage`
- `openUnassignedHours` already computed in `DashboardPage`
- `formatUsd()` existing helper

## Shared helpers

### Open items
```
openItems = workstreamItems.filter(item => item.stage != "done" && item.stage != "archived")
```

### Stage ordering
```
stagesOrdered = EXEC_STAGES sorted by stageRank(stage)
```

## PipelineByStageChart dataset

### Per-stage aggregation (counts/hours/value)
```
byStage = stagesOrdered.map(stage => {
  stageItems = openItems.filter(i => i.stage == stage)
  return {
    stage,
    label: stageLabel(stage),
    count: stageItems.length,
    hours: sum(stageItems, i => i.estimateHours || 0),
    valueUsd: sum(stageItems, i => i.expectedRevenueUsd || 0)
  }
})

totals = {
  count: sum(byStage, s => s.count),
  hours: sum(byStage, s => s.hours),
  valueUsd: sum(byStage, s => s.valueUsd),
}
```

### Chart mapping (stacked bar idea)
- Preferred: one-row stacked bar where each stage is a segment value = `count`.
- Tooltip: show stage label + count + hours + valueUsd.

## CapacityMixChart dataset

### Tier values
```
over = consultingCapacity.over
nearBalanced = consultingCapacity.near + consultingCapacity.balanced
available = consultingCapacity.available

series = [
  { key: "over", label: "Over capacity", value: over },
  { key: "nearBalanced", label: "Near/Balanced", value: nearBalanced },
  { key: "available", label: "Available", value: available },
]
```

### Chart
- Preferred: donut chart with 3 segments.
- Tooltip: show label + value + % of total (if total > 0).

## AgingRisk dataset

### Constants / thresholds
- `DAY_MS = 24*60*60*1000`
- Age buckets (days):
  - `0–3`, `4–7`, `8–14`, `15–30`, `31+`
- `AWAITING_CLIENT_RISK_DAYS = 7`
- `STALE_TOP_N = 5`

### Compute item age
```
now = Date.now()
openItems = ... (as above)

withAge = openItems.map(i => {
  ageDays = floor((now - i.updatedAt)/DAY_MS)
  return { item: i, ageDays }
})
```

### Bucket counts
```
buckets = [
  { key: "0_3", label: "0–3d",  min: 0,  max: 3,  count: 0 },
  { key: "4_7", label: "4–7d",  min: 4,  max: 7,  count: 0 },
  { key: "8_14",label: "8–14d", min: 8,  max: 14, count: 0 },
  { key: "15_30",label:"15–30d",min: 15, max: 30, count: 0 },
  { key: "31p", label: "31+d", min: 31, max: INF,count: 0 },
]

for each entry in withAge:
  find first bucket where min <= ageDays <= max (or max==INF)
  bucket.count += 1
```

### Awaiting-client risk
```
awaitingClientRiskCount = withAge.filter(({item,ageDays}) =>
  item.stage == "awaiting_client" && ageDays >= AWAITING_CLIENT_RISK_DAYS
).length
```

### Stalest list (top N)
```
stalest = withAge
  .sort(desc by ageDays)
  .slice(0, STALE_TOP_N)
  .map(({item, ageDays}) => ({ id: item.id, title: item.title, stage: item.stage, ageDays }))
```

## Accessibility summary strings (examples)
Each chart should provide a short `sr-only` summary derived from dataset:
- Pipeline: "Open pipeline has X items across stages; largest is {stageLabel} with Y."
- Capacity: "Consulting capacity: over A of T, available B of T."
- Aging: "Open items aging: N items older than 14 days; awaiting-client risk R items older than 7 days."


