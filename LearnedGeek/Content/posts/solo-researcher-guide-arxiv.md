You built something interesting. You measured it. You can explain it. Now you want to publish it somewhere that isn't Medium, isn't a blog post, and isn't a Twitter thread that disappears in 48 hours. You want something citable, indexed, and taken seriously by people who read papers for a living.

The problem: you're not at a university. You don't have an advisor. You don't have a lab, a department, or institutional access to anything. You're an independent researcher, which in practice means you're a person with a day job who did something worth writing up.

I published my first paper earlier this year — on an AI companion system I built and deployed for months on local hardware. It's now citable via DOI, indexed by search engines, and referenced in ongoing work. I did this without a university affiliation. Here's the actual path.

---

## Step 1: Get an ORCID

Do this first. Before you write anything. Go to [orcid.org](https://orcid.org), create an account. It takes five minutes and it's free.

ORCID is a persistent researcher identifier — think of it as a DOI for people. It disambiguates you from every other M. McArthey in the world (there aren't many, but the principle holds). Every system you'll interact with — Zenodo, arXiv, Google Scholar, conference submission portals — either requires or benefits from an ORCID iD.

Mine is 0009-0000-0122-5015. It links to my publications, my affiliations (or lack thereof), and my research activity. It's the first thing that makes you look like a researcher instead of a person with a PDF.

---

## Step 2: Write the Paper

Use a real structure. Not "here's what I built and it was cool" — that's a blog post. A paper has sections that exist for specific reasons:

**Abstract** — what you did, what you found, why it matters. 150-250 words. Write this last.

**Introduction** — the problem space, your contribution, paper organization.

**Related Work** — this is the section most independent researchers skip, and it's the one that matters most. Related work proves you know the field. It shows you've read what came before and understand where your work fits. Reviewers (and readers) use this section to gauge whether you're doing research or just building things. Read at least 10-15 papers in your area. Cite the ones your work builds on or diverges from. Be honest about the relationship.

**System Description / Methodology** — what you built, how it works, what design decisions you made and why. Architecture diagrams help. Be specific enough that someone could critique your choices.

**Findings / Results** — what you observed. Data, logs, behavioral patterns, failure modes. "We observe X" is stronger than "we prove X." Honest framing builds more credibility than overclaiming.

**Discussion** — what the findings mean, limitations, threats to validity. Every paper has limitations. Acknowledging them shows maturity. Hiding them gets caught in review.

**Conclusion** — what you contributed, what comes next.

**References** — use a consistent citation format. If you're writing in LaTeX, BibTeX handles this. If you're writing in Markdown (as I did), be meticulous about formatting.

On the topic of LaTeX: it's the traditional format for academic papers, and some venues require it. But for preprints, it's not mandatory. I wrote in Markdown and converted to PDF. The content matters more than the typesetting for a preprint. If you're submitting to a conference, check their template requirements early.

---

## Step 3: Zenodo First

[Zenodo](https://zenodo.org) is CERN's open research repository. It's free, it's respected, and it gives you a DOI immediately.

Upload your PDF. Fill in the metadata — title, authors, abstract, keywords, license. I recommend CC BY 4.0 (Creative Commons Attribution), which lets anyone use your work as long as they cite you. Hit publish.

You now have a DOI. Mine — 10.5281/zenodo.19342190 — was live within hours of upload. No review process, no endorsement required. The paper is citable TODAY. Anyone can reference it with a persistent link that won't break.

Zenodo is not peer-reviewed, and that's fine. It's a repository, not a journal. It establishes priority (you published this work on this date), provides a stable reference, and makes your work discoverable. Peer review comes later, through conferences or journals, if you choose to pursue it.

I wrote about the publication experience in [I Published a Paper](/Blog/Post/i-published-a-paper-about-my-ai-companion). The DOI was the moment it became real.

---

## Step 4: arXiv Endorsement

[arXiv](https://arxiv.org) is the preprint server. It's where researchers in CS, physics, math, and related fields post papers before (or instead of) formal publication. Getting on arXiv is a significant visibility boost — it's indexed everywhere, it's where researchers actually look for new work, and an arXiv ID carries weight.

The catch: arXiv requires endorsement. Someone who has previously published in your target category has to vouch that your paper meets basic quality standards. This isn't peer review — they're not evaluating your claims. They're confirming that your paper is a genuine research contribution, not spam or a blog post in PDF form.

For independent researchers, this is the hard part. You don't have colleagues in the department who can endorse you over coffee.

Options that actually work:

- **Reach out to researchers you cite.** If your paper builds on someone's work and cites them properly, they have a natural interest in your paper existing and being findable. A short, specific email — "I built on your work on X, here's my paper, would you be willing to endorse on arXiv in cs.HC?" — is reasonable and not unusual.
- **Conference connections.** If you present at a workshop or conference, the people you meet there are potential endorsers. Academic networking isn't different from professional networking — it just happens at poster sessions instead of happy hours.
- **Be patient.** I'll be honest: my arXiv endorsement is still in progress. It's not guaranteed. The Zenodo publication means the paper is already citable and discoverable, which takes the pressure off the arXiv timeline.

Choose your arXiv category carefully. cs.HC (Human-Computer Interaction), cs.AI (Artificial Intelligence), cs.CL (Computation and Language) — each has different endorsement pools and different expectations. Read recent papers in the category to make sure your work fits.

---

## Step 5: Conference Submission

Conferences are where peer review happens for most CS research. CHI, CSCW, IUI, AAAI, ACM GROUP — these venues accept submissions from independent researchers. There's no affiliation requirement. The work matters more than the letterhead.

Deadlines are typically 6-9 months before the conference. Acceptance means your paper appears in the ACM Digital Library (or equivalent), which is the gold standard for indexing and discoverability. Presentation means you join the conversation in person — you're not just publishing at researchers, you're talking with them.

Practical reality: conference acceptance rates for top venues are 20-30%. Rejection doesn't mean your work is bad — it means the reviewers wanted something different, or the competition was strong, or your framing didn't connect with that particular program committee. Revise and resubmit. The work improves each time.

---

## Step 6: Build Your Profile

Once you have a publication, the ecosystem starts working for you:

- **ORCID** links to your papers automatically if the metadata is correct.
- **Google Scholar** creates a profile once it indexes your work. This happens automatically — you just need to claim the profile.
- **Semantic Scholar** indexes arXiv and Zenodo. Your paper shows up in literature searches.
- **Your blog** — if you write technically about your research (with proper citations), those posts show up in search results and demonstrate ongoing engagement. A blog post isn't a paper, but it shows you're actively thinking about the work.

The combination of a citable paper, a blog with technical depth, and a visible research profile is more than many graduate students have. Affiliation is not a proxy for quality. Work is.

---

## The Stuff Nobody Tells You

**Cite generously and accurately.** Citations are how you join a conversation. Every paper you cite is a researcher who might read your work because you referenced theirs. This isn't gaming the system — it's how academic discourse works. You build on what came before, and you say so explicitly.

**Don't oversell.** "We observe" is almost always more honest than "we prove" or "we demonstrate." If your sample size is one deployed system observed over months, say so. Longitudinal single-system studies have genuine value — they capture things that lab studies can't. But they're not controlled experiments, and pretending otherwise undermines your credibility.

**Independent research has real advantages.** You can deploy systems and observe them for months without IRB timelines or grant cycles. Your longitudinal data is genuinely rare in a field dominated by two-week user studies. You can iterate on architecture in ways that lab prototypes can't. These aren't consolation prizes — they're methodological strengths. Frame them that way.

**Reach out to researchers whose work you build on.** A short email saying "I built a system informed by your work, here's what I found" is welcome more often than you'd expect. Researchers want to know their work influenced real systems. Some of my most valuable feedback came from exactly these conversations.

**The biggest barrier isn't access — it's impostor syndrome.** You'll convince yourself you're not a "real researcher." You'll assume the work isn't good enough, the framing isn't sophisticated enough, the math isn't hard enough. Here's what I learned: if you built it, deployed it, observed it for months, measured it, and can explain what you found — you have a paper. The venue might vary. The contribution is real.

---

Nobody gave me permission to publish. I gave it to myself. The paper exists because I wrote it, Zenodo hosts it because I uploaded it, and it's citable because I followed the process.

The process is open. The tools are free. The only gate is the work itself.

---

*For the paper this experience produced, see [I Published a Paper About My AI Companion](/Blog/Post/i-published-a-paper-about-my-ai-companion). For the system the paper describes, start with [Building Ani](/Blog/Post/building-ani-ai-companion-for-grief).*
