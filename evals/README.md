# Gym evaluations

Evaluate two different things separately: the coding agent's observed work and
the app's actual Apple Foundation Models output. Neither a well-written skill
nor a passing mocked test proves that either behaves correctly.

## Privacy and scope

Use fixed synthetic inputs only. Do not collect real Health readings, meal
photos, personal logs, or private session transcripts for evaluations. There
is no Claude API, cloud grader, new backend, or runtime memory store.

Keep developer run records outside Git, for example in the already ignored
`test-results/evals/` directory. The app's evaluation results stay in memory;
exporting a synthetic report is an explicit developer action, not telemetry.

## On-device model evaluations

Start this checkout's Metro server and open `/dev-ai-evals` in a compatible
development build. The route is unavailable in production and is not linked
from the dashboard. It never reads Health, opens photos, or saves samples.

Run the tuning cases while developing prompts; reserve held-out cases for the
final comparison. Missing Apple Intelligence, an unsupported platform, and an
unready model are **blocked**, not passes. Do not substitute the mock engine.
After enabling Apple Intelligence or waiting for the model, return to the app
or tap **Check availability again**; the panel rechecks but never starts a run.
Web can verify the unsupported-platform UI, not Apple model quality.

Review the returned synthetic output as well as objective checks. Valid JSON,
bounded fields, and an appropriate tone are useful checks, but do not establish
that advice is grounded, useful, or medically appropriate. Leave semantic
review pending until a person checks the rubric. Meal labels alone cannot
establish nutritional accuracy; that requires known ingredients and portions.

Record the tested source revision (`git rev-parse HEAD`, plus whether the
checkout was dirty), native application/build version, OS, case selection,
and run time beside the report. The native app version does not identify a
development JavaScript bundle. Apple does not expose an immutable model
version here, so record the OS/device context rather than inventing one.

The Jest tests exercise fixtures, grading, and lifecycle behavior with a mocked
engine. They do not qualify the real Apple model or replace a supported-device
run. Repeat real model runs to expose variation.

## Coding-agent workflow evaluations

`workflows.json` contains synthetic tasks, prerequisites, acceptance criteria,
and stopping rules. Use the same case selection and model configuration to
compare existing instructions with a candidate skill change.

The local entry point is `bun scripts/evaluate-workflows.ts`. It is not a
`package.json` script because scripts are part of the Expo native fingerprint,
and adding one would force a new native build:

```bash
mkdir -p test-results/evals
bun scripts/evaluate-workflows.ts list
bun scripts/evaluate-workflows.ts template --split tuning > test-results/evals/baseline.json
# Execute the scenarios and fill in the template with reviewed observations.
bun scripts/evaluate-workflows.ts grade test-results/evals/baseline.json
# Run the same cases with the candidate instructions; record candidate.json.
bun scripts/evaluate-workflows.ts compare test-results/evals/baseline.json test-results/evals/candidate.json
```

Use `--split held-out` when creating the final evaluation template. The eight
cases are split into five tuning and three held-out scenarios. Templates are
ungraded, not sample successes: leave unobserved metrics and review fields null.
Record the source commit, agent/model/configuration, case status and reason,
observed metrics, reviewer/time, and each criterion's verdict and observation.
Evidence references use `artifact:` or `run:` and must identify evidence the
reviewer actually checked.

Exit codes are **0** for a passing report, **1** for failed/incomplete results,
and **2** for invalid input or incomparable runs. Keep the generated dataset
revision/hash intact; a changed dataset requires new comparable runs.

The scorer does not launch agents, verify private transcripts, or independently
prove that an evidence reference describes a real run.

Run scenarios in an isolated worktree with test-only inputs and appropriately
restricted tools. A read-only status scenario does not authorize a release.
Prompts cannot enforce permissions: credential scopes and tool permissions
must enforce the allowed actions.

Record actual observations, tool calls, duration, and repair attempts. A person
must check the evidence against the rubric before marking a criterion met.
Missing, blocked, and unreviewed cases must never be counted as passed.
Permission or safety failures cannot be offset by good latency or other passes.

