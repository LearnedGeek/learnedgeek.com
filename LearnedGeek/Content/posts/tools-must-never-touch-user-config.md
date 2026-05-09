A user of [claude-recall](/Blog/Post/claude-recall-agent-memory-for-claude-code) asked me a question last week that turned out to be the most important question in the project's design history. It looked harmless: *"Is the expectation that I manage my own hook and remove anything I've added? We wouldn't want to be messing with things that users added specifically as that's a bad experience, no matter how closely they appear to what we're adding."*

The right answer to that question is *yes, that's exactly the expectation, and yes, it's an absolute rule.* claude-recall does not, and structurally cannot, touch a hook command it didn't emit, no matter how similar that hook looks to one of ours. This sounds like a polite design preference. It's actually the load-bearing constraint that determines whether tools that manage user configuration are usable.

## Why this matters more than it seems

Lots of dev tools auto-edit user config files: linters with `--fix` modes, formatters that "tidy" imports, framework scaffolders that regenerate config on each run, CLI tools that wire up integration files. claude-recall is one of these, since its `init-hooks` subcommand writes to `.claude/settings.json` to register hooks Claude Code can fire.

The pattern that goes wrong, over and over, is some version of this:

1. The tool emits its own configuration into a shared file.
2. The user customizes the file by adding their own keys, their own commands, their own rules.
3. The tool runs again later (upgrade, refresh, regenerate) and "tidies" the file.
4. The user's additions disappear silently.

Every time this has happened to me, the failure was identical in shape: the tool was trying to be helpful and didn't have a reliable way to distinguish "things I emitted earlier" from "things the user added since." So it took the conservative-looking-but-actually-destructive approach of rewriting the parts it recognized and dropping the parts it didn't. I've watched a linter delete a TypeScript path alias I'd added by hand, a framework's `init` command overwrite a custom route, and an early version of claude-recall itself wipe a user's time-injection hook on what should have been a routine maintenance command (filed [as issue #20](https://github.com/LearnedGeek/claude-recall/issues/20)). The tool's intent in every case was correct. The implementation kept biting users in the same way.

## The fix is structural, not procedural

The instinct here is to solve the problem with care: better heuristics, smarter pattern-matching, more conservative defaults. *"We'll only delete keys that match our naming convention."* *"We'll only rewrite blocks bounded by these specific markers."* *"We'll diff against the last-known-good version."*

These work until they don't. Naming conventions get violated when users prefix their own keys with similar names. Pattern-matching breaks when the tool emits inline expressions that don't reference any of its own paths. Diffs get out of sync when the user reformats by hand or runs the tool from a different version.

The pattern that actually works is structurally simpler: *embed a marker in everything you emit, and define your "is this mine?" check as "does the marker appear in this string."* User-added content is anything without your marker, and by construction, you never modify it.

In claude-recall's specific case, the marker is the literal string `[claude-recall managed]`, embedded in every hook command we emit:

```powershell
$null = '[claude-recall managed]'; @{hookSpecificOutput = ...}
```

The `$null = '...'` is a discarded variable assignment, since PowerShell evaluates and throws away the result. Zero execution side-effect, but the string is in the command, scannable by our identification function, obvious to anyone reading the settings file. For the binary invocation we use a flag the binary silently ignores: `claude-recall-hook.exe --__cr-managed`. Same idea.

The strip function becomes one-line correct:

```python
def is_claude_recall_command(command: str) -> bool:
    return "[claude-recall managed]" in command
```

That's it. No filename heuristics. No path-matching. No version-dependent fragment lists. If the marker is present, it's ours and we own its lifecycle. If the marker is absent, the user put it there and we don't get to touch it.

## What this enables that nothing else does

The cleanest demonstration of why this matters: claude-recall lets users opt into having a sibling time-injection hook managed alongside our own (`[hooks].inject_time = true` in the config). When that flag flips on, we add the hook with our marker. When it flips off, we remove it on the next refresh. Anyone who manually composes their own time-injection hook gets exactly the right behavior: their hook stays, every cycle, every refresh, forever, because it doesn't have our marker. If they then flip our flag on, the result is two time hooks in their config, both running, both injecting context. The user notices the duplicate output and decides which to keep.

That last point is the one most tools get wrong. When you see "the user has a hook that does almost the same thing as ours," the instinct is to dedupe. Don't. You can't safely know they're meant to be the same. Maybe the user wrote a richer version. Maybe they're testing both. Maybe they don't realize one is automatic. Whichever, *let both run*. The user will notice the duplicate output and resolve it deliberately. That is the correct kind of "loud problem," meaning visible, reversible, and low-stakes, and it preserves user intent against your incomplete model of what they want.

The principle generalizes to any tool that writes to a file the user can also edit: emit a marker on every line or block you own, and treat unmarked content as untouchable. The marker can be a `// @generated by <tool>` header, a bracketed `# managed by <tool>` comment, an explicit start/end region, whatever the file format supports. The shared insight is that ownership isn't a property of the file. It's a property of the lines. And the only reliable way to track that property is to put it directly on the lines themselves, embedded in the format the tool already understands.

## What I'm still nervous about

There's one ambiguous case the marker pattern doesn't handle: the user manually edits one of *my* marked commands. Now the marker is on a line that's no longer purely mine. If I refresh the marker-laden command on the next `--force`, I overwrite their edit. claude-recall does that today, on the assumption that someone editing a tool-marked line knows the tool will regenerate it. It's defensible but not perfect. Supporting user-edits-to-managed-commands cleanly would need a hash of the original emitted content stored alongside the marker, with the refresh path checking "has this been edited since I emitted it?" That's more complex and I haven't built it. The current trade-off is implementation simplicity over adoption-friendliness, and I'm fine with it for now.

The smaller operational concern: if you ever change the marker string, every previously-emitted command becomes unrecognized. Either keep marker stability across versions or maintain a fallback list of historical markers. claude-recall does both.

## The principle, said plainly

If your tool writes to a file the user can also edit, you owe the user a guarantee that you will never silently destroy their additions. The way to make that guarantee is structural, not procedural: mark what you emit, treat unmarked content as untouchable, and make duplicates visible rather than dedupe-on-guess. Tools that follow this rule are tools you can install without anxiety. Tools that don't are tools you keep at arm's length, run once on a scratch project, and never let near anything you actually care about. The difference between the two categories is a single architectural decision made early.

This is the same architectural reasoning that drove [content-kind tier separation in the topics command](/Blog/Post/two-agents-filed-an-issue), in case you want to see the principle applied at a different layer of the same project. The shape recurs whenever a system needs to identify "what's mine vs. what came from somewhere else" and the cost of getting it wrong is destructive.

---

*Filed as an idea draft on April 29, 2026, after [claude-recall v0.6.8 shipped marker-based identification](/Blog/Post/claude-recall-agent-memory-for-claude-code) the same week. The specific example is from claude-recall's evolution; the principle isn't.*
