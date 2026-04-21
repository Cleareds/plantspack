---
name: next-task
description: Queue a new task at the top of the session's todo list. Invoke via /next-task <description>, or writing "Next task: <description>" in a normal message (matched by CLAUDE.md instruction).
---

# next-task

Adds `$ARGUMENTS` as a **new high-priority task** at the top of the session's todo list. Use when the user wants to queue something without interrupting whatever is currently in-progress.

## What to do when invoked

1. Call `TaskCreate` with:
   - `subject`: a concise imperative title derived from `$ARGUMENTS` (first clause, ≤ 8 words)
   - `description`: the full `$ARGUMENTS` verbatim, so later-you has all the nuance the user wrote
   - `activeForm`: a short present-continuous form
2. Immediately call `TaskUpdate` to set the new task's `addBlocks` list to every other `pending` task id. This pushes the new task to the top of the execution order — any task that was waiting will now be marked as blocked by this one until it completes.
3. If a task is currently `in_progress`, **do not interrupt it** — tell the user you've queued the new task and it'll start as soon as the current one wraps. If nothing is in progress and the user's message implies they want you to start now, mark the new task `in_progress` and begin.
4. Confirm in one sentence: `Queued: <subject>. Will start <now | after current task>.`

## Multi-task parsing

If `$ARGUMENTS` contains multiple tasks separated by either:
- a literal `\n` newline,
- the phrase `Next task:` appearing again mid-string,
- bullet list markers (`- `, `* `, `1. `),

split them and create **one task per item**, each blocking the next so they execute in the order written.

## Examples

User types: `/next-task Fix the broken favicon on mobile safari`
→ Create a task `Fix broken favicon on mobile Safari`, block other pending tasks behind it, respond `Queued: Fix broken favicon on mobile Safari. Will start after current task.`

User types: `Next task: Deal with the broken packs link on /profile/contributions`
→ Same flow. The parent CLAUDE.md instruction recognizes the `Next task:` prefix and invokes this skill.

User types multi-line block:
```
Next task: Slim the profile page.
Next task: Fix home page flash on pinned city.
```
→ Create two tasks in order. First blocks second. Both block all other pending tasks.
