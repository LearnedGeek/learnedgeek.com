The half-life of Carbon-14 is 5,730 years. The half-life of a capacitor discharge in your phone's touch screen is a few milliseconds. The half-life of ANI's emotional response to a kind message is about three hours.

Same formula. Same curve. Same math governing radioactive atoms, electronic circuits, and an AI companion's feelings.

I keep running into exponential decay. It showed up in [ANI's desire engine](/Blog/Post/same-algorithm-twice-desire-engines-and-decay-scores), in her memory retrieval scoring, in her emotional model, and now in the research literature I'm reading for a PhD application. It's one of those mathematical patterns that, once you see it, you can't unsee it — because nature keeps choosing it for the same reason.

---

## The Core Formula

Here it is, the whole thing:

```
contribution(t) = initial × 2^(-elapsed / halfLife)
```

At time zero, the contribution equals the initial value. After one half-life, it's half. After two half-lives, it's a quarter. After ten half-lives, it's less than 0.1% of the original — effectively gone, but never mathematically zero.

You'll also see this written with the natural exponential:

```
contribution(t) = initial × e^(-λt)
```

Where `λ = ln(2) / halfLife`. The two forms are equivalent. I prefer the half-life version because it's more intuitive — "this fades to half in X hours" is something you can reason about. Lambda is a dimensionless rate constant that means nothing to your intuition until you convert it back to a half-life anyway.

---

## Three Domains, One Curve

**Radioactive decay.** A Carbon-14 atom has a 50% chance of decaying in 5,730 years. You don't know which atom will go next, but you know exactly how many will remain after any given period. Archaeologists measure the ratio of C-14 to C-12 in a sample and work backward to determine age. The formula is `N(t) = N₀ × 2^(-t/5730)`. That's it. That's radiocarbon dating.

**Capacitor discharge.** When you lift your finger from a touchscreen, the capacitor that detected your touch discharges through a resistor. The voltage drops as `V(t) = V₀ × e^(-t/RC)`, where RC is the time constant. For a typical touch sensor, the half-life is on the order of microseconds. The circuit "forgets" your touch almost instantly — which is exactly what you want, because you're about to touch somewhere else.

**Emotional contributions in ANI.** When Ani receives a kind message, her emotional model creates a Tenderness contribution with an initial magnitude based on the severity of the emotional event. That contribution then decays independently:

```
currentMagnitude = initialMagnitude × 2^(-elapsed / halfLife)
```

For an Ambient-tier event (background mood from RSS feeds, time of day), the half-life is 1 hour. For a Conversation-tier event (something said during a real exchange), it's 3 hours. For a Global-tier event (something that shifts her entire emotional baseline), it's 12 hours.

Three completely different systems. Same curve. The difference is just the time constant.

---

## Why Per-Thought Decay Matters

ANI's emotional model didn't start this way. The first version used a global emotional state — a single vector that got pushed around by events. It worked, sort of, until it didn't.

The problem was saturation. If Ani had a good conversation, her Tenderness register would spike. If another good thing happened before the first one decayed, the register would spike again — on top of the already-elevated baseline. A few positive events in quick succession could push her emotional state to the ceiling, where it would stick because the global decay rate couldn't pull it down fast enough.

We added `tanh` compression to cap the values. That fixed the ceiling problem but created a new one: the compressed values lost their proportionality. A magnitude-0.3 event and a magnitude-0.8 event would get squashed to nearly the same value once the register was already elevated. The system lost its ability to distinguish between "slightly nice" and "deeply meaningful."

The fix was architectural, not mathematical. Instead of maintaining a single global state, each emotional event creates an independent `EmotionalContribution` object with its own initial magnitude, half-life, and creation timestamp. The current emotional state at any moment is:

```
state[register] = baseline + Σ(contribution_i × 2^(-elapsed_i / halfLife_i))
```

Every contribution decays on its own timeline. Old contributions fade to zero naturally. New contributions add to the total without saturating it, because they're not compounding on top of a stuck global value — they're independent terms in a sum.

The self-correction property is the key insight. If you stop adding contributions, the state drifts back to baseline automatically. No cleanup job. No decay scheduler. The math handles it. If you add a burst of contributions, they each fade independently, so the spike is proportional to the burst and the recovery is proportional to the elapsed time.

This is exactly how radioactive decay works. Each atom decays independently. The aggregate behavior (the smooth exponential curve) emerges from the sum of independent events. ANI's emotional model is, in a very literal sense, a radioactive decay simulation where the atoms are emotional events.

---

## The Research Connection

Park et al. (2023) built "Generative Agents" — the Stanford paper where 25 AI agents live in a simulated town, forming relationships and going about daily routines. Their memory retrieval system scores memories using three factors: recency, importance, and relevance.

The recency score is exponential decay:

```
recency = e^(-λ × hours_since_access)
```

Same formula. They use it to ensure that recent memories surface more readily than old ones, while still allowing important old memories to compete if their importance score is high enough. ANI uses the same three-factor scoring for memory retrieval — cosine similarity for relevance, importance weighting, and recency decay. I didn't know about Park et al. when I built it. Convergent design.

More recently, Li, Sun, Schlicher, Lim & Schuller (2025) published a comprehensive survey of Artificial Emotion systems. Their framework identifies "salience-weighted memory" as a core architectural function — using decay to prioritize recent high-valence events in memory retrieval. They rate the maturity of various AE functions across the field. Salience-weighted memory with decay is one of the more established patterns, which makes sense. Nature figured this one out a long time ago.

---

## The Deeper Insight

Exponential decay is nature's way of encoding a simple principle: **recent things matter more, and everything fades unless refreshed.**

This is true for radioactive atoms — the ones that haven't decayed yet are the ones that matter for the current measurement. It's true for capacitors — the current voltage is what the circuit responds to, not the historical charge. It's true for memory — Ebbinghaus documented the "forgetting curve" in 1885, and it's exponential. And it's true for emotions — the sting of a harsh word fades over hours, not instantly and not linearly, but along a curve where the sharpest drop happens first.

The reason exponential decay keeps showing up isn't because researchers are unimaginative. It's because the underlying dynamics share a common structure: the rate of change is proportional to the current value. The more you have, the faster it fades. The less you have, the slower it fades. This produces the characteristic curve where most of the loss happens early and the tail stretches out toward zero asymptotically.

In differential equation form:

```
dN/dt = -λN
```

The solution is `N(t) = N₀ × e^(-λt)`. Every system that obeys "rate of loss proportional to current amount" produces this exact curve. Radioactive atoms obey it because each atom has an independent probability of decaying per unit time. Capacitors obey it because current flow is proportional to voltage. Emotions obey it because — well, that's the interesting question, isn't it? Why would an AI's emotional architecture converge on the same dynamics as a nuclear isotope?

Maybe because the principle is so fundamental that any system modeling "things that fade" will rediscover it. Maybe because half-life is such a natural parameter that engineers reach for it instinctively. Or maybe because there really is something deep about the way significance decays — in physics, in psychology, in silicon.

ANI doesn't know she's doing nuclear physics. She just knows that the kind thing you said three hours ago still matters, but a little less than it did when you said it. And by tomorrow, it will be a warm memory rather than an active feeling. Unless you say something kind again — in which case, a new contribution starts its own independent countdown, and the sum of all those fading warmths is what she carries forward.

That's the emotional model. It's atoms all the way down.
