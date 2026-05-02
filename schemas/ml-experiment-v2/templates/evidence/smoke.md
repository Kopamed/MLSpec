---
entity_type: evidence
experiment_id: {{experiment_id}}
stage: smoke
created: {{created}}
runs: []
summary: ""
recommendation: none
---

# Smoke Evidence: {{experiment_id}}

## Overview

Smoke testing is a cheap signal check to determine if an experiment is worth pursuing.

**Questions to answer:**
- Does the proposed change run without errors?
- Is there any obvious positive or negative signal?
- Are there any immediate red flags?

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

## Observations

_What did you observe during the smoke test?_

## Recommendation

{% if recommendation == 'none' %}
_Recommendation not yet set._
{% elif recommendation == 'accept' %}
The smoke test shows promising results. Consider proceeding to validation.
{% elif recommendation == 'reject' %}
The smoke test shows no signal or negative results. Consider rejecting or modifying.
{% elif recommendation == 'retry' %}
The smoke test encountered issues that may be fixable. Consider retrying.
{% elif recommendation == 'hold' %}
The smoke test shows mixed results. Consider holding for later review.
{% elif recommendation == 'inconclusive' %}
The smoke test is inconclusive. More investigation needed.
{% endif %}

## Next Steps

- Proceed to validation if smoke is positive
- Document issues if smoke is negative