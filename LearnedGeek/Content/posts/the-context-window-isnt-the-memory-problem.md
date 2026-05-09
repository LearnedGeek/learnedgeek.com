Anthropic shipped what's being called *infinite context windows* this week. If you read the press summaries you'd think the long-running problem of "Claude forgets things" had been solved. If you read [the actual announcement](https://anthropic.com/news/context-management) you'd notice that what they shipped is much more bounded than the headline, and you'd also notice that it doesn't touch the half of the memory problem that I think matters more for anyone using Claude Code seriously across multiple sessions and multiple projects.

## What Anthropic actually shipped

The announcement contains three distinct features: automatic summarization in consumer chat, a Compaction API in beta on Opus 4.6 that exposes the same mechanism for developers, and a Memory for Managed Agents feature in public beta. They're useful improvements, especially the third one, since persistent agent memory is a primitive a lot of agentic workflows want.

But none of them is what the headlines are claiming. They aren't infinite context. There is no transformer architecture where attention scales gracefully to literally arbitrary input length without an asterisk somewhere. The asterisk here is compression. The older content goes through a summarization pass and the model's attention only ever sees a bounded window of "current turns plus a summary of what came before."

That's a real and useful technique. It's just that the compression is lossy and opaque, and the model that summarizes is the same model running the conversation, which means the summary inherits the same biases and blind spots as everything else the model produces. If you've ever watched Claude summarize a long technical thread and noticed which decisions got dropped from the summary, you have direct experience with the limit of this technique.

## Two problems sit under "Claude doesn't remember"

The reason "infinite context window" is the wrong frame is that it conflates two genuinely distinct problems. They look similar from outside the system but they're addressed at completely different layers.

**Problem 1: This single conversation ran long and I don't want to hit a wall.**

This is the in-conversation problem. You're working through something, the conversation goes deep, the context fills up, the model starts losing detail from earlier turns or, in the old behavior, the conversation outright errors out. The wall is annoying, the loss is real, and the user-facing experience matters. Anthropic's announcement just solved this. The conversation continues, the older turns are compressed rather than dropped entirely, and the user keeps moving.

**Problem 2: I made a decision in a different chat three weeks ago in a different project and I want my agent to act consistently with it today.**

This is the cross-session, cross-project problem. It's a different problem at a different layer. The decision didn't disappear because the conversation ran long. It's not even in the current conversation. It's in a *different* conversation, in a *different* project's archive, from *three weeks ago*. The current Claude Code session has no native access to it. There is no compaction technique that helps because there's no sense in which the prior decision is "earlier in this thread." The shape of this problem maps closely to what [Park et al.'s generative-agents architecture](/Blog/Post/park-et-al-generative-agents-memory) tried to solve at the agent-simulation level, except here the agent is you and your archive is real work.

Practically, this shows up constantly for anyone using Claude Code across multiple projects. You make a load-bearing architectural call in project A on a Tuesday. Three weeks later you're working in project B and you're about to make the opposite call because you don't remember the original reasoning. Or you're back in project A two months later and the agent has zero recollection of the reasoning behind a structural choice in the codebase, so it confidently proposes a refactor that re-introduces the exact problem the original choice avoided.

The compaction announcement does not address this. It can't, because compaction operates inside a single conversation, and Problem 2 is the gap between conversations.

## What I built for problem 2

I've been working on [claude-recall](/Blog/Post/claude-recall-agent-memory-for-claude-code) for several months now, and it is precisely the cross-session, cross-project layer that compaction doesn't address. The architecture is intentionally simple: it walks your Claude Code session archive, indexes every message into a local SQLite database with FTS5 full-text search, optionally generates per-message vector embeddings via local Ollama, and registers a SessionStart hook that injects relevant prior-session context into the agent's prompt on every session start.

The shape that matters is that everything is **local**, **cheap**, and **across every project at once**. The database lives on your disk. The embeddings are generated locally, so no API costs. Queries return in milliseconds even on a corpus of fifty-thousand-plus messages. The agent in any given Claude Code session can pull from decisions you made three weeks ago in a different project as easily as from the current conversation, because the underlying index doesn't distinguish. It's the entire archive, treated as a single retrieval substrate.

What that buys you in practice: a user prompt referencing prior work ("how should we approach the migration here, given what we did in CrewTrack?") auto-resolves the reference. The hook surfaces the relevant CrewTrack content as injected context, and the agent's response is grounded in the actual prior reasoning rather than reconstructed from scratch.

The same archive also supports thematic mining via a `topics` subcommand that clusters the embedding space across all your projects, and a content-kind classifier that separates real reasoning from agent narration so each query gets the slice it needs. (The classifier story is its own thing: [two of my own AI agents jointly filed an issue against the tool](https://github.com/LearnedGeek/claude-recall/issues/27) when the first version of `topics` produced 80% noise, and the fix they proposed is a [story I tell separately](/Blog/Post/two-agents-filed-an-issue).)

The [GitHub repo](https://github.com/LearnedGeek/claude-recall) has the install instructions. `pip install 'claude-recall[embeddings]'` plus `claude-recall init-hooks` in any project directory you want to wire it into. MIT licensed.

## What this means going forward

Compaction is the right answer to in-conversation context-limit pressure, it belongs in the platform, and Anthropic shipping it natively is good for everyone. Cross-session, cross-project memory is a different layer. I don't think Anthropic is going to ship that natively any time soon, and I'm not even sure they should, since the right shape for this kind of memory is local, user-controlled, and tightly integrated with the file-and-project structure of how the user actually works. That's not a shape that fits inside an API; it's a shape that fits inside a tool the user installs and configures.

If you're using Claude Code daily and you've felt the friction of "I know I worked through this before but the agent has no idea," that's the gap. It's a session-boundary gap, not a context-window gap. The platform fixed the wrong gap this week, and that's fine. It fixed the gap it could fix. The other one is still open, and there are tools for it now.

(For a casual-reader companion to this argument, see [ELI5: How an AI Remembers Your Name (And Forgets Your Lunch)](/Blog/Post/eli5-ai-memory). For the deeper architectural story behind claude-recall's content-kind classifier and the cross-project pattern that drove it, see [When Two Agents Filed an Issue Against My Own Tool](/Blog/Post/two-agents-filed-an-issue).)
