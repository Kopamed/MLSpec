# structured-output Specification

## Purpose
TBD - created by archiving change mlspec-structured-output. Update Purpose after archive.
## Requirements
### Requirement: Commands return structured result
All MLSpec commands SHALL return structured data internally before rendering. The structured result SHALL be passed to a renderer for output.

### Requirement: Result type definition
The structured result for check command SHALL contain:
- verdict: "VALID" | "INVALID" | "NOT_SUPPORTED"
- experimentId: string
- objective: string
- claim: { metric: string; direction: string }
- baselineMetric?: number
- candidateMetric?: number
- metricImproved?: boolean
- failures: Array<{ type: string; message: string; details?: { field?: string; baseline?: unknown; candidate?: unknown } }>

### Requirement: Renderer interface
A renderer SHALL implement a `render(result: CheckResult): string` interface.

### Requirement: Default renderer is human
When no format flag is specified, the human renderer SHALL be used.