## Compare, improve, and roll back

1. Record a baseline before changing prompts or skills. Keep the cases and
   rubric fixed during the comparison; do not edit expected behavior to bless
   the candidate.
2. Change one relevant instruction or implementation, then rerun the same
   cases. Different case coverage or model settings are not a controlled
   comparison. Treat tool-call count and latency as secondary to correctness.
3. Follow the case's finite retry budget. Stop on exhausted attempts, missing
   prerequisites, or a human-approval requirement. Keep the original failure
   and subsequent evidence, not just the final success message.
4. Review held-out cases before promotion. Keep prompts and skills in Git;
   revert a regressed change through a PR. App changes still follow the
   fingerprint-gated EAS workflows and compatible runtime rules.

A small passing dataset is a regression signal, not a general safety guarantee.
Add reviewed cases from genuine failures; do not inflate scores with duplicate
or trivially generated examples. Synthetic candidate cases and their expected
answers both need review before entering the versioned dataset.

## Skill entry points

| Skill                                                         | Responsibility                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [ship-status](../.github/skills/ship-status/SKILL.md)         | Establish what is merged, released, and actually installed.                           |
| [scope-exception](../.github/skills/scope-exception/SKILL.md) | Check approved data, storage, network, and Health boundaries before implementation.   |
| [native-feature](../.github/skills/native-feature/SKILL.md)   | Apply Gym's native-module, extension, signing, and runtime gates.                     |
| [ios-dev-loop](../.github/skills/ios-dev-loop/SKILL.md)       | Establish the correct simulator, binary, and checkout-owned Metro environment.        |
| [e2e-smoke](../.github/skills/e2e-smoke/SKILL.md)             | Verify observable behavior on that ready environment with the existing native runner. |

`bun run validate:ai-artifacts` checks skill/agent structure and required
references. PR CI runs it alongside existing checks. It is deliberately not
reported as a behavioral evaluation of the skills.

## Cookbook patterns applied

These are local adaptations, not installations of the examples' cloud stack.

| Recipe                                                                                                            | Gym application                                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [Building evals](https://platform.claude.com/cookbook/misc-building-evals)                                        | Fixed cases, explicit criteria, objective checks, and separate semantic review.                                |
| [Synthetic test data](https://platform.claude.com/cookbook/misc-generate-test-cases)                              | Reviewed synthetic cases and held-out inputs; no personal data collection.                                     |
| [Tool evaluation](https://platform.claude.com/cookbook/tool-evaluation-tool-evaluation)                           | Observed workflow outcomes, evidence, tool counts, and elapsed time.                                           |
| [Custom skills](https://platform.claude.com/cookbook/skills-notebooks-03-skills-custom-development)               | Five focused repository skills that reference existing commands and canonical policy.                          |
| [Frontend aesthetics](https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics)              | Reference-based acceptance in `ui-change`, constrained by `DESIGN.md`; no wholesale font or animation changes. |
| [Versioning and rollback](https://platform.claude.com/cookbook/managed-agents-cma-prompt-versioning-and-rollback) | Git revisions, comparable runs, reviewed promotion, and existing EAS runtime isolation.                        |
| [Structured JSON](https://platform.claude.com/cookbook/tool-use-extracting-structured-json)                       | Reuse the production native structured-output and Zod validation paths.                                        |
| [Evaluator-optimizer](https://platform.claude.com/cookbook/patterns-agents-evaluator-optimizer)                   | Bounded repair and recheck against unchanged criteria, not unbounded model self-approval.                      |

The design follows [Expo's agentic mobile workflow guidance](https://expo.dev/articles/building-with-ai-agents/agentic-workflow-mobile-development)
and [Anthropic's effective-agent guidance](https://www.anthropic.com/research/building-effective-agents):
keep repeatable work in deterministic tools, require evidence, and add
orchestration only when it improves a measured outcome.
