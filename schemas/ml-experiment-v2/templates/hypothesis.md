# Hypothesis: {{id}}

## Experiment: {{id}}

### Hypothesis

_What are we trying to test? State clearly._

### Context

- **Base Recipe**: {{base_recipe}}
- **Proposed Recipe**: {{proposed_recipe}}

### Proposed Change

{{proposed_change}}

### Controlled Variables

What stays the same between base and proposed?

- model architecture
- data split
- preprocessing
- optimizer and learning rate
- random seed
- evaluation procedure

### Success Criteria

What metric improvements justify accepting this experiment?

-

### Abort Criteria

What results indicate we should stop early?

-

### Evidence Plan

| Stage | Purpose | What to Evaluate |
|-------|---------|------------------|
| smoke | Cheap signal check | Does it run? Is there positive signal? |
| validation | Trusted local evaluation | Does it beat the base recipe? |
| final | External/submission/production | What happens in real conditions? |

### Expected Output Location

_Where will model artifacts and predictions be saved?_

### Notes

_Additional context, concerns, or questions._