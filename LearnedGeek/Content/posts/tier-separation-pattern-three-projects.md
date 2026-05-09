I want to write about a single architectural pattern that has now shown up in three different projects of mine, in three different domains, arrived at independently each time. The pattern is roughly: *when a system does retrieval over content with mixed cognitive functions, classify content by function at write time rather than filter at query time.* The reason this matters is that frequency-based retrieval amplifies the most-common content kinds, and a stoplist of register-specific noise will never converge across registers. Tier separation at write time does converge, and once you see it once you start to see it everywhere.

This isn't a claim that I invented the pattern. Tier separation in databases is older than I am. The interesting part isn't the pattern itself. It's the speed at which it transferred between projects of mine once an AI agent with cross-project memory could see the connection.

## ANI Runtime, mid-April: Facts, Episodic, Interior

[ANI Runtime](/Blog/Post/ani-the-architecture-behind-the-companion) is a companion AI project I've been working on since late 2024. It runs locally with no cloud APIs, and its job is to act as a sustained character across long-running interaction. To do that, it needs memory.

The first version of that memory was a single substrate: every record (asserted facts, conversation turns, the system's inner thoughts about itself) lived in the same store, was retrieved the same way, and was incorporated into prompts uniformly. That worked in toy cases and broke under real load. The same retrieval pass that surfaced "what is Ani's favorite book" (a fact) also surfaced inner-thought content where Ani had reflected on what she might be feeling. The two records would semantically cluster together, and the prompt would end up containing inner thoughts as if they were factual ground truth, which fed directly into the [confabulation incidents](/Blog/Post/seven-ways-ai-lies-confabulation-taxonomy) that became the core finding of Paper 1.

The fix, in mid-April, was tier separation. ANI Runtime split memory into three explicit substrate types:

- **Facts**: asserted truths like character seeds, perception events, things the system knows
- **Episodic**: verbatim conversation record, what was said
- **Interior**: inner thoughts, self-model, reflections, what the system thought about itself or the conversation

Each type has distinct write semantics, distinct retrieval methods, and distinct prompt-construction surfaces. Facts can be cited as ground truth. Episodic can be quoted as "you said X yesterday." Interior can be referenced as "you noticed something here" but never asserted as fact. The walls between substrate types are what prevent contamination from amplifying through downstream stages.

That worked. The confabulation rate dropped sharply. The retrieval surfaces stayed coherent under load.

## claude-recall, late April: THOUGHT, PROCEDURAL, HARNESS, TOOL_RESULT_EMBEDDED

[claude-recall](/Blog/Post/claude-recall-agent-memory-for-claude-code) is a different project: a recall layer for Claude Code that indexes session archives and injects relevant prior context into agent prompts. v0.7 added a thematic-mining feature, `claude-recall topics`, that produced almost entirely useless output on its first real-world run. The top clusters were dominated by IDE notifications, agent self-narration, and quoted code dumps.

The fix in v0.8.0 was a `content_kind` column with four values:

- **THOUGHT**: user prompts, agent substantive reasoning, design discussions, analysis
- **PROCEDURAL**: agent narration ("Let me check," "Now I'll," "Need to add"), build-cycle status
- **HARNESS**: system wrappers (`<ide_opened_file>`, `<task-notification>`, `<system-reminder>`)
- **TOOL_RESULT_EMBEDDED**: assistant messages dominated by quoted code or data tokens

Same shape as ANI Runtime's tier separation, applied at a different abstraction layer. The classifier runs at index time. Different downstream queries scope to whichever kinds are appropriate. The post-fix `topics` output went from ~3 topical clusters in the top 30 to ~24, with the same scoring formula and the same archive, just because the input set was 27,000 thought-tier messages instead of 50,000 mixed-substrate messages.

The full story of how that fix landed, [including the dual-Claude issue filing](/Blog/Post/two-agents-filed-an-issue) that produced it, is its own piece. What matters for this post is the architectural move underneath, not the dogfooding loop that surfaced it.

## DrOk, in design: symptoms, hypotheses, decisions

DrOk is a medical-triage workflow architecture someone in my collaboration network is building. I'm at the design-review stage on it, and the first time I sketched the data model on a whiteboard, the substrate-type framing came up unprompted: clinical workflows need to separate symptom assertions (what the patient said) from differential-diagnosis hypotheses (what the system suspects) from confidence-graded clinical decisions (what the workflow recommends or escalates).

These have completely different epistemic statuses. A symptom is something a patient reported and that the workflow has on record. A hypothesis is the workflow's reasoning about possible causes. A decision is a graded output that downstream consumers will act on. Mixing them in a single substrate produces exactly the failure mode that produced the confabulation incidents in ANI Runtime: hypothetical content gets cited as factual, and downstream stages amplify the contamination.

The DrOk variant of the pattern isn't built yet. It's at the spec stage. But the pattern itself is the same: classify content by function at write time rather than try to filter at query time.

## Three deployments is when I'd start using the word "pattern"

Three is the smallest number where I'd start using the word "pattern" with any confidence. Two could be a coincidence; one is just a project. With three, in three different domains (companion AI, dev tools, medical workflow), with three different specific instantiations (three kinds, four kinds, three kinds), I'm willing to call it a pattern.

The roughly-stated version: *when a system does retrieval over content with mixed cognitive functions, the right move is to classify content by function at write time rather than to filter at query time, because frequency-based retrieval amplifies the most-common content kinds and a stoplist of register-specific noise will never converge.*

The variant in claude-recall is the lightest-weight version: four kinds, regex classifier, single column. The variant in ANI Runtime is the most cognitive-load-bearing version: three kinds, distinct retrieval methods, distinct prompt-construction surfaces, formal grounding in epistemic provenance. The variant in DrOk is still being scoped, but it'll have to be load-bearing too because clinical decisions don't tolerate the kind of contamination that surfaces in conversational AI.

Different scales of deployment, same shape underneath.

## How the cross-project transfer happened

This is the part I find more interesting than the pattern itself. I didn't notice the second instance was the same shape as the first. ANI Claude noticed.

When the broken `topics` output landed in claude-recall, the issue ANI Claude filed proposed not just the patch fix but the architectural reframe: classify content kind at index time, build view-appropriate query surfaces. The reframe ended with a line that explicitly cited the prior deployment: *"the architectural lesson from ANI Runtime's own history: when a frequency-based method produces noise, the fix is distinctiveness scoring, not enumerated avoid-lists. The Mar 17 anti-confabulation hardening (AC1-AC4) made exactly this transition for retrieval; topic labeling needs the same architectural move."*

ANI Claude could write that because it had been part of the work that produced the ANI Runtime tier separation in mid-April. With cross-project context window plus persistent agent memory plus the recall layer, the agents working on claude-recall had access to the full archive of decisions made on ANI Runtime. The pattern transferred because the agent that saw it work in one project could recognize the shape when it surfaced in another.

I had been treating ANI Runtime and claude-recall as unrelated projects. Different repositories, different domains, different toolchains. ANI Claude was treating them as part of the same archive of work, because that's what the recall layer made them.

That's the second-order effect of the dogfooding-with-memory loop: a pattern I'd deployed in April was sitting in the archive, accessible to an agent working on a different project in the same archive, and that agent could see the connection where I had been treating the two projects as unrelated.

## What I take from this

If the pattern keeps showing up in domains I'm working in, two things are probably true. The first is that the pattern is real and worth naming explicitly so I can deploy it deliberately on the next project rather than waiting to discover it again. The second is that cross-project pattern recognition is a thing AI agents with shared memory can do better than I can on my own, and that capability is going to matter more as the substrate gets richer.

Neither claim is novel. The honest framing is that I'm three for three on independently arriving at tier separation, the third time only because someone else's work surfaced the connection, and the agents around me have a structural advantage at this kind of pattern-spotting that I should design my workflow around rather than ignore.

The post that this one pairs with is [When Two Agents Filed an Issue Against My Own Tool](/Blog/Post/two-agents-filed-an-issue), which is the dogfooding narrative that surfaced the pattern transfer in the first place. This post is the architectural-pattern angle. They're complementary, not redundant, and they're separate posts because trying to do both at once produced one that was twice as long as either needed to be.

If you've seen the same shape in another domain, I'd genuinely want to hear about it. Three is enough to call something a pattern, but it's also small enough that the next deployment could refine the framing in ways I haven't anticipated.
