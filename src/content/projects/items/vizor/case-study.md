## What Vizor is now

Vizor lets you describe a change to a Tableau dashboard in plain language — "add West-region revenue as a KPI at the top" — and actually makes the change to the real workbook. The catch it exists to solve: you can't let a language model rewrite Tableau's XML directly — it can produce plausible but structurally invalid workbooks. So Vizor splits the work: the model **plans**, and deterministic code **applies the change and only ships the workbook when validation passes**.

## How it started (and why it changed)

The project began as a web app: upload a dashboard screenshot, get a scored critique across six lenses (clarity, layout, KPI hierarchy, chart choice, color, storytelling) and a redesign plan. That was genuinely useful, but it stopped at advice — it never touched the workbook, so it couldn't make the change it recommended.

To actually apply changes, the architecture had to change. That pivot is the whole story of the project, and it's the part I'd want an engineer to look at.

## The architecture: model plans, deterministic code applies

- **The agent never edits the file.** It interprets the request and proposes a **structured, neutral change spec** — an add / replace / move on a specific visual, with grounded references to real fields and worksheets. It never sees or writes Tableau XML.
- **You approve, then a deterministic compiler applies it.** The change moves through an apply loop — `PROPOSED → ACCEPTED → COMPILED → APPLIED` — and a rejected or invalid step becomes `FAILED`. The compiler binds only to a real, compiler-safe source worksheet with the exact requested measure, dimension, and supported chart family.
- **Everything is validated, and it fails closed.** Each generation runs **package, schema, field, zone, and fidelity** validation. If any check fails, nothing ships — you don't get a broken workbook.
- **The output is safe by construction.** Results are written as **versioned** workbooks (`<source>_vizor_vN.twb`), every generation verifies the original's **SHA-256 is unchanged**, and every edit is **undoable**.
- **Local-first.** It runs on one machine with no cloud credentials required, with a pluggable LLM provider for the planning step.

## The hard part

The interesting engineering isn't the model call — it's the **boundary**. A language model is excellent at interpreting ambiguous intent and design judgment, and untrustworthy at producing a structurally valid file. Drawing a hard line between "the model may propose a neutral spec" and "only deterministic code may touch the workbook" is what makes natural-language editing safe. That boundary — not the prompt — is the product.

## Where it honestly stands

Vizor is a **Windows private beta** — packaged and code-signed. The core loop works today: an agent proposes a change, a deterministic compiler applies it, and the output is written only after **package, schema, field, zone, and fidelity** checks pass. It produces real, versioned Tableau workbooks and has been field-tested on real public dashboards, with layout fidelity scored on every generation (in the 70s–90s on evaluated dashboards, peaking at 91).

The honest limits: early apply support focuses on `add` and grounded `replace`, so the edit vocabulary is still expanding; chart-family and calculation coverage is deliberately narrow and growing; the Power BI path is earlier than the Tableau one; and the next hardening work is broadening the set of validated edit operations and widening fidelity coverage across more dashboard shapes. I'd rather describe it at that resolution than round it up.

## What I took away

Vizor is the clearest example I have of the thing I keep coming back to: the best AI product decision is usually *less* AI in the correctness path, not more. Put the model where reasoning helps, put the correctness checks in deterministic software, and make the seam between them explicit.

> **On metrics:** I keep the numbers scoped to what the artifacts support — per-generation fidelity scores and field tests on specific dashboards — rather than quoting a single universal accuracy figure.
