## The problem

The task sounds simple: take large spreadsheet datasets and get them into an external API in a structured form. It stops being simple at scale. Across thousands of records you hit malformed rows, values the API rejects, and requests that time out — and if the pipeline just assumes everything works, those failures disappear silently and you find out later, when the data is already wrong downstream.

## Context

This was at Inn4Smart Solutions, working alongside QA and product teams on an **8-release cadence.** That rhythm mattered: the pipeline wasn't a one-time script, it was something that had to keep working across releases and be safe for other people to run.

## What I built and supported

The flow, end to end:

- **Spreadsheet input processing** — reading and cleaning the incoming datasets.
- **Structured JSON transformation** — turning rows into the shape the external API expected.
- **API submission** with **validation** and **response checks** on the way back.
- **Retry behavior** for transient failures, and **failure logging** so a bad record produced a visible, explainable log entry instead of a silent gap.
- **Edge-case testing in Postman** — deliberately throwing malformed and boundary inputs at it to find where it broke before real data did.

## The hard part: what "reliable" actually means

The lesson I took from this project is one I still lead with: **reliability is not "the API returned 200."** A 200 on the request you happened to send tells you almost nothing about the batch. Real reliability is that when something goes wrong — and at thousands of records it will — the failure is **detectable** (you know it happened), **understandable** (you know why), and **recoverable** (you know what to do next). That's the difference between a demo and a pipeline someone can depend on.

## Decisions & tradeoffs

Most of my effort went into the unglamorous half — validation, retries, logging, and documentation — rather than the happy-path transform. I also **documented the failure and recovery procedures and trained 6+ users**, because a pipeline that only one person understands is a liability the moment that person is out. Making it operable by others was part of making it reliable.

## Outcome

- **Thousands of records** moved through the external API workflow.
- Failures made **detectable, understandable, and recoverable** rather than silent.
- **Documented recovery procedures + 6 trained users**, so the workflow survived beyond me.

## What I learned

This is where I started thinking about systems the way I still do: the interesting engineering isn't the transformation, it's everything you build around the assumption that things will fail. That instinct is exactly what carried into Vizor's schema-and-fallback design years later.
