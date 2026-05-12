---
name: skill-updater
description: Skill for updating frontend-pattern or backend-pattern SKILL.md when new patterns are discovered
---

# Skill Updater

## When to Run

Run during feature implementation if any of the following apply:

- You wrote a new pattern not present in any existing SKILL.md
- You meaningfully extended an existing pattern or found an edge case
- You established a code structure likely to be reused across the project

**Do NOT run when**:

- Simply applying an existing pattern
- Writing one-off business logic (handlers used only by a specific component, etc.)
- Writing temporary workaround code from a bug fix

---

## Files to Update

| Area              | File                                       |
| ----------------- | ------------------------------------------ |
| Frontend patterns | `.claude/skills/frontend-pattern/SKILL.md` |
| Backend patterns  | `.claude/skills/backend-pattern/SKILL.md`  |
| TDD patterns      | `.claude/skills/tdd/SKILL.md`              |

---

## Process

### 1. Identify the New Pattern

After finishing implementation, ask yourself:

- Can this pattern be applied as-is to other features?
- Would the absence of this pattern in SKILL.md have caused confusion?
- Is there a risk that future me or a teammate would reinvent this from scratch?

If any answer is yes, update.

### 2. Read the Relevant SKILL.md

Before updating, read the full current content to check for duplicates or conflicts.

### 3. Update Principles

- **Add**: Insert in the appropriate existing section. Add a new section if needed.
- **Modify**: Only when an existing example is wrong or a better pattern has emerged.
- **Delete**: Remove patterns no longer in use — stale guides are the biggest risk.
- Code examples should be excerpted from actual project code or minimally adapted.
- Descriptions in English, code in TypeScript.

### 4. Summarize Changes

After updating, report to the user in one line:

```
[frontend-pattern] Added retryDelay reset pattern in SSE hook
[backend-pattern] Added Redis pipeline batch write pattern
[tdd] Added MockWebSocket class pattern
```

---

## Example Pattern Additions

### Frontend — Adding a New Section

If you implemented an "Optimistic Update" pattern not in SKILL.md:

```markdown
## Optimistic Update

Update UI before server response, rollback on failure.

\`\`\`typescript
const prev = useWaterStore.getState().waterCount;
useWaterStore.setState({ waterCount: prev + 1 }); // optimistic update

try {
const res = await fetch('/api/water', { method: 'POST', ... });
if (!res.ok) throw new Error();
const data = await res.json();
useWaterStore.getState().applyWaterResponse(data);
} catch {
useWaterStore.setState({ waterCount: prev }); // rollback
}
\`\`\`
```

### Backend — Extending an Existing Section

When adding a pipeline example to the Redis patterns section, insert it at the bottom of that section.

---

## Prohibitions

- Do not rewrite all of SKILL.md without implementation context.
- Do not delete existing patterns without user confirmation.
- Do not add business logic specific to one feature and present it as a general pattern.
