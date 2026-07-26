# Vizor — AI-assisted Tableau Workbook Reviewer

> Draft reconstructed from the project source. Confirm the details marked _TODO_ before publishing.

## Context
Tableau workbooks tend to drift over time: worksheets get generic names, workbook identity metadata goes stale, and dashboards become inconsistent. Reviewing them by hand doesn't scale.

## Problem
- Worksheet names often describe nothing useful to a future maintainer
- Workbook identity metadata falls out of date as dashboards evolve
- Manual review and cleanup is slow, inconsistent, and error-prone

## Approach
- Parse `.twb` files into a structured model of dashboards and worksheets
- Generate **honest, confidence-scored observations** — every observation carries a confidence level and a note explaining the basis for it, so nothing is presented as more certain than it is
- Propose and apply **safe, deterministic edits**: renaming worksheets to describe what they show, and refreshing workbook identity metadata as the dashboard evolves
- Guarantee correctness: edited workbooks are re-parsed in tests to prove they remain valid, reopenable Tableau XML
- Keep scoring deterministic — the same input always produces the same result (no hidden randomness)

## Outcome
Manual workbook cleanup becomes a repeatable, reviewable flow. A human stays in control because the tool is explicit about its confidence, and every automated change preserves a valid workbook.

_TODO: add real impact — e.g. workbooks reviewed, time saved, adoption — if available._

## Notes
_TODO: confirm date/duration, solo vs. team, whether a real vision model is planned, and any repo/demo link._
