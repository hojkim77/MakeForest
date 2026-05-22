---
name: architecture-decision-records
description: Capture architectural decisions made during Claude Code sessions as structured ADRs. Auto-detects decision moments, records context, alternatives considered, and rationale. Maintains an ADR log so future developers understand why the codebase is shaped the way it is.
origin: ECC
---

# Architecture Decision Records

Capture architectural decisions as they happen during coding sessions. Instead of decisions living only in Slack threads, PR comments, or someone's memory, this skill produces structured ADR documents that live alongside the code.

## When to Activate

- User explicitly says "let's record this decision" or "ADR this"
- User chooses between significant alternatives (framework, library, pattern, database, API design)
- User says "we decided to..." or "the reason we're doing X instead of Y is..."
- User asks "why did we choose X?" (read existing ADRs)
- During planning phases when architectural trade-offs are discussed

## ADR Format

Use the lightweight ADR format proposed by Michael Nygard, adapted for AI-assisted development:

```markdown
# ADR-NNNN: [Decision Title]

**Date**: YYYY-MM-DD
**Status**: proposed | accepted | deprecated | superseded by ADR-NNNN
**Deciders**: [who was involved]

## Context

What is the issue that we're seeing that is motivating this decision or change?

[2-5 sentences describing the situation, constraints, and forces at play]

## Decision

What is the change that we're proposing and/or doing?

[1-3 sentences stating the decision clearly]

## Alternatives Considered

### Alternative 1: [Name]
- **Pros**: [benefits]
- **Cons**: [drawbacks]
- **Why not**: [specific reason this was rejected]

### Alternative 2: [Name]
- **Pros**: [benefits]
- **Cons**: [drawbacks]
- **Why not**: [specific reason this was rejected]

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive
- [benefit 1]
- [benefit 2]

### Negative
- [trade-off 1]
- [trade-off 2]

### Risks
- [risk and mitigation]
```

## Workflow

### Capturing a New ADR

When a decision moment is detected:

1. **Initialize (first time only)** — if `docs/adr/` does not exist, ask the user for confirmation before creating the directory
2. **Identify the decision** — extract the core architectural choice being made
3. **Gather context** — what problem prompted this? What constraints exist?
4. **Document alternatives** — what other options were considered? Why were they rejected?
5. **State consequences** — what are the trade-offs?
6. **Assign a number** — scan existing ADRs in `docs/adr/` and increment
7. **Confirm and write** — present the draft ADR to the user for review. Only write after explicit approval.
8. **Update the index** — append to `docs/adr/README.md`

### ADR Directory Structure

```
docs/
└── adr/
    ├── README.md              ← index of all ADRs
    ├── 0001-use-nextjs.md
    ├── 0002-postgres-over-mongo.md
    └── template.md
```

## What Makes a Good ADR

### Do
- **Be specific** — "Use Prisma ORM" not "use an ORM"
- **Record the why** — the rationale matters more than the what
- **Include rejected alternatives** — future developers need to know what was considered
- **State consequences honestly** — every decision has trade-offs
- **Keep it short** — an ADR should be readable in 2 minutes

### Don't
- Record trivial decisions — variable naming or formatting choices don't need ADRs
- Write essays — if the context section exceeds 10 lines, it's too long
- Omit alternatives — "we just picked it" is not a valid rationale

## ADR Lifecycle

```
proposed → accepted → [deprecated | superseded by ADR-NNNN]
```

## Categories of Decisions Worth Recording

| Category | Examples |
|----------|---------|
| **Technology choices** | Framework, library, database |
| **Architecture patterns** | Monolith vs microservices, event-driven |
| **API design** | REST vs GraphQL, versioning strategy, auth mechanism |
| **Data modeling** | Schema design, normalization decisions, caching strategy |
| **Security** | Auth strategy, encryption approach |
| **Testing** | Test framework, coverage targets |
