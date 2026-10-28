# AGENTS.md: docs/

This file is the agent memory for all folders in `docs/`. The subfolders do not have their own `AGENTS.md` files (D-25).

## 1. Folder map

| Folder | Files | Stage |
|---|---|---|
| `00-standards/` | `ste100-writing-rules.md`: rules for all text, project technical names | All |
| `01-project/` | `project-charter.md`, `timeline.md`, `decision-log.md`, `tldr-summary.md` (plain summary), `uiux-moodboard-summary.md` (summary of the UI/UX team design), `presentation-plan.md` (5-minute S0 presentation, not in the Google Doc), `readiness-and-stage-plan.md` (prerequisites and stage plan) | S0, updated in all stages |
| `02-requirements/` | `functional-requirements.md` (FR), `quality-requirements-iso25010.md` (QR) | S0 |
| `03-architecture/` | `system-modules.md`, `offline-sync-design.md`, `network-infrastructure.md`, `data-model.md` | S0 |
| `04-uiux/` | Not created. Another team makes the UI/UX design. | S0 |
| `deliverables/` | Final DOCX, PDF, PPTX outputs and build sources (moved here by D-28). The files were lost in the move and restored from `OJT-Appdev-Project.zip` on 2026-10-25. `source/tc.json` is a generated file and git ignores it. | All |
| `05-testing/` | `test-plan.md`, `test-cases.md`, `defect-log.md`, `reports/` (stage test reports: `stage-test-report-template.md`, `S0-test-report.md`, `S1-test-report.md` (draft), `S2-test-report.md` (gate not passed yet)) | All |
| `06-user-docs/` | `how-to-run-guide.md`: how to install and use the test version, for non-technical users (first version, S2). Later: user manuals, install guide, developer setup, API reference. | S5 |
| `07-operations/` | `free-tier-operations-runbook.md`: keep-alive, backups, resume, rebuild | S1, then all stages |

Create a folder only when its first file is ready.

## 2. Rules for all documents

1. Write each document in Markdown and in ASD-STE100. Read `00-standards/ste100-writing-rules.md` first.
2. Each document starts with a title and a short purpose statement.
3. Use Mermaid for diagrams. Make sure that each diagram renders after a change.
4. Do not keep a second copy of a document in another folder.
5. When you use a new technical name, add it to the list in `ste100-writing-rules.md`.

## 3. Rules for each folder

### 01-project

1. When the user answers an open question (Q-NN), write the answer in the charter, section 7. If the answer changes the plan, add a decision and update the affected documents.
2. Do not delete a decision. To change a decision, add a new decision and write "Replaced by D-NN" in the old one.

### 02-requirements

1. Each requirement has one ID, one testable statement, and one MoSCoW priority.
2. Use "must" for Must, "should" for Should, and "can" for Could.
3. When you add or change a requirement, update the test cases and the traceability table in `05-testing/test-cases.md`.

### 03-architecture

1. Read `offline-sync-design.md` before you change a repository, the outbox, the sync engine, or a sync function.
2. If the code must differ from these documents, write a decision first. Then update the document.

### 05-testing

1. Before you start a stage, read `test-plan.md`, sections 7, 8, and 15.
2. Each automated test name starts with its test case ID.
3. A new test case uses the next free number for its level and module. Update the count and the traceability table in `test-cases.md`.
4. Record each failed test in `defect-log.md` before you fix the fault.
5. At the end of a stage, copy `reports/stage-test-report-template.md` to `reports/S<n>-test-report.md` and complete it. Write only real results.

### 07-operations

1. Do not remove or change a keep-alive source without a decision.
2. Do not put secrets in this folder.
3. When you change the schema, the Auth settings, or the Edge Functions, make sure that the rebuild procedure (runbook, section 5.2) still works.

## 4. Shared documents (Google Drive)

Final outputs go to the project Google Drive folder (see root `AGENTS.md`, section 7). The Markdown files in this folder are the source. Drive contains only the final files of the current revision batch.

The primary file is the Google Doc "OJT-DTR - System Documents - Rev <n>" (D-27). When you change a source file, update the matching tab.

| Tab | Source |
|---|---|
| Home | Cover and tab guide (`docs/deliverables/source/build.js`, cover part) |
| TL;DR (plain summary) | `01-project/tldr-summary.md` |
| 1. System Overview | `build.js` (overview part), from `03-architecture/system-modules.md` |
| 2. Modules and Features | `build.js` (modules part), from `03-architecture/system-modules.md` |
| 3. Network Infrastructure | `build.js` (network part), from `03-architecture/network-infrastructure.md` |
| 4. Requirements | Summary from `build.js`, then `02-requirements/functional-requirements.md` and `02-requirements/quality-requirements-iso25010.md` |
| 5. Test Plan | `build.js` (test plan part), from `05-testing/test-plan.md` |
| 6. Test Cases | `05-testing/test-cases.md` (landscape pages for this tab only) |
| 7. Offline Sync Design | `03-architecture/offline-sync-design.md` |
| 8. Data Model | `03-architecture/data-model.md` |
| 9. Project Plan | `01-project/project-charter.md` and `01-project/timeline.md` |
| 10. Decision Log | `01-project/decision-log.md` |
| UI/UX Mood Board | `01-project/uiux-moodboard-summary.md` and `docs/deliverables/source/uiux-moodboard.jpg` |

To make the HTML for a tab, run `docs/deliverables/source/md2html.py`. Set the `MMDC` environment variable to the Mermaid CLI command to render Mermaid diagrams as images.
