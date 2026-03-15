# FireDash Enterprise Architecture

**Phase 3 — Synthesize Research into Architecture**  
**Basis:** RESEARCH_AGENTS_REPORT.md (all four agents at 100% completeness). Every design choice below references a specific research section.

---

## 1. Overall System Overview

FireDash is an enterprise GovTech operations dashboard that combines:

- **Live incident feed** (PulsePoint via server proxy) and optional **WallTime simulation** (synthetic units/hospitals/incidents).
- **Unified Bento Box UI** (research: Agent 1 — Layout & UI) with void-black grid, hero map, System Vitals, Hospital Triage, and Fleet panels.
- **AI analytics** (research: Agent 4) as rules-based alerts and Recharts visualizations fed by both live and simulated state.

Integration is additive: the existing layout and live PulsePoint integration remain the source of truth; the simulation engine and analytics run alongside and feed the same UI components. Live and simulated data are distinguished by origin (`live` | `simulated`) so the map and ticker can render them differently (e.g., pulsing markers for live, static for simulated) per Agent 1 and Agent 2.

---

## 2. File Structure

Aligned with RESEARCH_AGENTS_REPORT (Agent 1 file placement, Agent 2/3 data sources, Agent 4 alert/viz).

### Existing (Preserved)

- `src/App.tsx` — Bento grid, TopBar, HeroIncidentMap, SystemVitals, HospitalTriage, FleetAvailability. No removal of void-black CSS grid or panel structure (Agent 1).
- `src/components/HeroIncidentMap.tsx` — react-map-gl/Mapbox; markers by incident type. Extend to accept `origin` so live vs simulated can be styled differently.
- `src/hooks.ts` — `usePulsePoint`, `getCategory`, `getMostActiveStatus`; keep as-is for live feed.
- `api/pulsepoint.ts` — Vercel serverless proxy; no change to endpoint or schema (Agent 2).

### New / Updated

| Path | Purpose | Research reference |
|------|---------|--------------------|
| `src/hooks/useWallTimeSimulation.ts` | Simulation state: units (state machine), hospitals (saturation, wall time, status), incidents (spawn, dispatch, transport, clear). Exposes `units`, `hospitals`, `incidents`, `alerts`. | Agent 3 (Data Structures, Algorithms); Agent 4 (alert inputs). |
| `src/components/LivePulsepointFeed.tsx` | Optional panel or ticker: recent live incidents from PulsePoint (id, type, address, time). Cap visible items; virtualize or time-window if long (Agent 1 high-data volume). | Agent 2 (schema, rate limits). |
| `src/components/HospitalSaturationChart.tsx` | Recharts stacked or horizontal bar: hospital saturation and/or inbound/at-wall/cleared. `ResponsiveContainer`, dark theme, Tooltip. | Agent 1 (Recharts), Agent 4 (Viz). |
| `src/components/FleetDistributionChart.tsx` | Recharts bar (stacked or grouped): unit counts by state (Available, Dispatched, OnScene, AtWall, Clearing). Data from simulation and/or live. | Agent 3 (unit states), Agent 4 (Viz). |
| `src/components/AlertTicker.tsx` | Scrolling ticker for AI alerts: `{ id, severity, message, timestamp }`. Single row, overflow-x auto; cap items (Agent 1). | Agent 4 (Alert Logic, Display). |
| `src/lib/simulationTypes.ts` | Shared types: unit state enum, hospital record, incident, alert. Single source of truth for simulation and UI. | Agent 3 (Data Structures), Agent 4. |
| `src/lib/hospitals.ts` | Static hospital list (id, name, abbreviation, lat, lng) for LA area; used by simulation and diversion logic. Coordinates from Agent 3 (Real-World Samples). | Agent 3. |

No new top-level route or app shell change; all new components are composed inside the existing App.tsx Bento grid.

---

## 3. Data Flow

