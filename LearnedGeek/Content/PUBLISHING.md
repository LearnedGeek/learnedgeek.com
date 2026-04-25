# Publishing & Syndication Tracker

Where each blog post has been published or syndicated, and when.

## Cross-Posting Best Practices

When syndicating a learnedgeek.com post to an external platform (dev.to, Medium, Hashnode, etc.):

- **Set `canonical_url`** in the platform's post settings to the learnedgeek.com URL. This tells Google the original blog is the primary source, so SEO authority flows back instead of being split with the syndicated copy. Without this, the syndicated version can outrank the original on its own URL.
- **Backlinks compound.** External links pointing to learnedgeek.com are quality SEO signals. Even a few good ones from places like dev.to add up over time.
- **Engage with comments.** Most platforms reward author engagement. A reply within 24-48 hours often pulls more readers in than the original post does.
- **Adapt for the audience.** The blog version is the canonical record. Platform versions can lean on what works there (e.g., dev.to favors question-titles and technical specificity; LinkedIn favors observation-first short-form).

## Tracker

| Blog Post | Blog Published | LinkedIn | dev.to | Notes |
|---|---|---|---|---|
| claude-recall-agent-memory-for-claude-code | Apr 23, 2026 | Apr 23 ([draft](linkedin/claude-recall-memory-gap.md)) | [Apr 25, 2026](https://dev.to/mcarthey/your-ai-agent-already-writes-every-session-to-disk-why-isnt-it-reading-its-own-archive-2f3h) | First dev.to post. Title adapted to question form for the platform. |
| building-ani-ai-companion-for-grief | Apr 6, 2026 | Apr 8 ([draft](linkedin/02-ani-is-home-now.md)) | — | — |

## Channels to Consider

- **Hacker News (Show HN)** — for projects with code. claude-recall would fit, especially with v0.5 on PyPI.
- **Lobsters** — smaller, technical audience. Invitation-only but easier than HN to get visibility if you have an account.
- **Reddit** — niche subs only (r/programming, r/LocalLLaMA, r/ClaudeAI). Topic-dependent.
- **Hashnode** — developer-focused, similar to dev.to. canonical_url required.
- **Medium** — broader reach, lower technical signal. canonical_url required.

Different conventions, different audiences. Adapt the post for the platform — don't just cross-post the same text everywhere.

## Why This File Exists

After a few months of posting, "where did this post end up and when?" becomes hard to reconstruct. This tracker makes performance analysis possible later (which channels brought traffic, which titles worked, where engagement happened) without having to dig through inbox archives or platform dashboards.
