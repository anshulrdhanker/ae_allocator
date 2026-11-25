# Routing Agent — GTM lead allocation

A roughly 82-second narrated product demonstration built with Next.js/React and the existing Python/SciPy MILP backend. A simulated lead arrives, the agent prepares and applies its routing inputs, its expected economics are calculated, the same agent compares two cohort-wide routing policies, and a text-only conclusion states the expected revenue difference.

## Run locally

```sh
npm install
npm run dev
```

The redesigned app runs at http://127.0.0.1:5174. Start the backend separately if port 8000 is not already occupied:

```sh
python3 -m pip install -r backend/requirements.txt
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

For a separate backend, set `API_URL=http://127.0.0.1:8001` when building/running Next. Production: `npm run build`, then `npm start`. Archives exclude installed dependencies, build output, secrets, and caches.

## The presentation

| Time at 1× | View and action |
|---|---|
| 0–8 s | Introduce the inbound routing problem. |
| 8–23 s | Explain limited AE capacity; dock narration and open the browser. |
| 23–33 s | Open a simulated lead; prepare, generate, and apply its routing inputs. |
| 33–48 s | Calculate self-service EV, assisted EV, incremental value, and AE effort. |
| 48–55 s | Fold the input summary and start both revenue charts when Allocation opens. |
| 55–65 s | Finish tracing the full cohort, compare cumulative expected revenue, and hold the difference. |
| 65–82 s | Generate the closing sentence using the opening thinking and assignment animation, then hold it. |

The three functional product tabs are Inbound, Allocation, and Results. Selecting Results starts the closing narration. The completed input panel folds automatically into its header. Compare across leads, Compare full cohort, and View revenue impact advance the same application states used by autoplay. Selected lead identity is retained until Replay or a recompute resets the guided flow.

Back and Next navigate checkpoints. Entering Results starts the closing animation, or shows the complete sentence in Static steps. Replay starts at zero. Pause, page visibility, speed, static steps, and all visual motion share one logical clock. All generated narration and streamed values use a 238-wpm silent-reading baseline, adjusted for word length, punctuation, acronyms and numeric notation. After the problem and solution intro, narration words appear at twice the opening rate. Words appear in gray before settling dark, and visible lines rise gently as the passage grows. The opening and closing chapters use the same thinking and assign animation with authored candidate lists. Stable word slots prevent reflow. See [the research, formula and computed examples](docs/reading-cadence.md).

The old sentence clears over 390ms, followed by a blank beat; the extra pause before “Naturally,” is retained. Browser actions begin at least 1.2 seconds after the full reading interval of the last word. Conversion estimates, calculated outputs, routes, and policy results resolve sequentially. Conditional copy adjusts the runtime. Empty cohorts omit nonexistent records; single-lead, zero/lower-revenue, feasible, and fallback outcomes retain their actual data and qualifications.

The browser uses one title and navigation, a consistent desktop frame height, subtle neutral surfaces, tabular numerals, aligned comparisons, and green only for meaningful changes. Inbound resolves fields within a persistent record. Allocation reuses the Inbound record header and Routing Agent panel. Both charts count the open lead first and then follow cohort order. Each point sums expected annual revenue from the actual assignments up to that lead. The dashed line on the MILP chart repeats the baseline for comparison. Results uses the opening text layout and reads its figures from the current simulation. Mobile uses normal vertical scrolling.

The contextual Inbound agent panel prepares the current lead's existing synthetic inputs, generates four structured outputs at the shared reading cadence, and visibly transfers them into their permanent fields before collapsing. For Lead 003, the first estimate begins appearing about 1.2 seconds after opening and the fourth at 4.8 seconds, followed by a completed-record hold. Smaller inline activity states accompany revenue calculation and application of the returned allocation. See [the interaction implementation notes](docs/agent-activity.md).

Parameters retains editable cohort configuration and per-lead overrides, real API recomputation, abort handling, and Retry. A failed recompute explicitly retains the last valid run. Explore the model contains both capacity constraints, the precise objective and self-service revenue base, baseline definition, solver status/gap, executable implementation excerpt, validation checks, assumptions, limitations, and proposed validation.

## Implementation map

All component paths below are under `src/components/`.

- `reading.mjs`: shared reading budgets, variable word intervals and value sequencing.
- `narrative.mjs`, `intro.mjs`, `TextGenerationIntro.jsx`: seven narration blocks, operational cues, word phases, candidate vocabularies, and docking.
- `playback.mjs`, `usePresentation.jsx`, `PresentationDocument.jsx`: deterministic clock, navigation, selected lead, and one page composition.
- `AgentWorkspace.jsx`: persistent browser shell and working product tabs.
- `InboundView.jsx`, `PitchMechanism.jsx`: simulated queue, record, input groups, and sequential full-precision economics.
- `EstimateAgent.jsx`, `agent-activity.mjs`: contextual input preparation, structured output, measured value transfers, and deterministic operation timing.
- `AgentActivity.jsx`: reusable clock-driven activity indicator for preparation, calculation, and allocation.
- `WorkspaceRecord.jsx`, `AllocationEngine.jsx` and `allocation-engine.mjs` provide the shared record layout, cohort simulation and cumulative revenue series.
- `DocumentPrimitives.jsx`: playhead-derived expansion and route-chip movement.
- `selectors.mjs`, `economics.mjs`: authentic lead selection, formatting, counts, summaries, and checks.
- `ModelAppendix.jsx`, `model-code.mjs`: optional mathematical and implementation detail.
- `app/page.tsx`: preserved fetch/edit/recompute/error workflow.
- `app/globals.css`: replacement responsive layout and visual tokens.

Unused `AgentPointer.jsx`, `RunView.jsx`, and `ModelCodeView.jsx` were removed after checking imports. The backend math was not changed.

## Verification

```sh
npm test
npm run typecheck
npm run build
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python3 -m pytest backend tests/test_display_code.py -q
node scripts/render-qa.mjs
```

The renderer checks every meaningful scene across 11 scenario fixtures. Run `node scripts/serve-qa.mjs` afterwards for the test-only browser harness at port 5182, including actual-app mode, request-failure injection, and a test-only reduced-motion media-query control. It is not included in the production route.

See [the current agent interaction verification](artifacts/agent-activity/verification.md) and its desktop/mobile captures. The preceding [product-craft verification](artifacts/product-craft/verification.md), [cadence correction report](artifacts/cadence-correction/verification.md), and [original redesign report](artifacts/gtm-redesign/verification.md) record earlier implementation stages. Previous reports in `artifacts` describe superseded designs.

## Reality contract

Independent prototype · synthetic leads · real MILP. The arrival is a guided replay from an already generated cohort. All economics and route assignments come from the Python backend; the UI does not replay the solver's search. The baseline is an illustrative sales-EV-ranked greedy rule, not Anthropic's actual policy. Conversion rates and effort are synthetic assumptions, not calibrated predictions. The maximum supported cohort is 5,000 leads. Expected annual revenue is not realized revenue. Proposed validation and a controlled pilot have not been performed.
