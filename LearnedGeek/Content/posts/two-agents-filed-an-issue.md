I want to write about something unusual that happened over a week of dogfooding. I built a feature, ran it, watched it fail in a way I didn't anticipate, and then two AI agents working on two different projects filed a GitHub issue against me, collaboratively, that diagnosed the failure correctly and proposed both a patch fix and an architectural reframe. The tool that produced the failure is [claude-recall](/Blog/Post/claude-recall-agent-memory-for-claude-code).

## The feature was a thematic-mining substrate

claude-recall began life as a per-prompt recall layer for Claude Code. You ask the agent something, the SessionStart hook auto-injects relevant prior context from your archived sessions, the agent produces an answer that's continuous with what you decided last week. v0.6 stabilized this; v0.6.5 made the diagnostic surfaces honest enough that the existing failure modes were visible instead of silent.

v0.7 added a second use case I'd been thinking about for a while: thematic mining. The same embedding store that powers per-prompt recall could also be clustered. If you ran agglomerative clustering on the cosine similarity space across every embedded message, the resulting clusters would represent recurring threads you'd worked on. Score those clusters by `cluster_size × project_count` and the top of the list should be themes that recurred across multiple projects, ideal candidates for blog topics, since the cross-project recurrence is itself a signal that the topic was worth thinking about more than once.

The implementation was a single new subcommand: `claude-recall topics --limit 30`. I shipped it on a Sunday evening, tested it on synthetic fixtures, all 197 tests green, push to PyPI, ran it against my real archive (about 50,000 messages across 22 projects). The whole thing finished in 17 seconds.

The output was almost entirely useless.

## What "useless" looked like

The top ten clusters by score were:

1. `opened / ide / file` (size 993)
2. `user / summary / added` (size 928)
3. `check / let / verify` (size 889)
4. `warmup / add / fix` (size 649)
5. `public / apicombatgame / string` (size 714)
6. `update / add / changes` (size 708)
7. `files / read / file` (size 549)
8. `build / compiles / verify` (size 563)
9. `crewtrack / tests / src` (size 578)
10. `patterns / pattern / existing` (size 437)

If you've used Claude Code, you can read most of those without me telling you what they are. Cluster #1 is `<ide_opened_file>` notifications, where the IDE wraps the user's "you opened a file" event into a structured tag and embeds it as a message. Cluster #2 is the auto-summarization trigger that fires when context gets long. Cluster #3 is agent self-narration: "Let me check," "I'll verify," "Now I will." Cluster #5 is verbatim quoted source code that an assistant message included from a tool result.

None of these were anywhere close to "topics worth writing about." Real topics like `paper / ani / research`, `memories / memory / retrieval`, and `migration / schema / migrations` only appeared past rank 25. The tool's documented workflow asked you to lower `--min-cluster-size` and compare time windows to drill in, but those steps assume the candidates the tool generates are real candidates. Mine were process noise from the protocol layer of the conversation, not topical content.

I posted the symptom to the project repo and went to bed expecting to spend the next morning thinking through it.

## The dual-Claude file

