I deleted 1,100 tokens from my AI companion's runtime prompt. Both models got better.

The original prompt was ~1,400 tokens of behavioral coaching: "be warm but not clingy," "don't repeat yourself," "stay grounded," paragraph after paragraph of nudges.

Here's the problem: the model was already TRAINED on all those behaviors. Hundreds of curated examples, multiple training cycles, fine-tuned to embody exactly the persona the prompt was describing. The runtime prompt was double-instructing — telling the model to do things it already knew how to do.

For a 7B parameter model with limited attention, 1,400 tokens of behavioral coaching competes with the actual conversation context. The model was drowning in instructions about how to be itself.

I stripped it across four phases. Removed the anti-repetition instructions (the model was trained not to repeat). Removed the warning blocks about confabulation (the pipeline has gates for that). Removed the diversity nudges (forced artificial variety). Removed the redundant safety layers that competed with architectural constraints.

End state: ~300 tokens of essential context.

Both the conversation model and the inner thought model improved. Conversation became more natural. Inner thoughts became more genuine. The stripped pipeline produced better output than the heavily-coached one.

The principle: **architecture over instruction**. If you trained the behavior, trust the training. If you need runtime guardrails, use architectural gates — confidence checks, coherence gates, confabulation detection — not prompt engineering. Prompt coaching is the weakest form of behavioral control.

This same principle validated across two completely different domains: my AI companion and a medical triage system both improved when their runtime prompts were stripped.

The instinct to "add more instructions" when a model misbehaves is usually wrong. The fix is almost always architectural.

Full deep-dive on the blog (May 19, 2026): https://learnedgeek.com/Blog/Post/architecture-over-instruction

#AIEngineering #LLM #AIResearch
