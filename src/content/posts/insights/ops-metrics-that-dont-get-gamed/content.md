# Ops Metrics That Don’t Get Gamed

A metric becomes dangerous when it’s easy to optimize **the number** without improving **the system**.

## What tends to work
### Pair a speed metric with a quality metric
- Throughput is great… until it hides rework.
- Pair it with defect rate, returns, or SLA misses.

### Use percentiles for cycle time
Averages lie when the distribution is messy.

### Track backlog *age*, not just backlog size
Size says “how much.” Age says “how urgent.”

## What I avoid
- Metrics that lack a clear owner
- Metrics with unclear definitions
- Metrics that can’t be acted on within a week

## A simple rule
If the metric moves, the dashboard should make it obvious:
- what changed
- why it likely changed
- what to do next
