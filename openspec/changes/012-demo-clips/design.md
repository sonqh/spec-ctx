# Design

## Goals / Non-Goals

**Goals:**
- A reader who knows neither OpenSpec nor spec-ctx reads the first screen and can say what both are.
- Each clip shows one command. The reader can pause between clips and read the words.
- The six SVGs together stay under 400 kB.

**Non-Goals:**
- A narrated video. SVG clips render on GitHub with no player.
- New engine output.

## Decisions

- D1 Clips. `record.sh` runs one asciinema recording per step on the same temp project, in order. Files: `docs/demo/clips/1-adopt.svg` to `6-handoff.svg`, with the `.cast` beside each. Each clip types the command at 0.02 seconds per character. Then it runs the command and holds 1.5 seconds. No caption inside the clip. The README text is the caption. Each clip stays under 7 seconds. `loop.txt` holds the six transcripts in order, with the heading of each step as a comment line.
- D2 README top, in this order. The exact text follows. Line 3 is the tagline from 011. Then:

  `For teams that run Claude Code, Codex, or Cursor on an OpenSpec project.`

  `## What OpenSpec is`

  `[OpenSpec](https://github.com/Fission-AI/OpenSpec) is a folder named openspec/ in your repo. It holds specs, the rules your software must follow, and changes. A change holds a proposal, a design, and a task list. A coding agent reads them and works down the list.`

  `## The problem` with the three 011 bullets.

  `## What spec-ctx adds` with the 011 table.

  `## See it work` with the line `Six commands on a small project. Each clip is one command.` and six sub headings:

  `### 1. Give every requirement an ID`
  `OpenSpec names a requirement by its header text. A reword breaks every link to it. adopt gives each requirement and scenario an ID that stays. Run it once on a project that has specs. A new project gets IDs from init --all.`
  `You see: the dry run prints each header and the ID it gets. Then adopt writes them.`

  `### 2. Where are we`
  `status shows the open change, the task counts, and the next command to run.`
  `You see: one change, two tasks done, one open, and the hint.`

  `### 3. What is next`
  `task next picks the first open task. It prints the requirement IDs the task cites and the Verify command, the shell command that proves the task is done.`
  `You see: task add-mfa/1.3, its requirement, and grep -q totp src/login.ts.`

  `### 4. Only the spec this task needs`
  `task start prints the requirement, its scenarios, the task line, and the test that covers it. Nothing else. The last line is the size of that bundle next to the size of all spec text.`
  `You see: 711 characters, 3.6 percent of the tree. The agent reads this instead of the tree.`

  `### 5. Done means Verify passed`
  `task done runs the Verify command. On exit 1 the box stays open. On exit 0 the box flips to [x] and an evidence file records the files that were checked. The agent cannot tick the box by hand.`
  `You see: a red refusal, the edit, then a green done line.`

  `### 6. Hand off to the next session`
  `handoff write puts the state in one file: the change, the done tasks, the current task, and the open questions. The next session starts from it.`
  `You see: the head of .ctx/handoff.md.`

  Each sub heading has its SVG between the two paragraphs. Code spans in the text above are plain here and become backticks in the README.

- D3 The rest of the README stays as in 011. The sections, in order: Quickstart, How it finds the context, The life cycle for agents, Install, Two paths, Commands. Then Config reference, Markdown linters, GitHub Action, Measured, Status, Contribute, License. The old `## Demo` section goes away.
- D4 Tests. `demo.test.ts` checks six SVG files, their total size under 400 kB, each cast under 7 seconds, and the six headings in `loop.txt`. `readme.test.ts` checks the new order. It also checks that each `### <n>.` heading has an SVG link after it.

## Risks / Trade-offs

- Six SVGs load six fonts. GitHub caches them, and each clip is small.
- The numbers 711 and 3.6 in the step 4 text come from the recording. The demo test checks that the footer line in `loop.txt` matches the README text. A new recording that changes them fails the test until someone updates the text.

## Open Questions

None.
