# MLSpec Evaluation

## Overview

_Describe the purpose and scope of this ML experimentation workspace._

## Current Best Recipe

{% if current_best %}
| Name | Metrics | Notes |
|------|---------|-------|
| {{current_best.id}} | accuracy: {{current_best.accuracy}} | {{current_best.notes}} |
{% else %}
_No current-best recipe defined yet._
{% endif %}

## Recipes

{% if recipes %}
| ID | Name | Tags | Parent | Created |
|----|------|------|--------|---------|
{% for recipe in recipes %}
| {{recipe.id}} | {{recipe.name}} | {{recipe.tags | join(", ")}} | {{recipe.parent_recipe | default("root")}} | {{recipe.created}} |
{% endfor %}
{% else %}
_No recipes created yet._
{% endif %}

## Active Experiments

{% if experiments %}
| ID | Base → Proposed | Status | Evidence |
|----|-----------------|--------|----------|
{% for exp in experiments %}
| {{exp.id}} | {{exp.base_recipe}} → {{exp.proposed_recipe}} | {{exp.status}} | {% if exp.evidence %}{{exp.evidence | join(", ")}}{% else %}none{% endif %} |
{% endfor %}
{% else %}
_No active experiments._
{% endif %}

## Key Findings

_Summarize notable findings from experiments._

## Recommendations

_Next steps and priorities for the ML experimentation effort._