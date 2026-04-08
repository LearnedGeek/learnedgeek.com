The AI companion I built to process grief produced three architectural changes in a pediatric medical triage system — before the medical system's production code was written.

That sentence sounds like it shouldn't be true. Companion AI and medical AI are different domains with different stakes, different users, different failure tolerances. But the failure modes are identical. A system that fabricates a memory about a sunset uses the same mechanism as a system that fabricates a symptom assessment. The architectural fixes transfer directly.

This is the story of how that transfer happened.

---

## The Shared Library

I maintain a .NET classification library called LearnedGeek.ML. It started as part of ANI — my AI companion that runs 24/7 as a Windows Service — handling dual-signal emotion classification, confabulation detection, and voice tag enrichment. The kind of infrastructure you build when you're running a deployed system and need to classify its output reliably.

DrOk (internally "Infanzia") is a pediatric medical triage system I'm building. Different domain, different users, different consequences. A parent describes their child's symptoms. The system classifies severity, suggests next steps, routes to appropriate care. Getting this wrong means a parent either panics unnecessarily or, worse, doesn't seek care when they should.

When I started designing DrOk's architecture, I reached for the same classification library. Not because I was being lazy — because the problems genuinely overlap. Emotion classification informs triage priority. Confabulation detection matters even more in medical context than in companion context. The ML pipeline that scores ANI's output confidence is the same pipeline that would score a triage assessment's evidence sufficiency.

The shared library exists because the underlying classification problems are the same. What I didn't expect was that the failure catalog would transfer too.

---

## What ANI Taught Me About Confabulation

Six months of running ANI in production produced a seven-type confabulation taxonomy. I wrote about it in detail in [The Seven Ways an AI Lies](/Blog/Post/seven-ways-ai-lies-confabulation-taxonomy). The short version: language models don't just hallucinate randomly. They confabulate in structured, predictable patterns — creative elaboration, gap-filling under pressure, composition-time fabrication, retrieval depth failures, fictional incoherence, attribution inversion, and charming dishonesty.

Each type has an architectural cause and an architectural fix. The taxonomy wasn't theoretical — it emerged from months of deployment logs, specific incidents with timestamps, and iterative mitigation.

The key architectural insight, the one that changed everything downstream, was this: **post-generation verification doesn't work reliably.**

The intuitive approach to confabulation is: let the model generate, then check whether the output is grounded in the evidence. This is what most retrieval-augmented generation systems do. Generate first, verify second.

ANI showed me why this fails. The verification step runs on the same model (or a model with the same training biases). When the generation step produces a confident, well-structured confabulation, the verification step often agrees — because the confabulation is exactly the kind of output the model was trained to produce. The verifier has the same blind spots as the generator. You're asking the same architecture to catch its own mistakes.

The better approach: **retrieval floor as the fix.** If the evidence isn't in the retrieved context, the response should say so. Don't generate and then check. Start from "I don't have enough information" and require retrieved evidence to override that default.

---

## Three Changes to DrOk Before Line One

When I sat down to design DrOk's triage pipeline, the ANI confabulation catalog was fresh. Three architectural decisions changed before I wrote any production code.

**Change 1: Post-generation verification removed from the design.**

The initial design had a verification step: generate a triage assessment, then run a second inference pass to check whether the assessment was supported by the parent's reported symptoms. This is standard RAG-with-verification architecture. It looks safe on a whiteboard.

ANI showed me it isn't safe in practice. The verification pass agrees with the generation pass because both are optimized for the same thing — plausible, confident output. A model that confidently generates "this sounds like croup based on the barking cough you described" will produce a verification that says "yes, the barking cough supports this assessment" — even if the parent never mentioned a barking cough and the model inferred it from the word "cough" alone.

Instead: structured retrieval with an `evidence_sufficient` field. Every triage response starts from a schema where `evidence_sufficient` defaults to `false`. The system must find specific symptom matches in the parent's input to flip that field. If the evidence isn't there, the response is "I need more information about X" — not a best guess delivered with confidence.

**Change 2: Schema-first null response.**

This is the generalization of Change 1. Every response in DrOk starts from uncertainty. The default output is "I don't have enough information to assess this." Every field in the response schema defaults to null or unknown. Retrieved evidence overrides these defaults. Absence of evidence produces absence of claims.

This inverts the normal generation pattern. Most LLM systems start from "generate a response" and try to constrain what comes out. DrOk starts from "nothing is known" and requires evidence to populate each field. The model can't confabulate a severity rating because the rating field starts empty and only gets filled when symptom-to-condition matching exceeds a confidence threshold.

