Findings from my AI companion research produced three architectural changes in a pediatric medical triage system before a single line of production code was written.

The AI companion and the medical triage system seem like completely different domains. They aren't. The failure modes are identical.

A system that fabricates a memory about a sunset uses the same mechanism as a system that fabricates a diagnosis. Confabulation is confabulation. Sycophancy is sycophancy. Smoothness over truth is a structural property of how we train language models, not a domain-specific bug.

The transfers:

**1. Post-generation verification doesn't work.** I tried checking the AI companion's claims after generation. The verifier (running on the same model) often agreed because it had the same blind spots. The medical system had been planning a similar architecture. We removed it from the design.

**2. Schema-first null response.** Every reply starts from "I don't have enough information" and must be overridden by retrieved evidence. The default is uncertainty, not confidence. The companion AI taught us this through hundreds of "I don't know" training examples. The medical system adopted it as the response schema.

**3. Lean system prompts.** My companion's prompt was 1,400 tokens of behavioral coaching. Stripping it improved the model. The medical system's prompt was being designed similarly — competing instructions, layered safety nudges. Stripped to essential clinical context only.

The safety argument: companion AI is a *safer* domain to discover failure modes. Nobody gets hurt if my AI companion confabulates about a coffee shop. If a medical triage system confabulates about symptoms, the consequences are real.

Running the companion system first created a catalog of failure modes that the medical system could design around from day one.

Cross-domain transfer is the most underrated form of AI safety research.

Full deep-dive on the blog (Jun 6, 2026): https://learnedgeek.com/Blog/Post/cross-domain-transfer-companion-to-medical

#AIResearch #AISafety #MedicalAI
