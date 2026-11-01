# Agent guide

How we want code written here, and the rules this project can't afford to have broken.

**The code is the source of truth.** Commands are defined in [`package.json`](package.json) and
the layout is the filesystem. The README orients someone getting started and can lag behind — when
it disagrees with the code, the code wins and the README is a bug to fix.

## Hard rules

This app spends money on my Google Cloud account and its repo is public. Each rule below guards
one of those two facts.

- **No test reaches the network.** Real Google calls are billed, so make them only to verify a
  change or capture a fixture, and say when you did. `MOCK=1 npm run dev` serves canned travel
  times without calling Google.
- **Keep `/api/` behind the site password.** Every route there except `/api/login` must stay
  behind the check in `src/hooks.server.ts`, because each request spends the Google key.
- **No secrets, and no absolute home paths**, in code, config or fixtures. The Google key and site
  password live in `.envrc`, which is never read or committed. Google's Geocoding API takes its
  key in the query string, so never log those URLs.
- **Only publish addresses meant to be published.** Destinations are fine. An apartment I am
  considering is not, so it never goes in a fixture, test, commit or PR.
- **Ask before adding a dependency**, including a dev dependency. Prefer the standard library,
  then first-party code when it is simple to write, because supply-chain security is a pain.
- **Svelte 5 runes only.** Most Svelte in training data is Svelte 4, so look an API up with the
  Svelte MCP server rather than recalling it, and run `svelte-autofixer` on each Svelte file you
  write until it reports nothing.

## Claude Code plans

`.claude/plans/` holds a plan per multi-step feature currently in flight — the design, the
decisions behind it, and the PRs it breaks into. Each is named for its feature, so `ls` the
directory before starting a change and read one only when its name covers what you were asked
to do.

A plan is where the work was headed, not a spec. Where the code has since moved on, the code
wins — say so rather than following the plan into a design it already abandoned.

Plans are deleted, not archived. `/plan-advance` folds each landed PR back into its plan, and
the PR that lands the last one removes the file, so a plan here is always unfinished work.
`/plan-adopt` brings a plan mode plan in from `~/.claude/plans`, using a name that will route
correctly.

## Verifying a change

Run `npm run lint && npm run check && npm test` before saying a change works, however narrow the
change.

A change that typechecks but has not been run is not verified. Report what you actually ran; if
something is failing or you skipped a step, say so. A test that fails and then passes unchanged
is a flake: name it in your report, but don't stop to fix it unless asked.

Before committing, read `git status` and the diff for secrets, absolute home paths and private
addresses.

## General development principles

Context beats dogma: sometimes DRY is right, sometimes WET. Beyond that, the defaults we want
differ from an agent's defaults:

- **Solve it the simplest way.** Future needs are hard to predict; simple code is the easiest
  to refactor, so no premature generalization.
- **Keep the abstraction level a reader can hold**, about seven things at once: helper
  functions, whitespace, data structures.
- **Immutable by default**, and `map`/`filter`/`reduce` over an unconstrained `for` loop when
  they read better.
- **Make illegal states unrepresentable**: algebraic data types and `mode: 'walk' | 'bike'`, not
  `mode: string`.
- **Composition over inheritance; classes are often overkill**, and keep class-level state
  minimal.
- **Early returns**, so the main logic is not nested. **Extract pure functions** from impure
  ones; they are what tests reach easily.
- **Use `async`/`await`**, not promise chains.
- Don't bind a local that only renames something already named; inline the access instead. A
  local that names a computed value, or adds meaning, is fine. Tests get more slack for
  arrange-step locals.

### Comments

Prefer self-documenting code: a good name beats a comment explaining a bad one. What survives
that is worth a great deal, because it is what the code cannot say — a security invariant, a
subtle edge case, a quirk of the Google APIs. Write those, and give them the room they need.

The test is whether a reader could recover the fact from the code, the types, or the test name.
If not, write it. If so, the comment is a second copy of something that will drift.

- **Put it on the thing it explains** — the line, or the file header when it holds across the
  file. Not in a doc comment one level up.
- **Do not narrate the design of a function whose signature already shows it.** The shape to
  avoid is a summary line, a blank `*`, then a paragraph of rationale. Keep the summary; drop
  the paragraph.
- **Do not restate the test name above the test**, and skip prose that only reassures the
  reader.

### Docs

Our worry is not too few docs; it is docs that quietly stop being true.

- **A decision that one file enacts is documented on that file**, in a comment. Ask which file
  someone would have to edit to reverse the decision, and put the reasoning there.
- **The README covers what someone runs**, not how the build is wired.
- **Say it once, and briefly.** Never restate in prose what the code already states — no
  schemas, file trees or config values. Name the file that holds the fact instead.
- **Docs carry intent; code carries mechanism.** If a refactor that changes no behaviour would
  force you to edit a doc, that doc is describing mechanism — fix the doc.
- **Record rejected alternatives as one-liners** (`*Rejected: X because Y.*`), but only when
  someone is likely to relitigate the decision. **Mark anything unresolved `**Open:**`** so it
  is greppable.

### Testing philosophy

- We deeply value tests to make it easier for us to maintain and extend the app. Whenever
  adding new functionality, you should generally add tests.
- Keep tests fast and independent. Put the logic worth testing in pure functions, and keep Google
  behind a fake.
- Don't re-test something that already carries its own guarantee — the standard library, a
  dependency, or a leaf module with its own exhaustive tests. Test the integration point
  instead: does _this_ code call it correctly and handle the edges it exposes.
- **Fixtures are real data**: Google responses as the API returned them. Never invent one.
- Prefer `toEqual` over `toMatchObject`: a full equality check catches an unexpected field a
  partial match would silently let through. Fall back to a partial match only when the full
  value is noisy or irrelevant to what the test is checking.
- Cover the edge cases the source code actually branches on — empty/null/boundary inputs, error
  paths — not just the happy path.
- **The top-level `describe` names the subject**: the exported symbol or the component. **A
  nested `describe` names the situation**, so the path reads as a sentence. Never spell the
  group into the test title; two levels is the working depth.

## PRs and sizing changes

- We squash-merge PRs, so a PR can have as many commits as you want; it is the atomic unit of
  change.
- Keep PRs as small and focused as feasible. Smaller PRs are easier to review, easier to
  understand later, and better for `git bisect`.
- Use "prefactor" PRs where you can: they refactor the code in anticipation of a feature without
  adding it yet.

## Off limits

- Do not touch CI unless that is the task.
- Do not change the guardrails in `.claude/settings.json` unless that is the task.
- Do not commit secrets or read `.envrc`.
