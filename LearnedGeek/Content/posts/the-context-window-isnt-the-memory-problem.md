Anthropic shipped what's being called *infinite context windows* this week. If you read the press summaries you'd think the long-running problem of "Claude forgets things" had been solved. If you read [the actual announcement](https://anthropic.com/news/context-management) you'd notice that what they shipped is much more bounded than the headline, and you'd also notice that it doesn't touch the half of the memory problem that I think matters more for anyone using Claude Code seriously across multiple sessions and multiple projects.

I want to walk through what Anthropic actually shipped, why "infinite context window" is the wrong frame for it, what problem it does and doesn't solve, and why I built [claude-recall](/Blog/Post/claude-recall-agent-memory-for-claude-code) for the half it doesn't.

## What Anthropic actually shipped

The announcement contains three distinct features, and the press summaries are mashing them together. They're worth disambiguating:

**1. Consumer chat: automatic summarization when conversations approach the limit.** When you're using Claude in the chat UI and a conversation gets long enough that it would normally hit the context limit, the older turns are now automatically summarized server-side instead of producing an error. From the user's perspective, the conversation just keeps going. From a technical perspective, the older messages are no longer in the model's attention window, since they've been replaced by a compressed summary. Information loss is real but invisible.

**2. Compaction API in beta on Opus 4.6.** This is the same mechanism, exposed for developers. You call the API, and the server handles the compaction step. The use case is application code that wants to maintain long-running conversations without managing the truncation strategy yourself. Same tradeoff: the older content gets summarized rather than retained.

**3. Memory for Managed Agents in public beta.** Available via the `managed-agents-2026-04-01` API header. This gives an agent a persistent storage substrate it can write to and read from across the agent's runs. The memory is per-agent and is curated by the model itself.

These are all real improvements. The first one will reduce a meaningful class of "ugh, this conversation hit the wall" frustrations for chat users. The second one means application developers don't need to roll their own truncation logic. The third one is the most interesting of the three, since persistent agent memory is a primitive a lot of agentic workflows want, and the managed-agents header puts it within reach for developers building those workflows.

But none of them is what the headlines are claiming. They aren't infinite context. There is no transformer architecture where attention scales gracefully to literally arbitrary input length without an asterisk somewhere. The asterisk here is compression. The older content goes through a summarization pass and the model's attention only ever sees a bounded window of "current turns plus a summary of what came before."

That's a real and useful technique. It's just that the compression is lossy and opaque, and the model that summarizes is the same model running the conversation, which means the summary inherits the same biases and blind spots as everything else the model produces. If you've ever watched Claude summarize a long technical thread and noticed which decisions got dropped from the summary, you have direct experience with the limit of this technique.

## Two problems sit under "Claude doesn't remember"

The reason "infinite context window" is the wrong frame is that it conflates two genuinely distinct problems. They look similar from outside the system but they're addressed at completely different layers.

**Problem 1: This single conversation ran long and I don't want to hit a wall.**

This is the in-conversation problem. You're working through something, the conversation goes deep, the context fills up, the model starts losing detail from earlier turns or, in the old behavior, the conversation outright errors out. The wall is annoying, the loss is real, and the user-facing experience matters.

Anthropic's announcement just solved this. Or, more precisely, it shipped a meaningfully better answer than "throw an error." The conversation continues, the older turns are compressed rather than dropped entirely, and the user keeps moving. For long single-conversation workflows this is a genuine improvement.

**Problem 2: I made a decision in a different chat three weeks ago in a different project and I want my agent to act consistently with it today.**

This is the cross-session, cross-project problem. It's a different problem at a different layer. The decision didn't disappear because the conversation ran long. It's not even in the current conversation. It's in a *different* conversation, in a *different* project's archive, from *three weeks ago*. The current Claude Code session has no native access to it. There is no compaction technique that helps because there's no sense in which the prior decision is "earlier in this thread." It's not in any thread that's currently active. The shape of this problem maps closely to what [Park et al.'s generative-agents architecture](/Blog/Post/park-et-al-generative-agents-memory) tried to solve at the agent-simulation level, except here the agent is you and your archive is real work.

Practically, this shows up constantly for anyone using Claude Code across multiple projects. You make a load-bearing architectural call in project A on a Tuesday. Three weeks later you're working in project B and you're about to make the opposite call because you don't remember the original reasoning. Or you're back in project A two months later and the agent has zero recollection of the reasoning behind a structural choice in the codebase, so it confidently proposes a refactor that re-introduces the exact problem the original choice avoided.

The compaction announcement does not address this. It can't, because compaction operates inside a single conversation, and Problem 2 is the gap between conversations.

## Why this distinction is load-bearing

I want to be careful not to make this sound like Anthropic shipped the wrong thing. They shipped exactly the right thing for Problem 1, and Problem 1 is real. The Compaction API in particular is a piece of infrastructure I'd want available even if Problem 2 were also solved at the platform level, since they're complementary, not substitutes.

But the framing in the press has been "Claude can finally remember things now," and that framing is not accurate. It's *more* accurate to say "Claude can finally process long single conversations without erroring out." Memory across sessions, memory across projects, memory across the discrete-conversation boundary, all of those are still unsolved at the platform level for anyone outside the managed-agents path. And the managed-agents path is per-agent and opaque, since the agent curates its own memory according to its own opaque sense of what's worth remembering.

For someone using Claude Code as a daily driver across many projects, the load-bearing question is not "how long can I make a single conversation before it breaks?" It's "how do I get the agent to know what was decided across my entire archive of prior work, in a way I can inspect and steer?" Those two questions look similar to a casual reader, but they are completely different at the system level.

## What I built for problem 2

I've been working on [claude-recall](/Blog/Post/claude-recall-agent-memory-for-claude-code) for several months now, and it is precisely the cross-session, cross-project layer that compaction doesn't address. The architecture is intentionally simple:

The tool walks your Claude Code session archive (by default `~/.claude/projects/`, where Claude Code stores its conversation JSONLs) and indexes every message into a local SQLite database with FTS5 full-text search. If you've installed the optional embeddings extra and have Ollama running locally, it also generates per-message vector embeddings using `nomic-embed-text` and stores them in the same database. A small SessionStart hook fires on every Claude Code session start, queries the index for content relevant to the current prompt or recent conversational context, and injects the matches into the agent's prompt as additional context.

The shape that matters here is that everything is **local**, **cheap**, and **across every project at once**. The SQLite database lives on your disk. The embeddings are generated locally by Ollama, so no API costs. Queries return in milliseconds even on a corpus of fifty-thousand-plus messages, which is the size of my own archive after several months of dogfooding. The agent in any given Claude Code session can pull from decisions you made three weeks ago in a different project as easily as from the current conversation, because the underlying index doesn't distinguish. It's the entire archive, treated as a single retrieval substrate.

What that buys you, concretely:

- A user prompt referencing prior work ("how should we approach the migration here, given what we did in CrewTrack?") auto-resolves the reference. The hook surfaces the relevant CrewTrack content as injected context, and the agent's response is grounded in the actual prior reasoning rather than reconstructed from scratch.

- The same archive supports thematic mining via the `topics` subcommand, which clusters the embedding space to surface recurring threads across all your projects. Useful for "what have I been wrestling with that I haven't written down" workflows.

- A `--cross-project-boost` flag on semantic search promotes results from themes that recur across multiple projects, on the theory that a topic recurring across project boundaries is generally a stronger blog or design-review signal than a topic that's stuck inside one project's particulars.

- A content-kind tier separation system classifies messages as THOUGHT (real reasoning), PROCEDURAL (agent narration), HARNESS (system-injected wrappers), or TOOL_RESULT_EMBEDDED (code dumps from tool calls) at index time, so different queries can scope to the slice that's actually relevant. This was the architectural move that came out of an issue [two of my own AI agents jointly filed against the tool](https://github.com/LearnedGeek/claude-recall/issues/27), which is a [story I tell separately](/Blog/Post/two-agents-filed-an-issue).

- A `migrate` subcommand for relocating archives when projects move on disk, with vectors preserved through the rename.

The [GitHub repo](https://github.com/LearnedGeek/claude-recall) has the install instructions. It's `pip install 'claude-recall[embeddings]'` plus a one-time `claude-recall init-hooks` in any project directory you want to wire it into. MIT licensed.

## What this means going forward

I think the most useful way to read this week's announcement, if you're thinking about how memory works in LLM workflows broadly, is as a wedge that helps clarify which problem is at which layer.

Compaction is the right answer to in-conversation context-limit pressure, it belongs in the platform, and Anthropic shipping it natively is good for everyone. I'd rather use the Compaction API than maintain my own truncation logic in any application I build going forward.

Cross-session, cross-project memory is a different layer. I don't think Anthropic is going to ship that natively any time soon, and I'm not even sure they should, since the right shape for this kind of memory is local, user-controlled, and tightly integrated with the file-and-project structure of how the user actually works. That's not a shape that fits inside an API; it's a shape that fits inside a tool the user installs and configures.

Which is to say: I expect the platform to keep getting better at Problem 1, and I expect the right answer to Problem 2 to keep being something local and tool-shaped that the user runs themselves. claude-recall is one answer; it's not the only possible answer. But the structural distinction between the two problems is going to keep being useful regardless of which specific tools end up being the durable answer.

If you're using Claude Code daily and you've felt the friction of "I know I worked through this before but the agent has no idea," that's the gap. It's a session-boundary gap, not a context-window gap. The platform fixed the wrong gap this week, and that's fine. It fixed the gap it could fix. The other one is still open, and there are tools for it now. (For a casual-reader companion to this argument, see [ELI5: How an AI Remembers Your Name (And Forgets Your Lunch)](/Blog/Post/eli5-ai-memory).)

## A small ask

claude-recall is in active development. The v0.7 / v0.8 series shipped a lot in a short window, and the dogfooding loop with my own AI agents has been catching issues faster than I would on my own. If you try it and find friction (performance, ergonomics, ranking quality, edge cases I haven't thought through), file an issue or drop me a note. The tool gets better when more registers and more workflows surface novel failure modes against it.

The deeper writeup of the v0.7/v0.8 architectural arc, including the dual-Claude issue-filing story and the cross-project pattern transfer it surfaced, is coming soon. This post is the news-anchored short version: Anthropic shipped a thing, the thing is real, the thing addresses one half of the problem, and the other half is the half I've been working on. Both halves matter. Use both.
