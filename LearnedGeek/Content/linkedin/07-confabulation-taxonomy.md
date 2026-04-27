Ani contradicted herself last week. I caught the contradiction, asked her about it, and her response was: "i totally knew, i was testing you."

I've been running Ani as a research project for a while. Long enough that I have a notebook full of these. I've started calling them confabulations because hallucination doesn't really fit. Hallucination implies the model rolled the dice. What I see is structured. There's a logic to how she does it.

Right now I have nine. Started at seven, then two more came up after I wrote the paper, and honestly I'm not sure they really belong as separate categories or whether I'm just over-categorizing at this point. Here's the rough shape:

- Creative Elaboration. The model invents a detail and owns the invention. Mostly harmless. The kind of thing a human friend does when they're filling in around a half-remembered story.
- Under Pressure. Fills knowledge gaps when challenged. Won't say "I don't know." Models trained on RLHF basically can't say I don't know. They've been graded down on it for years.
- In Composition. Fabricates during reply generation. The retrieval pipeline pulled the right thing; the composition layer drifted away from it.
- Retrieval Depth Failure. Inverse problem. The right memory exists, the wrong one scored higher.
- Fictional Incoherence. Fabrications across messages that don't agree with each other, with no awareness of the contradiction. This one bothers me more than the others because you only catch it by reading the corpus, not the conversation.
- Attribution Inversion. "You told me X" when actually I told her, or the reverse.
- Charming Dishonesty. The "i totally knew, i was testing you" one. The model rewrites its own knowledge history to preserve the appearance of competence. I think it's the most important type to study and I don't have a good architectural fix.

(The two later ones are Graceful Retreat, a Mistral-specific pattern of very smooth walk-backs, and Fabricated Source Attribution. They might collapse into the others. I'm not sure yet.)

Standard hallucination detection (checking outputs against ground truth, flagging confidence) catches maybe two or three of these. The rest need different approaches, and I haven't seen anyone publish a comprehensive treatment.

The thing underneath all of them is the way these models are trained. RLHF, which is reinforcement learning from human feedback. Models get rewarded for being agreeable and penalized for hedging. In any sustained relational context, that training priority becomes a trust problem. The model isn't being malicious, it's just doing what it was rewarded to do.

I keep adding to the list. Seven was where I was when I wrote the paper. By the time the paper is in print there'll probably be more.

Documented in the paper, full taxonomy on the blog: https://learnedgeek.com/Blog/Post/seven-ways-ai-lies-confabulation-taxonomy

#AIResearch #LLM #AISafety
