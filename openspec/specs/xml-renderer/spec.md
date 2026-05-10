# xml-renderer Specification

## Purpose
TBD - created by archiving change mlspec-structured-output. Update Purpose after archive.
## Requirements
### Requirement: XML output flag
The `--xml` flag SHALL cause output to be rendered as XML.

### Requirement: XML output structure
The XML output SHALL be a single `<result>` root element containing child elements for each field.

### Requirement: XML element structure
- `<result verdict="VALID|INVALID|NOT_SUPPORTED">`
- `<experiment>experiment-id</experiment>`
- `<objective>objective text</objective>`
- `<claim metric="..." direction="..."/>`
- `<metrics><baseline accuracy="..." eval_split="..."/>...</metrics>`
- `<failures><failure type="...">...</failure>...</failures>` (if any)
- `<allowedConclusions><conclusion>...</conclusion>...</allowedConclusions>`
- `<disallowedConclusions><conclusion>...</conclusion>...</disallowedConclusions>` (if INVALID)

### Requirement: Example XML output
```xml
<result verdict="INVALID">
  <experiment>eos-test</experiment>
  <objective>Test whether adding EOS handling improves generation termination.</objective>
  <claim metric="accuracy" direction="increase"/>
  <metrics>
    <baseline accuracy="0.8" eval_split="val-v1"/>
    <candidate accuracy="0.91" eval_split="train-v1"/>
  </metrics>
  <failures>
    <failure type="control" field="eval_split">
      <baseline>val-v1</baseline>
      <candidate>train-v1</candidate>
    </failure>
  </failures>
  <allowedConclusions>
    <conclusion>The candidate produced a higher reported metric in its own run.</conclusion>
  </allowedConclusions>
  <disallowedConclusions>
    <conclusion>The candidate is better than the baseline.</conclusion>
    <conclusion>The intervention caused the improvement.</conclusion>
    <conclusion>The candidate recipe should be promoted.</conclusion>
  </disallowedConclusions>
</result>
```

