On April 20, I was debugging an issue with a Claude Code instance and landed on a principle I phrased this way: "cosine similarity measures topical overlap; parroting is verbatim phrase reuse; those are different signals." We decided not to patch at the reply layer.

Three days later, different Claude instance, same bug came back. I asked for a fix. Claude proposed, almost word for word, the exact cosine-similarity guard I had rejected three days earlier. The reasoning existed on disk. The active instance just couldn't see it.

I said "search the history before we move on anything." Then I built the tool that does that automatically.

claude-recall: SQLite FTS5 plus optional semantic rerank over the Claude Code session archive, wired as a UserPromptSubmit hook. On every prompt, the hook retrieves ranked prior-session context and injects it. About 80 ms per prompt on my machine. 25,000 messages indexed across 20 projects.

Inspired directly by Microsoft's auto-memory post for Copilot CLI. Different agent, same insight: the archive is already on disk, the agent just isn't reading it.

v0.4, MIT, beta. If you use Claude Code on anything with history, try it. File issues when it breaks.

Repo: https://github.com/LearnedGeek/claude-recall
Full story: https://learnedgeek.com/Blog/Post/claude-recall-agent-memory-for-claude-code

#ClaudeCode #DeveloperTools #OpenSource #AI #Productivity