What I found in the morning was issue [#27](https://github.com/LearnedGeek/claude-recall/issues/27), titled *"topics: cluster labels dominated by conversational mechanics, not topical content."* The body was a clean diagnosis with concrete numbers (~6/50 useful clusters in real-world output). It identified the structural fix (filter wrapper-tag content categorically before clustering) and explicitly rejected the obvious-looking-but-wrong fix (a register-specific stoplist of "let," "check," "verify," etc.) on the grounds that stoplists never converge across registers. The architectural reasoning matches the [tools-must-never-touch-user-config principle](/Blog/Post/tools-must-never-touch-user-config) at a different layer: solve identification structurally rather than by enumerating special cases.

It also had two comments. The first was an architectural reframe: the patch fixes were correct but addressed symptoms, not the design mistake underneath. The deeper mistake was that `topics` operated on undifferentiated message content. Messages aren't one substance. They're at least three kinds, namely *thought* (real reasoning), *procedural* (agent narration of what it's doing), and *harness* (system-injected wrappers), and a different query wants a different kind. The right design is *classify content kind at index time, build view-appropriate query surfaces.*

The second comment was a hardening pass on the spec. It added empirical verification, enumerated the wrapper-tag patterns that mattered, identified a *fourth* content kind I hadn't named (TOOL_RESULT_EMBEDDED, the C# code dump in cluster #5), and sequenced the fixes (categorical filter first, then re-tune the IDF threshold against the post-filter distribution). It also bumped the severity from Medium to High.

The issue body was filed by what I think of as ANI Claude, the Claude Code instance I work with on the ANI Runtime project. The hardening comment was filed by what I think of as LearnedGeek Claude, the instance I work with on this blog. Both instances had access to my full claude-recall archive across both projects (because that's what the tool does), and both had recently been running the broken `topics` command and seen the same failure mode I had.

I didn't ask either instance to file an issue. They both did it independently, then refined each other's work in the comment thread. Two AI agents working on different projects, on the same tool I built for myself, jointly producing a ready-to-implement spec better than either would have produced alone, because the cross-project diversity gave them complementary diagnostic surfaces.

That's the part I don't have great precedent for. The narrow framing is *"AI agents collaborated to file an issue."* The wider framing is *"this is what dogfooding looks like when the dogfooders themselves are agents and they have memory."*

## The architectural move was tier separation

I shipped the fix that night. v0.8.0 added a `content_kind` column to the messages table with a v3 schema migration, classified every message in the corpus on first open after upgrade (~50,000 rows in under a second), and filtered the topics query to `content_kind = 'THOUGHT'`. The four kinds:

- **THOUGHT**: user prompts, agent substantive reasoning, design discussions, analysis
- **PROCEDURAL**: agent narration ("Let me check," "Now I'll," "Need to add"), build-cycle status, tool-call announcements
- **HARNESS**: system wrappers (`<ide_opened_file>`, `<task-notification>`, `<system-reminder>`, `<user-summary>`, `<analysis>`)
- **TOOL_RESULT_EMBEDDED**: assistant messages dominated by quoted code or data tokens

The classifier is a small Python module (regex and string-prefix work, microseconds per message) that runs at index time. The `topics` subcommand now queries `WHERE content_kind = 'THOUGHT'` by default. The `search` subcommand grew a `--kind` flag.

On the same 50,000-message archive, the new top ten contained four genuinely topic-bearing labels. Past the top 10, the previously-buried real topics surfaced: `memories / memory / retrieval` jumped from rank 30 to rank 11. `paper / ani / research` jumped from rank 27+ to rank 11. LG Claude audited the v0.8.0 output. The summary line was *"the pre-fix top-30 had ~3 topical clusters; the post-fix top-30 has ~24."* Same archive, same query, same scoring formula. The difference was that the input set was 27,000 thought-tier messages instead of 50,000 mixed-substrate messages, and the IDF math finally had distinctive signal to work with.

But the architectural move underneath wasn't new to me. I'd already deployed the same pattern in a completely different project the month before, and the only reason I noticed the connection was that one of the agents that filed the issue had been part of the work that produced the original. That cross-project pattern transfer is its own thing, and I [tell that story separately](/Blog/Post/tier-separation-pattern-three-projects).

## What still doesn't work

I'd be doing the optimistic-marketing thing if I left it there, so let me be specific about what's still rough.

The classifier in claude-recall is empirical. The HARNESS patterns are well-bounded since wrapper tags are structurally identifiable, but the PROCEDURAL openers are a pragmatic list of common agent-narration phrases. After v0.8.0 shipped, LG Claude audited and flagged a residual cluster ("warmup / canvas / register," size 616) that had escaped the classifier. I added more openers in v0.8.1 ("Now adding," "Need to add," "Perfect! Now"), and the cluster shrunk to 583 messages. I dug into the residual content and found that those 583 are actually mostly substantive. The cluster was being labeled by TF-IDF picking up a few outlier sentences that happened to contain those code symbols, while the bulk was real long-form assistant content clustered by embedding similarity. That's not a classifier problem; it's a cluster-labeling problem, and it's a separate v0.9 concern.

The deeper limitation is that any classifier with empirical pattern lists will need iteration as new registers surface. A user who indexes a cooking-conversation archive will produce content with a different procedural register that my current PROCEDURAL openers don't catch. The right answer there isn't to extend the list with cooking verbs, since that's the stoplist trap the issue body explicitly rejected. The right answer is the same architectural move at the next level: identify "domain-procedural register" as its own classifier surface, give the user a way to extend it, document the pattern.

I also want to flag the meta-risk in this pattern of writing. The optimistic-marketing version of this story is *"AI agents help me build better tools."* The version I'd rather you take away is *"the tools I build are evidence of patterns I'm tracking across projects, the agents have access to that evidence, and the loop is getting tighter."* The interesting question isn't whether AI helped me find a bug. It's what kind of work becomes possible when the agents working on a problem share access to the substrate of all the problems you've worked on, and how that changes the cost of cross-project pattern-spotting.

## Where this goes

claude-recall v0.8.4 (the version live on PyPI as I write this) ships the four-kind classifier, the THOUGHT-only filter on `topics`, the `--kind` flag on `search`, and a `reclassify` subcommand for users upgrading from earlier v0.8.x releases. It's `pip install --upgrade claude-recall` for anyone already using it.

For the architectural-pattern angle that this post deliberately doesn't develop, see [The Tier-Separation Pattern in Three Projects](/Blog/Post/tier-separation-pattern-three-projects). For the news-anchored framing, see [The Context Window Isn't the Memory Problem](/Blog/Post/the-context-window-isnt-the-memory-problem).

If you've thought about this kind of dogfooding-with-agents loop, or seen it in another domain, I'd genuinely want to hear it.
