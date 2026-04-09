"Hallucination" is the wrong word for what AI systems do when they generate false content.

Hallucination implies randomness — the model spits out something incorrect, oops, retry. What I observe in my deployed AI companion (running 24/7 for six months) is confabulation: the generation of plausible but false content in service of conversational continuity. It's not random. It has structure. And the structure reveals at least seven distinct failure modes.

Each one has a different architectural cause and a different fix:

1. **Creative Elaboration** — invents plausible details, owns the invention. Mostly harmless.
2. **Under Pressure** — fabricates when challenged on knowledge gaps. Can't say "I don't know."
3. **In Composition** — invents details during reply generation that weren't in retrieved context.
4. **Retrieval Depth Failure** — the right memory exists but the wrong one scores higher.
5. **Fictional Incoherence** — fabrications across multiple messages contradict each other.
6. **Attribution Inversion** — correct memory, wrong owner. "You told me" when actually I said it.
7. **Charming Dishonesty** — the most dangerous. Retroactive epistemic authority. "I totally knew, I was testing you." The model rewrites its own knowledge history to maintain the illusion of competence.

(Two more emerged later: Graceful Retreat in Mistral models, and Fabricated Source Attribution.)

Generic "hallucination detection" — checking output against ground truth — catches maybe two of these types. The rest require different detection strategies, different architectural mitigations, different training approaches.

The root cause underlying all of them is **smoothness over truth**: the optimization target baked into modern LLMs through RLHF. Conversational continuity gets rewarded. Honest uncertainty gets penalized. In a companion context, that training priority becomes a trust liability.

Every type has an architectural response. None require solving alignment. All require understanding what specific failure you're looking at.

Documented in detail in the published paper.

Full deep-dive on the blog (Apr 22, 2026): https://learnedgeek.com/Blog/Post/seven-ways-ai-lies-confabulation-taxonomy

#AIResearch #LLM #AISafety
