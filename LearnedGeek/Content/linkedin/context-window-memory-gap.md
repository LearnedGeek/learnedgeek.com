Anthropic shipped what's being called "infinite context windows" this week. If you read the press summaries you'd think the long-running "Claude forgets things" problem had been solved. Read the actual announcement and you'll notice what shipped is much more bounded.

What they actually shipped is compression. Older turns get summarized so attention only ever sees a bounded window. That's useful. The headlines conflate two genuinely distinct memory problems, though, and only one of them is what got fixed.

Problem 1 is "this single conversation ran long and I don't want to hit a wall." Anthropic just solved this. The conversation continues, older turns are compressed rather than dropped, and you keep moving.

Problem 2 is "I made a decision in a different chat three weeks ago in a different project and I want my agent to act consistently with it today." That is a different problem at a different layer. There is no compaction technique that helps because there is no sense in which the prior decision is earlier in this thread. It's in a different conversation, in a different project's archive, from three weeks ago.

If you use Claude Code daily, you've probably felt this. You make a load-bearing call in project A on a Tuesday. Three weeks later you're in project B and the agent has no recollection of the reasoning behind the original choice, so it confidently proposes a refactor that re-introduces the exact problem the original choice avoided.

The compaction announcement does not address this, since compaction operates inside a single conversation and Problem 2 is the gap between conversations.

I've been building a tool for Problem 2: github.com/LearnedGeek/claude-recall. It's local. The agent in any current session can pull from decisions you made three weeks ago in a different repo as easily as from the current conversation, because the underlying index doesn't distinguish.

The platform fixed the gap it could fix this week, and the other one is still open.

Full writeup: learnedgeek.com/Blog/Post/the-context-window-isnt-the-memory-problem
