Run `git log main..HEAD --oneline` and `git diff main...HEAD --stat` to understand what's on this branch, then draft a PR and create it following this convention exactly:

**Title format:** `<Type>/ <한국어 설명>`

**Types:**
- `Feature` — new feature
- `Fix` — bug fix
- `Refactor` — restructure without behavior change
- `Chore` — tooling, config, deps, scripts
- `Docs` — documentation only
- `Test` — tests only

**Body format** (use exactly these sections):
```
## 💡 개요
<what this PR does and why — 2~4 sentences>

## ✅ 작업 내용

- <concrete change 1>
- <concrete change 2>

## ⭐️ 성과

- <outcome or metric if measurable; omit bullet if nothing concrete>
```

**Rules:**
- Base branch is always `main`
- Title is Korean (type prefix is English, description is Korean)
- 개요 explains the problem and solution, not just what files changed
- 작업 내용 lists specific changes, one bullet per logical unit
- ⭐️ 성과 is optional — leave a single `-` if nothing measurable to report
- Do NOT add co-author tags or extra metadata

Draft the title and body, then create the PR immediately — do NOT ask the user for confirmation.

Run:
```
gh pr create --base main --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

Return the PR URL when done.
