## The problem

PIM Brands makes candy at real manufacturing scale, and the data that described how the lines were running was scattered across four systems — Snowflake, SQL Server, SAP HANA, and Redzone. A plant leader who wanted to know why a line underperformed on a given shift had no fast way to see it, and getting the numbers meant someone pulling and stitching them together by hand, again and again.

## Context

I was the Data Analytics Intern on the operations side. The temptation in a role like this is to treat it as "receive requirements, build Power BI dashboards." I didn't want to do that — you can build a beautiful dashboard for a process you don't understand and quietly measure the wrong thing.

## Discovery

So I spent the first part of the internship on the floor, with the manufacturing teams, learning how production actually worked: what a changeover really costs, what counts as downtime, why availability and performance and quality pull against each other, and which numbers a supervisor already trusted. That grounding is the reason the reporting landed — I was building around the decisions people were actually making, not the ones a metric dictionary assumed.

## What I built

- **OEE reporting** — availability, performance, and quality, plus utilization, downtime, changeover, and capacity views.
- **Cross-source data model** — reconciling and validating data across Snowflake, SQL Server, SAP HANA, and Redzone so a single KPI meant one thing, not four.
- **Automated Python/SQL reporting** — the recurring pulls that used to be manual, scripted so they ran themselves.
- **15 analytics products** delivered and used in recurring operational reviews.

The dashboards were designed for how a review actually flows: **KPI health → drivers → line-level drill-down**, so a meeting could go from "is this line okay?" to "here's the specific changeover that's costing us" without leaving the report.

## Decisions & tradeoffs

I kept KPI definitions documented and reconciled at the source, because in a plant the fastest way to lose a dashboard's credibility is a number that disagrees with the one on someone's clipboard. Spending time up front on source reconciliation and validation — and running it through UAT with the people who'd use it — bought trust that made the reporting stick.

## Outcome

- **15 analytics products** in recurring use across engineering and operations.
- **~10+ hours per week** of manual reporting removed through automation.
- Presented to **plant and executive leadership** as decision-support, not just charts.

## What I learned

The most valuable thing I did all internship happened before I opened Power BI: I learned the process first. Analytics that people act on comes from understanding the operation, not just the schema — and that lesson is exactly what carries into forward-deployed and product work.
