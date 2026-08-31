<!-- dual-agent-workflow:start -->
## Dual-agent collaboration workflow

This project uses `.ai/TASK.md` and `.ai/RESULT.md` for local handoff between planning/review and execution agents.

### When asked to plan

- Inspect the project before drafting the task.
- Write the objective, scope, constraints, acceptance criteria, and required verification to `.ai/TASK.md`.
- Set its status to `READY`.
- Do not modify implementation files unless explicitly requested.

### When asked to execute

- Read this file and `.ai/TASK.md` before editing.
- Execute only a task whose status is `READY` or `CHANGES`.
- Preserve unrelated user changes and stay within the declared scope.
- Run the required verification.
- Write the implementation summary, changed files, exact verification results, known issues, and deviations to `.ai/RESULT.md`.
- Set the task status to `REVIEW`.
- Do not create a Git commit unless explicitly requested.

### When asked to review

- Read `.ai/TASK.md` and `.ai/RESULT.md`.
- Inspect the actual Git diff and relevant files; do not rely solely on the result report.
- Run verification proportionate to risk.
- Record `DONE` when accepted or `CHANGES` with concrete findings when revision is required.
- Do not implement fixes during review unless explicitly requested.

### Safety and ownership

- Only one agent should modify implementation files at a time.
- Never expose credentials, tokens, private keys, or production data in handoff files.
- Do not discard unrelated changes or use destructive Git commands.
- `.ai/` is local coordination state unless the project explicitly chooses to track it.
<!-- dual-agent-workflow:end -->
