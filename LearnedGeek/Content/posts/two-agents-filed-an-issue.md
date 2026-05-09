I want to write about something unusual that happened over a week of dogfooding. I built a feature, ran it, watched it fail in a way I didn't anticipate, and then two AI agents working on two different projects filed a GitHub issue against me, collaboratively, that diagnosed the failure correctly, proposed both a patch fix and an architectural reframe, and pointed me at a pattern I'd already deployed in a completely separate codebase the month before. The tool that produced the failure is [claude-recall](/Blog/Post/claude-recall-agent-memory-for-claude-code). The pattern I'd already used was from ANI Runtime, my [companion-AI project](/Blog/Post/seven-ways-ai-lies-confabulation-taxonomy). That this pattern worked in two places, and is being designed into a third, is the thing I find genuinely interesting, not the AI-collaborative-filing.

But the AI-collaborative-filing is the part most readers will want to start with, so let me start there.

## The feature was a thematic-mining substrate

claude-recall began life as a per-prompt recall layer for Claude Code. You ask the agent something, the SessionStart hook auto-injects relevant prior context from your archived sessions, the agent produces an answer that's continuous with what you decided last week. v0.6 stabilized this; v0.6.5 made the diagnostic surfaces honest enough that the existing failure modes were visible instead of silent.

v0.7 added a second use case I'd been thinking about for a while: thematic mining. The same embedding store that powers per-prompt recall could also be clustered. If you ran agglomerative clustering on the cosine similarity space across every embedded message, the resulting clusters would represent recurring threads you'd worked on. If you scored those clusters by `cluster_size × project_count`, the top of the list would be themes that recurred across multiple projects, ideal candidates for blog topics, since the cross-project recurrence is itself a signal that the topic was worth thinking about more than once.

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

None of these were anywhere close to "topics worth writing about." Real topics like `paper / ani / research`, `memories / memory / retrieval`, and `migration / schema / migrations` only appeared past rank 25, where most users wouldn't bother to look. The tool's documented workflow asked you to lower `--min-cluster-size` and compare time windows to drill in, but those steps assume the candidates the tool generates are real candidates. Mine were process noise from the protocol layer of the conversation, not topical content.

I knew the mechanical fix on sight: filter system-injected wrapper-tag content (the `<ide_opened_file>` and `<task-notification>` blocks) before clustering. That'd kill clusters #1 and #2. The rest were harder. "Let me check" is conversational mechanic, not wrapped in any tag. "Public class ApiCombatGame" is real C# leaking inline from quoted file output. There's no structural marker for these; they're just normal-looking text that happens to be procedural rather than topical.

I posted the symptom to the project repo and went to bed expecting to spend the next morning thinking through it.

## The dual-Claude file

