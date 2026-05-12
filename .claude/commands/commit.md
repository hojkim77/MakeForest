Run `git diff --staged` and `git status` to understand what's changed, then draft and execute a commit following this convention exactly:

**Format:** `<prefix>(<domain>): <message>`

**Prefixes:**

- `feat` — new feature
- `fix` — bug fix
- `refactor` — restructure without behavior change
- `chore` — tooling, config, deps, scripts
- `docs` — documentation only
- `test` — tests only
- `style` — formatting, no logic change

**Domain examples:** `timer`, `map`, `panel`, `auth`, `cron`, `db`, `redis`, `types`, `web`, `server`

**Rules:**

- One line, English only
- No co-author tag
- No trailing period
- Imperative mood ("add", "fix", "remove" — not "added", "fixes")
- If nothing is staged, run `git add -p` guidance or ask user what to stage — do NOT `git add .` automatically

**Splitting commits:** If staged changes span clearly separate concerns (e.g., a bug fix mixed with a new feature, or changes across unrelated domains), split into multiple commits — one per logical unit. Only split when the concerns are genuinely independent; don't split for the sake of it.

After drafting the message(s), show the full commit plan to the user and ask for confirmation before running anything.
