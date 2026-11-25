# Contextual agent activity

This enhancement connects preparation, generated output, and application updates
within the existing Routing Agent presentation. It visualizes the current model
inputs and returned allocation; it does not add enrichment, LLM calls, or solver
search telemetry.

## Inbound operation

The panel opens from Routing estimates while the lead and potential ARR remain
visible. A lead-record → model-inputs trace accompanies preparation. Four rows
stream labels and values with the existing gray token treatment and reading budgets.
After every row finishes, values travel into the original conversion and effort
fields. The panel collapses after all values commit, then the record holds.

The default lead's opening-through-close operation lasts 7.295 seconds. Preparation
uses 1.45 seconds, including the 280 ms opening. Generated output gets its full
reading budget, followed by 280 ms to settle. Transfers last 650 ms and start 90 ms
apart. Closing follows the last commit by 180 ms and lasts 320 ms. The completed
record holds for at least 900 ms.

The Inbound chapter gains 4.195 seconds for the default cohort; total runtime is
101.875 seconds. Its completed checkpoint covers the longest operation among all
selectable leads. Narration wording, narration timing rules, source story cues,
and later chapter durations remain unchanged.

## Other operations and controls

Revenue calculations receive a small inline activity row. Allocation activity
describes shared capacity and applying the actual returned result. Optimal,
feasible, and fallback statuses retain their actual meaning. Results receives no
activity indicator.

Every phase, token, indicator, and value transfer derives from the presentation
clock. Pause freezes them; speed scales them; replay resets them; static steps
show completed checkpoints. Reduced motion omits moving value transfers. Geometry
is measured when layout or the selected lead changes. Manual selection and fresh
simulations derive output from their own lead data.

## Modified implementation files

All component paths are under `src/components/`.

| Files | Change |
| --- | --- |
| `EstimateAgent.jsx`, `agent-activity.mjs` (new) | Input preparation, streamed structured output, measured field transfers, operation schedule. |
| `AgentActivity.jsx` (new) | Reusable activity summaries and clock-driven indicator. |
| `InboundView.jsx`, `DocumentPrimitives.jsx` | Integrate the panel, preserve completed inputs between chapters, reserve stable field layout. |
| `PitchMechanism.jsx` | Inline activity for the existing revenue calculations. |
| `DecisionReview.jsx`, `Simulation.jsx`, `AgentWorkspace.jsx` | Inline activity for returned allocations and reduced-motion propagation. |
| `narrative.mjs`, `playback.mjs` | Extend only Inbound; keep explicit cue navigation in that extended chapter. |
| `app/globals.css` | Scoped panel, transfer, and inline activity styling. |
| `tests/agent-activity.test.mjs`, `tests/document.test.mjs` | Operation timing, current-data fidelity, playback behavior, and updated field-generation checks. |

The existing introduction components, reading engine, Results component, selectors,
economics, parameter/recompute page, and Python backend are unchanged. Narration
strings are unchanged. See [verification and screenshots](../artifacts/agent-activity/verification.md).
