---
entity_type: evidence
experiment_id: {{experiment_id}}
stage: validation
created: {{created}}
runs: []
summary: ""
recommendation: none
---

# Validation Evidence: {{experiment_id}}

## Overview

Validation testing is a trusted local evaluation to determine if the proposed change beats the base recipe.

**Questions to answer:**
- Does the proposed recipe outperform the base recipe?
- Is the improvement consistent across multiple seeds?
- Are the results statistically significant?

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

## Comparison to Base

_How do these results compare to the base recipe?_

| Metric | Base | Proposed | Delta |
|--------|------|----------|-------|
| accuracy | ... | ... | +/-... |
| f1 | ... | ... | +/-... |

## Observations

_What did you observe during validation?_

## Recommendation

{% if recommendation == 'none' %}
_Recommendation not yet set._
{% elif recommendation == 'accept' %}
Validation shows improvement. Ready to accept as candidate/current-best.
{% elif recommendation == 'reject' %}
Validation shows no improvement or regression. Consider rejecting.
{% elif recommendation == 'retry' %}
Validation shows promise but needs refinement. Consider retrying.
{% elif recommendation == 'hold' %}
Validation is mixed. Consider holding for later review.
{% elif recommendation == 'inconclusive' %}
Validation is inconclusive. Consider collecting more evidence.
{% endif %}

## Next Steps

- Accept if validation supports acceptance criteria
- Consider final evidence if submitting to production
- Reject if validation does not support acceptance