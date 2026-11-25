# Reading cadence at 1×

Every generated narration word and streamed record/calculation value now uses
`src/components/reading.mjs`. Static application labels and route transitions keep
their existing presentation behavior. The first two chapters retain their thinking
visual; later chapters reveal words directly in gray. Neither mode changes a word's
reading interval. Intro alternatives are a static reference list, not a second fast
text stream.

## Evidence and limits

- [Brysbaert (2019)](https://biblio.ugent.be/publication/8647789): a meta-analysis of
  190 studies estimates adult English silent nonfiction reading at 238 wpm.
- [Brysbaert et al., word-length adjustment](https://users.ugent.be/~wduyck/articles/BrysbaertSuiDuyckDirixInPress.pdf):
  the English passage estimate is `238 × 4.6 / average word length`.
- [Warren, White & Reichle (2009)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2682724/):
  punctuation and sentence boundaries affect reading time.
- [Rayner et al., word length and predictability](https://pmc.ncbi.nlm.nih.gov/articles/PMC3543826/):
  word length, familiarity and context affect eye movements. Reading is not one
  equal fixation per printed word.

These studies support a passage-level pace and variable intervals. They do not
provide exact per-word times for this viewer. The weights below are an explicit UI
approximation, not a fitted eye-tracking or causal model. We do not claim to model
word frequency or contextual predictability without measurements.

## Calculation

`base = 60,000 / 238 = 252.10 ms`

For `N` tokens, passage budget:

`T = max(N × base, sum(effective length) × base / 4.6)`

The floor at `N × base` keeps short-word passages from accelerating above the
population average. Longer technical passages receive more time.

Effective length counts letters and digits; all-uppercase acronyms of 2–6 letters
count twice their letters. A decimal adds one, and currency/percent notation adds
two. These numeric/acronym adjustments are conservative design choices.

Each word receives weight `0.5 + 0.12 × effective length`, plus `0.35` at a comma,
colon, semicolon or dash, or `0.85` at a sentence ending. Internal numeric separators
are not sentence boundaries. We distribute `T` in proportion to those weights,
enforcing a 140 ms minimum and redistributing the remainder. Punctuation is inside
the passage budget, not an additional hidden slowdown.

Words appear whole, remain gray for the first 80% of their interval, then settle
dark. In the two intro chapters, the existing thinking/acceptance visual occupies
the same interval. Focal words no longer get an arbitrary extra 770 ms delay.
Numbers appear as complete numeric tokens rather than partially typed digits.
The user-controlled playback multiplier scales this same clock.

## Default run

The 156 narration words receive 47.52 seconds of reading time: approximately
197 wpm after length and notation adjustments. Full presentation runtime is
101.875 seconds, including the contextual agent operation, visual actions and reading holds.

Examples from the second passage:

| Token | Allocated interval |
| --- | ---: |
| I | 140 ms |
| AE | 221 ms |
| Naturally, | 435 ms |
| optimization | 438 ms |
| problem. | 494 ms |

These are computed display intervals, not empirical measurements of those words.
Each narration finishes at least 1.2 seconds before the next demanding action.
The extra 0.7-second gap before “Naturally,” remains. The agent's four structured
output rows use the same token budgets, with 70 ms between rows. All output finishes
before writeback begins. Each value then moves to its permanent field over 650 ms,
with 90 ms between transfer starts. Compare routes waits for the panel to close and
the completed record to hold for 900 ms. Only the Inbound chapter gains time;
subsequent chapters shift together without accelerating their actions.

## Verification

Tests check the 238-wpm reference budget, the word-length formula, punctuation and
acronym costs, minimum intervals, conditional narration, intro/later mode parity,
and completion before browser actions. Value timing checks include all fixture
leads and the maximum supported hours/ARR. Existing playback, solver and economics
checks remain in place.
