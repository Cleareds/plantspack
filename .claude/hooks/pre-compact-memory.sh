#!/bin/bash
# PreCompact hook — fires before Claude Code compacts the conversation.
#
# Emits an instruction via hookSpecificOutput.additionalContext that nudges
# Claude to write a session summary to the auto-memory directory, so the
# next session can pick up context without the full scrollback.

set -euo pipefail

MEMORY_DIR="/Users/antonkravchuk/.claude/projects/-Users-antonkravchuk-sidep-Cleareds-plantspack/memory"
TODAY="$(date +%Y-%m-%d)"

# Read and discard stdin (the session-id + compaction metadata payload).
cat >/dev/null

read -r -d '' INSTRUCTION <<INSTRUCTION_EOF || true
Compaction is about to happen. BEFORE compaction, save a session summary to ${MEMORY_DIR}/session_${TODAY}.md so the next session can pick up context.

Use this exact shape (markdown + frontmatter):

---
name: Session ${TODAY}
description: Session recap from ${TODAY} — shipped work, pending items, corrections
type: project
---

## Shipped this session
- commit SHA + one-line summary for each notable commit

## Pending or open questions
- anything still in-flight or waiting on user input

## Corrections from user (behavioral)
- only if the user corrected your approach — future sessions reference this to avoid repeats

## Surprising findings
- DB quirks, failed approaches, non-obvious behavior future-you should know

Then add ONE line to ${MEMORY_DIR}/MEMORY.md pointing to the new file:
- [Session ${TODAY}](session_${TODAY}.md) — one-sentence hook

Keep the file under ~150 lines. Focus on what future-you needs, not exhaustive history. If session_${TODAY}.md already exists overwrite it with the merged picture.
INSTRUCTION_EOF

jq -n --arg instruction "$INSTRUCTION" '{
  hookSpecificOutput: {
    hookEventName: "PreCompact",
    additionalContext: $instruction
  }
}'
