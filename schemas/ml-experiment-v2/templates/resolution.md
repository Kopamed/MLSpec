---
entity_type: resolution
experiment_id: {{experiment_id}}
resolution: {{resolution | default("accept")}}
created: {{created}}
---

# Resolution: {{experiment_id}}

## Overview

- **Experiment**: {{experiment_id}}
- **Resolution**: {{resolution}}
- **Date**: {{created}}

{% if resolution == 'accept' %}
## Accepted Recipe

- **Recipe ID**: {{accepted_recipe}}
- **Tags**: {{accepted_tags | join(", ") if accepted_tags else "candidate"}}

{% endif %}

{% if resolution == 'reject' %}
## Rejection Reason

{{rejection_reason}}

{% endif %}

{% if resolution == 'inconclusive' %}
## Uncertainty Reason

{{uncertainty_reason}}

{% endif %}

{% if resolution == 'hold' %}
## Blocker

{{blocker}}

{% endif %}

{% if resolution == 'retry' %}
## Retry Plan

{{retry_plan}}

{% if revisit_condition %}
## Revisit Condition

{{revisit_condition}}
{% endif %}

{% endif %}

## Rationale

{{rationale | default("_Explain the reasoning behind this decision._")}}

## Supporting Evidence

{% if supporting_evidence %}
{% for evidence in supporting_evidence %}
- **{{evidence.stage}}**: {{evidence.summary}}
{% endfor %}
{% else %}
_No supporting evidence referenced._
{% endif %}

## Next Steps

_What should happen after this resolution?_