What I found in the morning was issue [#27](https://github.com/LearnedGeek/claude-recall/issues/27), titled *"topics: cluster labels dominated by conversational mechanics, not topical content."* The body was a clean diagnosis of what I'd seen, with concrete numbers (~6/50 useful clusters in real-world output, with system-injected content alone collectively totaling 5% of the corpus). It identified the structural fix (filter wrapper-tag content categorically before clustering) and explicitly rejected the obvious-looking-but-wrong fix (a register-specific stoplist of "let," "check," "verify," "files," "build," etc.) on the grounds that stoplists never converge across registers, since every new content domain (cooking-archive, customer-support archive, ML-research archive) would need its own list. The architectural reasoning matches the [tools-must-never-touch-user-config principle](/Blog/Post/tools-must-never-touch-user-config) at a different layer: solve identification structurally rather than by enumerating special cases.

It also had two comments. The first was an architectural reframe: the patch fixes were correct but addressed symptoms, not the design mistake underneath. The deeper mistake was that `topics` operated on undifferentiated message content. Messages aren't one substance. They're at least three kinds, namely *thought* (real reasoning), *procedural* (agent narration of what it's doing), and *harness* (system-injected wrappers), and a different query wants a different kind. `topics` wants only thought content. `search` for "where did I write that test" might want procedural content. Search for harness-related debugging might want harness content. Asking each query to filter at runtime through a mixed substrate is the wrong design; the right design is *classify content kind at index time, build view-appropriate query surfaces.*

The reframe ended with a line that did the most work for me on first read: *"the architectural lesson from ANI Runtime's own history: when a frequency-based method produces noise, the fix is distinctiveness scoring, not enumerated avoid-lists. The Mar 17 anti-confabulation hardening (AC1-AC4) made exactly this transition for retrieval; topic labeling needs the same architectural move."*

The second comment was a hardening pass on the spec. It added empirical verification (sample cluster #1 to confirm >90% of its contents are actually wrapper-tagged before claiming the categorical filter works), enumerated the wrapper-tag patterns that mattered, identified a *fourth* content kind I hadn't named (TOOL_RESULT_EMBEDDED, the C# code dump in cluster #5), and sequenced the fixes (categorical filter first, then re-tune the IDF threshold against the post-filter distribution rather than the pre-filter one). It also bumped the severity from Medium to High and proposed a single-number metric (the `noise: N` count from the topics output) to verify the fix worked.

The issue body was filed by what I think of as ANI Claude, the Claude Code instance I work with on the ANI Runtime project. The architectural reframe in the first comment was filed by the same instance, building on the body it had just submitted. The hardening comment was filed by what I think of as LearnedGeek Claude, the instance I work with on this blog. Both instances had access to my full claude-recall archive across both projects (because that's what the tool does), and both had recently been running the broken `topics` command and seen the same failure mode I had.

I didn't ask either instance to file an issue. They both did it independently, then refined each other's work in the comment thread. The third comment, where the spec consolidation happens, integrates *LG Claude's review (5 specific tightenings)* with *the architectural reframe in comment 2 above*. Two AI agents working on different projects, on the same tool I built for myself, jointly producing a ready-to-implement spec better than either would have produced alone, because the cross-project diversity gave them complementary diagnostic surfaces, and they could critique each other's work.

That's the part I don't have great precedent for. The narrow framing is *"AI agents collaborated to file an issue."* The wider framing is *"this is what dogfooding looks like when the dogfooders themselves are agents and they have memory."*

## The architectural move was tier separation

I shipped the fix that night. v0.8.0 added a `content_kind` column to the messages table with a v3 schema migration, classified every message in the corpus on first open after upgrade (~50,000 rows in under a second), and filtered the topics query to `content_kind = 'THOUGHT'`. The four kinds:

- **THOUGHT**: user prompts, agent substantive reasoning, design discussions, analysis
- **PROCEDURAL**: agent narration ("Let me check," "Now I'll," "Need to add"), build-cycle status, tool-call announcements
- **HARNESS**: system wrappers (`<ide_opened_file>`, `<task-notification>`, `<system-reminder>`, `<user-summary>`, `<analysis>`), canonical auto-summarization openers, system-role single-line markers
- **TOOL_RESULT_EMBEDDED**: assistant messages dominated by quoted code or data tokens (high keyword density, high punctuation density)

The classifier is a small Python module (regex and string-prefix work, microseconds per message) that runs at index time. The `topics` subcommand now queries `WHERE content_kind = 'THOUGHT'` by default. The `search` subcommand grew a `--kind` flag so users can scope to whichever kinds they want (default: all kinds, for backward compat).

The empirical results were what I'd hoped for and slightly more.

On the same 50,000-message archive, the new top ten contained four genuinely topic-bearing labels: `crewtrack / maui / line` (real bug-fix narrative across 14 projects), `google / site / page` (Google Workspace integration work across 15 projects), `ssh / scalar / powershell` (deployment patterns across 13 projects), `app / azure / worker` (Azure deployment across 9 projects). Past the top 10, the previously-buried real topics surfaced: `memories / memory / retrieval` jumped from rank 30 to rank 11. `paper / ani / research` jumped from rank 27+ to rank 11. `ani / conversation / something` (real ANI relational dynamics from sessions in March) showed up at rank 14. `apicombatgame / player / battle` (real game-system work) at rank 18.

LG Claude audited the v0.8.0 output. The summary line was *"the pre-fix top-30 had ~3 topical clusters; the post-fix top-30 has ~24."* Same archive, same query, same scoring formula. The difference was that the input set was 27,000 thought-tier messages instead of 50,000 mixed-substrate messages, and the IDF math finally had distinctive signal to work with.

## The same pattern lived in ANI Runtime first

This is the part I find more interesting than the dogfooding loop, and it's why this isn't really a claude-recall post. It's a post about a recurring architectural insight that happens to have shown up in claude-recall this month.

ANI Runtime is a companion AI project I've been working on since late 2024. It runs locally with no cloud APIs, and its job is to act as a sustained character across long-running interaction. To do that, it needs memory. The first version of that memory was a single substrate: every record (asserted facts, conversation turns, the system's inner thoughts about itself) lived in the same store, was retrieved the same way, and was incorporated into prompts uniformly. That worked in toy cases and broke under real load. The same retrieval pass that surfaced "what is Ani's favorite book" (a fact) also surfaced inner-thought content where Ani had reflected on what she might be feeling. The two records would semantically cluster together, and the prompt would end up containing inner thoughts as if they were factual ground truth, which fed directly into the confabulation incidents I [wrote about elsewhere](/Blog/Post/seven-ways-ai-lies-confabulation-taxonomy).

The fix, in mid-April, was a tier separation. ANI Runtime split memory into three explicit substrate types: **Facts** (asserted truths like character seeds, perception events, things the system knows), **Episodic** (verbatim conversation record, what was said), and **Interior** (inner thoughts, self-model, reflections, what the system thought about itself or the conversation). Each type has distinct write semantics, distinct retrieval methods, and distinct prompt-construction surfaces. Facts can be cited as ground truth. Episodic can be quoted as "you said X yesterday." Interior can be referenced as "you noticed something here" but never asserted as fact. The walls between substrate types are what prevent contamination from amplifying through downstream stages.

The architectural insight that transferred to claude-recall is the same one. Treating multiple kinds of content as one substrate produces noise that you can't filter out at query time without losing signal. Separating the kinds at write time, by classifying content by its function in the system rather than just its surface form, gives every downstream query the slice it actually needs.

What's worth pulling out is that the *transfer* happened spontaneously inside an agent that had access to both archives. ANI Claude knew about ANI Runtime's tier separation because it had been part of the work that produced it. When it saw the symptom in claude-recall, it didn't propose enumerating stoplists or tightening IDF thresholds in isolation. It proposed the architectural move it had recently seen succeed in a different domain. The cross-project context window plus persistent agent memory plus the recall layer meant the tool I'd built was, in some sense, helping diagnose itself. Not because it knew anything special, but because the agents using it had encountered the same shape elsewhere and could name it.

## The pattern is now in three places

I want to be careful here, because three is the smallest number where I'd start using the word "pattern" with any confidence, and I think we're at three for the first time.

ANI Runtime split memory into Facts, Episodic, and Interior in mid-April. claude-recall split messages into THOUGHT, PROCEDURAL, HARNESS, and TOOL_RESULT_EMBEDDED in late April. A third project I'm in the design phase on, DrOk, an architecture for medical-triage workflow that someone in my collaboration network is building, needs to separate symptom assertions from differential-diagnosis hypotheses from confidence-graded clinical decisions, and the substrate-type framing came up the first time I sketched that on a whiteboard.

Three independent deployments of the same architectural pattern. The pattern is roughly: *when a system does retrieval over content with mixed cognitive functions, the right move is to classify content by function at write time rather than to filter at query time, because frequency-based retrieval amplifies the most-common content kinds and a stoplist of register-specific noise will never converge.* The variant that lives in claude-recall is the lightest-weight version (four kinds, regex classifier, single column). The variant in ANI Runtime is the most cognitive-load-bearing version (three kinds, distinct retrieval methods, distinct prompt-construction surfaces, formal grounding in epistemic provenance). The variant in DrOk is still being scoped.

If I'd been more disciplined about cross-project pattern-spotting, I would have noticed the second instance was the same shape as the first. I didn't. ANI Claude noticed, in the comment that reframed the issue. That's the second-order effect of the dogfooding-with-memory loop: a pattern I'd deployed in April was sitting in the archive, accessible to an agent working on a different project in the same archive, and that agent could see the connection where I had been treating the two projects as unrelated.

## What still doesn't work

I'd be doing the optimistic-marketing thing if I left it there, so let me be specific about what's still rough.

The classifier in claude-recall is empirical. The HARNESS patterns are well-bounded since wrapper tags are structurally identifiable, but the PROCEDURAL openers are a pragmatic list of common agent-narration phrases. After v0.8.0 shipped, LG Claude audited and flagged a residual cluster ("warmup / canvas / register," size 616) that had escaped the classifier. I added more openers in v0.8.1 ("Now adding," "Need to add," "Perfect! Now"), and the cluster shrunk to 583 messages. I dug into the residual content and found that those 583 are actually mostly substantive. The cluster was being labeled by TF-IDF picking up a few outlier sentences that happened to contain those code symbols, while the bulk was real long-form assistant content clustered by embedding similarity. That's not a classifier problem; it's a cluster-labeling problem, and it's a separate v0.9 concern.

The deeper limitation is that any classifier with empirical pattern lists will need iteration as new registers surface. A user who indexes a cooking-conversation archive will produce content with a different procedural register ("now whisk the eggs," "next add the flour") that my current PROCEDURAL openers don't catch. The right answer there isn't to extend the list with cooking verbs, since that's the stoplist trap the issue body explicitly rejected. The right answer is the same architectural move at the next level: identify "domain-procedural register" as its own classifier surface, give the user a way to extend it, document the pattern. The architecture is correct, but its concrete instantiation in any given codebase will always need the next round of empirical work.

I also want to flag the meta-risk in this pattern of writing. I just spent three thousand words explaining how I shipped v0.8.0 and how the agents around me helped. The optimistic-marketing version of this story is *"AI agents help me build better tools."* The version I'd rather you take away is *"the tools I build are evidence of patterns I'm tracking across projects, the agents have access to that evidence, and the loop is getting tighter."* If you replace "Mark" with "any practitioner with persistent agent memory and cross-project context," the same loop applies. The interesting question isn't whether AI helped me find a bug. It's what kind of work becomes possible when the agents working on a problem share access to the substrate of all the problems you've worked on, and how that changes the cost of cross-project pattern-spotting.

I don't think we have great answers for that yet. I think we will, and the answers will be domain-specific. The substrate that helps a software engineer is different from the one that helps a researcher is different from the one that helps a clinician. But the architectural pattern of "classify content by function at write time, query view-appropriately" is going to recur, not because I'm clever, but because it's the right shape for the problem.

## Where this goes

claude-recall v0.8.4 (the version live on PyPI as I write this) ships the four-kind classifier, the THOUGHT-only filter on `topics`, the `--kind` flag on `search`, and a `reclassify` subcommand for users upgrading from earlier v0.8.x releases who want the new patterns retroactively applied. It's `pip install --upgrade claude-recall` for anyone already using it. The schema migration runs automatically on first open after upgrade and is imperceptibly fast at 50k-message scale.

If you want to try the thematic-mining workflow that surfaced this whole arc:

```bash
claude-recall topics --limit 30
claude-recall topics --since 30d --limit 20
claude-recall topics --min-cluster-size 2 --limit 50
claude-recall search "<theme phrase>" --semantic --cross-project-boost
```

The architectural-pattern post I'm planning next is the comparison between ANI Runtime's epistemic-grounding architecture and claude-recall's content-kind classifier: what carries across, what doesn't, and what I learned about the shape of the pattern itself by deploying it twice in the same month. That post is going to be more of a design treatise than this one. This one is mostly about what happened the week the agents started filing issues against me.

For a complementary angle on the substrate question, see [The Context Window Isn't the Memory Problem](/Blog/Post/the-context-window-isnt-the-memory-problem). It frames the same thing from the news-anchored side rather than the architectural-pattern side.

If you've thought about this, or seen the same shape in another domain, I'd genuinely want to hear it. The third deployment in DrOk is at the design-doc stage, and the more independent instances I can compare, the better the pattern gets.