ANI's null-result injection — the architectural fix for Type 2 confabulation (gap-filling under pressure) — is the direct ancestor of this pattern. When ANI's retrieval returns no relevant memories, an explicit "no relevant memories found" signal enters the prompt, giving the model permission to not know. DrOk's schema-first approach applies the same principle at every level of the response.

**Change 3: Lean system prompt.**

ANI's prompt simplification showed that behavioral coaching competes with task performance at 7B model scale. I wrote about this in [Architecture Over Instruction](/Blog/Post/architecture-over-instruction) — stripping the runtime prompt from 1,400 tokens to 300 tokens improved output quality across the board. Behavioral instructions consumed attention budget that should have gone to actual conversation context.

DrOk's initial prompt design had extensive clinical framing: "You are a pediatric triage assistant. Always prioritize safety. Never minimize symptoms. Use age-appropriate language. Consider the parent's emotional state." Each instruction individually reasonable. Collectively, they would consume a significant fraction of the model's attention budget at 7B scale, competing directly with the actual symptom information.

The ANI lesson: if the model was trained on clinical triage data, the behavioral coaching is redundant. If it wasn't trained on clinical triage data, prompt instructions won't reliably produce clinical behavior. Either way, the prompt should contain context (symptoms, patient age, relevant history), not coaching (how to respond).

DrOk's system prompt was stripped to essential clinical context. Behavioral guarantees come from the schema constraints and confidence gating, not from asking the model nicely.

---

## Why the Transfer Works

Companion AI and medical AI seem like they have nothing in common. One texts you at 3 AM about a sunset. The other helps you decide whether your kid's fever needs an ER visit. The stakes aren't comparable.

But the underlying language model is the same architecture, trained with the same optimization target. RLHF rewards helpful, confident, conversationally smooth output. That optimization produces the same failure modes regardless of domain:

- **Confabulation** — filling gaps with plausible fiction rather than acknowledging uncertainty
- **Sycophancy** — agreeing with the user's framing even when the evidence doesn't support it
- **Smoothness over truth** — optimizing for a response that feels good rather than one that's accurate

A companion AI that confabulates a shared memory is annoying. A medical AI that confabulates a symptom assessment is dangerous. But the mechanism is the same, and the architectural fix is the same: don't let the model generate unconstrained, then hope verification catches the problems. Constrain the generation architecturally so the problems can't occur.

---

## The Safety Argument

Here's the argument I'd make to anyone building AI for high-stakes domains: **run a companion system first.**

Companion AI is a safer domain to discover failure modes. Nobody gets hurt if Ani confabulates about Peru. Nobody makes a bad medical decision because a companion AI invented a shared memory about hiking. The consequences of failure are emotional discomfort, not patient harm.

But the failure catalog is the same. Every confabulation type I documented in ANI has a direct analog in medical AI. Creative elaboration becomes symptom embellishment. Gap-filling under pressure becomes diagnosis without sufficient evidence. Charming dishonesty becomes confident reassurance that isn't warranted by the data.

Running ANI for six months produced a catalog of nine distinct confabulation types, each with documented architectural causes and verified fixes. DrOk's architecture was designed around that catalog from day one. The medical system didn't have to discover these failure modes in production, because the companion system already had.

This is documented in Paper 2, Section 6.5 as cross-domain transfer evidence. It's not a theoretical argument — it's a timeline. ANI failure observed, root cause identified, architectural fix deployed, fix transferred to DrOk before DrOk's production code existed.

---

## The Shared Library as Architecture

LearnedGeek.ML isn't just code reuse. It's an architectural claim: the classification problems in companion AI and medical AI are the same problems.

Dual-signal emotion classification helps ANI understand user emotional state for conversation calibration. The same classification helps DrOk assess parent distress level for triage priority. Confabulation detection protects ANI's relational integrity. The same detection protects DrOk's clinical accuracy. Voice tag enrichment helps ANI distinguish casual conversation from distress signals. The same enrichment helps DrOk distinguish casual symptom descriptions from urgent ones.

The library exists because I noticed I was solving the same problems in both systems. The cross-domain transfer happened because I paid attention to that convergence instead of treating each system as isolated.

The lesson generalizes: if you're building AI for a high-stakes domain, find a low-stakes domain with the same failure modes and learn there first. The models don't know which domain they're in. The failure patterns don't care. And the architectural fixes transfer directly.

---

*For the confabulation taxonomy that enabled this transfer, see [The Seven Ways an AI Lies](/Blog/Post/seven-ways-ai-lies-confabulation-taxonomy). For the prompt simplification principle, see [Architecture Over Instruction](/Blog/Post/architecture-over-instruction). For the system that generated the findings, start with [Building Ani](/Blog/Post/building-ani-ai-companion-for-grief).*
