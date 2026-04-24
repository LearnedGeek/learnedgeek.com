Every Claude Code session is written to disk. So is every Copilot CLI session, every Cursor session, every agentic coding tool I use.

The agent doesn't read its own archive.

That gap matters more than I realized. Last week I worked through a subtle cosine-similarity bug with one Claude instance. We landed on a specific principle and rejected a specific fix. Three days later a different Claude instance surfaced the same bug. I asked for a fix. Claude proposed, almost word for word, the exact solution I had rejected.

The rejection was on disk. The active instance just had no mechanism to reach it.

What strikes me is this isn't a Claude-specific problem. Every agentic tool has the same shape: structured session data in some format, no native way for the agent to query that archive back into the active context. Microsoft's team built auto-memory for Copilot CLI to close that gap on their side. I ended up building claude-recall to close it for Claude Code.

Same shape, different agents. The archive is already the source of truth. The agent just isn't reading it.

If you use Claude Code and want to try what I built: github.com/LearnedGeek/claude-recall

Posted a longer writeup on the blog if you want more context: learnedgeek.com/Blog/Post/claude-recall-agent-memory-for-claude-code

The more interesting question is what happens when agents can query their own history by default. Nobody has enough data on that yet.
