---
entity_type: evidence
experiment_id: {{experiment_id}}
stage: final
created: {{created}}
runs: []
summary: ""
recommendation: none
---

# Final Evidence: {{experiment_id}}

## Overview

Final evidence represents external, submission, or production results.

**Questions to answer:**
- What happened when this recipe was used in real conditions?
- How did the recipe perform in production or on held-out test data?
- Are there any unexpected behaviors or edge cases?

## Run Summary

{% if runs %}
| Seed | Duration | Metrics |
|------|----------|---------|
{% for run in runs %}
| {{run.seed}} | {{run.duration_minutes | default("?")}} min | {% for metric, value in run.metrics.items() %}{{metric}}: {{value}}{% endfor %} |
{% endfor %}
{% else %}
_No runs recorded yet._
{% endif %}

{% if aggregate %}
## Aggregated Results

| Metric | Mean | Std |
|--------|------|-----|
{% for metric, stats in aggregate.items() %}
| {{metric}} | {{stats.mean | default("N/A")}} | {{stats.std | default("N/A")}} |
{% endfor %}
{% endif %}

## Production Results

_What happened in production or external evaluation?_

## Comparison to Base

| Metric | Base | Proposed | Delta |
|--------|------|----------|-------|
| accuracy | ... | ... | +/-... |
| f1 | ... | ... | +/-... |

## Observations

_What did you observe in final evaluation?_

## Recommendation

{% if recommendation == 'none' %}
_Recommendation not yet set._
{% elif recommendation == 'accept' %}
Final results support acceptance. Strong candidate for current-best.
{% elif recommendation == 'reject' %}
Final results do not support acceptance. Consider rejecting.
{% elif recommendation == 'retry' %}
Final results suggest retry with modifications.
{% elif recommendation == 'hold' %}
Final results are mixed. Consider holding.
{% elif recommendation == 'inconclusive' %}
Final results are inconclusive.
{% endif %}

## Next Steps

- Finalize acceptance decision
- Update current-best if appropriate
- Document lessons learned