- **Live path:** `api/pulsepoint.ts` → `usePulsePoint()` → `mapIncidentsToActive()` → `activeIncidents` + `live === true` → `HeroIncidentMap` + metrics. Poll interval ≥ 20s (Agent 2 rate limits). On API failure, keep last good state and show TopBar “CONNECTING” (existing).
- **Simulation path:** `useWallTimeSimulation()` runs timers/spawn/state machine internally. Outputs: `units`, `hospitals`, `incidents`, `alerts`. These feed:
  - **HeroIncidentMap:** simulated incidents with `origin: 'simulated'` (distinct markers).
  - **SystemVitals:** can merge live metrics with simulation (e.g., units deployed = live total + simulated, or switchable).
  - **HospitalTriage:** replace or merge with `hospitals` from simulation (saturation, avgWallTimeMin, unitsAtWall, status).
  - **FleetAvailability:** replace or merge with `units` from simulation (counts by state).
  - **HospitalSaturationChart / FleetDistributionChart:** direct from simulation (and optionally live when available).
  - **AlertTicker:** from `alerts` array (Agent 4 rules: divert suggestion, strain alert).
- **Alert derivation:** Computed inside `useWallTimeSimulation` (or a small pure function) from hospital status and fleet totals (Agent 4 — Reroute suggestion, Strain alert). Pushed into `alerts` with `id`, `severity`, `message`, `timestamp`.

State is unidirectional: hooks → App state → props to components. No direct side effects in Recharts components; they receive props only.

---

## 4. Edge Cases

- **PulsePoint API failure / no data:** Keep previous `incidents` and `live: false`; TopBar shows “CONNECTING” and incident count from last good fetch. Do not clear map (Agent 2). Retry with backoff; no infinite loop.
- **High load (many incidents/units):** Cap ticker length and list rendering (Agent 1). Simulation: cap concurrent incidents or units if needed; use reasonable spawn caps (e.g., LAFD ballpark 40–50/hr) so UI stays responsive.
- **Missing geo:** Filter incidents where `lat`/`lng` parse to NaN (already in `mapIncidentsToActive`); do not plot (Agent 2).
- **Diversion / hospital full:** Simulation applies diversion rule (Agent 3); alert logic suggests next-best hospital (Agent 4). Display is advisory only; no automatic routing override.
- **Build/deploy:** API key (Mapbox) stays in env (`VITE_MAPBOX_TOKEN`); PulsePoint proxy is server-side so no client-side PulsePoint key. Do not commit `.env.local`.

---

## 5. Implications

- **Performance:** Recharts `ResponsiveContainer` and capped lists/ticker avoid layout thrash and DOM bloat (Agent 1). Simulation runs in a single hook; throttle or use requestAnimationFrame for timer-driven updates if needed.
- **Security:** Mapbox token only in env; PulsePoint calls from Vercel server only. CORS and Cache-Control already set in `api/pulsepoint.ts`.
- **Modularity:** Simulation is isolated in `useWallTimeSimulation` and types in `simulationTypes.ts`; existing live path remains default. Feature flag or “Live / Simulated / Both” toggle in TopBar can switch data source without removing code paths.
- **Maintainability:** All structures (unit state, hospital, alert) and rules (diversion, spawn, wall time) are documented in RESEARCH_AGENTS_REPORT.md and this file; new devs can trace from research → architecture → code.

---

## 6. Research Citation Index

| Decision | Report section |
|----------|----------------|
| Keep Bento grid, add charts/ticker | Agent 1 — Recommended UI Structure, Implications & Edge Cases |
| Live vs simulated markers | Agent 1 — Live vs. simulated; Agent 2 — Live vs. simulated |
| PulsePoint schema, poll interval, geo filter | Agent 2 — Sample Data Schema, Nuances & Edge Cases |
| Unit states, hospital record, spawn/wall/diversion | Agent 3 — Data Structures, Algorithms, Real-World Samples |
| Alert conditions, ticker format, saturation/fleet charts | Agent 4 — Alert Logic, Display, Viz Recommendations |
| API failure behavior | Agent 2; existing TopBar CONNECTING |
| Rate limits, security | Agent 2; api/pulsepoint.ts |

---

**Next:** Phase 4 — Implement WallTime Simulation Engine (`useWallTimeSimulation.ts` and supporting types/hospitals).
