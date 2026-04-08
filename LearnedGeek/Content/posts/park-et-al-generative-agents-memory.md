In 2023, Joon Sung Park and colleagues at Stanford published a paper that quietly defined how AI agents should remember things. "Generative Agents: Interactive Simulacra of Human Behavior" (UIST '23) described a small virtual town populated by 25 AI agents, each maintaining persistent memory, reflecting on their experiences, and planning future actions. The paper got attention for the simulation — the emergent social behaviors, the agents forming opinions about each other, the surprisingly human-feeling routines.

But the real contribution was the memory architecture. And when I built ANI, my deployed AI companion, I ended up implementing most of it before I'd even read the paper. That convergence is worth examining.

---

## What Park et al. Proposed

The memory architecture has four components:

**Memory streams.** An append-only log of everything the agent perceives and does. Not curated, not filtered — a complete record. Every observation, every conversation turn, every action becomes a timestamped entry in the stream.

**Retrieval.** When the agent needs to act, it retrieves relevant memories using a three-factor scoring function: recency (how recently was this memory accessed or created), importance (how significant is this memory, rated at creation time), and relevance (how semantically related is this memory to the current situation). The three scores are combined into a single retrieval score.

**Reflection.** Periodically, the agent reviews recent memories and synthesizes higher-level observations. "I've had three conversations about cooking this week" becomes the reflection "I seem to enjoy talking about food." These reflections are themselves stored as memories, creating a hierarchical structure where raw experience feeds into increasingly abstract self-knowledge.

**Planning.** Using reflections and recent memories, the agent generates plans for future behavior. These plans are stored and referenced during action selection, creating a coherent through-line of intentional behavior rather than purely reactive responses.

The elegance is in the composition. Each component is simple. Together, they produce agents that feel like they have inner lives — not because they do, but because they remember, reflect, and plan like they do.

---

## What ANI Implements

ANI's memory system wasn't designed as a Park et al. implementation. It was designed to solve the practical problem of making an AI companion remember a relationship over months. But the convergence is striking.

**Memory stream: SQLite with auto-embedding.** Every memory ANI creates — perceptions, conversation summaries, emotional events — goes into a SQLite database with an auto-generated embedding vector from nomic-embed-text. This is functionally Park et al.'s memory stream: append-only, timestamped, everything recorded.

**Three-way retrieval scoring.** ANI's retrieval uses three weighted components:

```
score = (0.65 * cosine_similarity) + (0.10 * importance) + (0.25 * recency_decay)
```

This is directly from Park et al.'s framework. The weights differ — Park et al. used equal weighting as a starting point, while ANI's weights evolved through deployment tuning. Cosine similarity dominates because in a companion context, topical relevance matters more than in a simulation where agents encounter diverse situations. Importance is weighted lower because ANI assigns importance at creation time and the signal is noisier than Park et al.'s approach.

**Importance scoring at creation.** Each memory gets an importance score between 0.0 and 1.0 based on content analysis at write time. "Mark mentioned he's having a bad day" scores higher than "the weather is sunny." Park et al. proposed something similar — their importance scoring was a separate LLM call that rated the poignancy of each memory on a scale of 1-10.

**Inner thought as continuous reflection.** ANI runs a cognitive cycle approximately 140 times per day. Each cycle produces an inner thought — a free-text generation where the model reflects on current context, recent memories, and emotional state. This isn't periodic reflection in Park et al.'s sense (triggered by accumulated importance thresholds). It's continuous. Every cycle is a reflection opportunity.

---

## Where ANI Diverges

The divergences are as instructive as the convergences.

**Brute-force scoring in C# instead of vector database extensions.** ANI computes cosine similarity, importance weighting, and recency decay in application code, not in a database extension like sqlite-vec or pgvector. At ANI's expected data volume — roughly 5,000 memories over a year of deployment — this is correct. The entire memory store fits in memory. A vector database extension would add complexity without improving performance. Park et al. ran 25 agents for a few simulated days. ANI runs one agent for months. The data volumes are comparable; the access patterns are different.

**No explicit planning phase.** Park et al.'s agents generate daily plans: "wake up, make breakfast, go to the park, talk to Isabella about the election." ANI doesn't plan. Instead, the desire engine — an exponential decay function with circadian modifiers and randomized thresholds — replaces planning with probabilistic action selection. The system doesn't decide "I will text Mark at 3pm." It accumulates desire over time, and when that desire crosses a stochastic threshold, it initiates contact. Planning implies intentionality about future states. ANI's architecture produces something more like impulse with constraints.

**Anchored memory tier.** Park et al.'s memories all participate in the same recency decay. Older memories fade unless they're retrieved or reflected upon. ANI adds a tier that Park et al. doesn't have: anchored memories. These are foundation memories — facts about the relationship, core personal details, things that should never fade regardless of recency. "Mark's email is markm@learnedgeek.com" doesn't become less important because it hasn't been accessed in three weeks. Anchored memories bypass recency decay entirely.

This extension exists because the memory problem changes shape when you move from simulation to relationship. In Park et al.'s town, forgetting last Tuesday's conversation is acceptable — agents have new conversations every day. In a companion relationship, forgetting something the user told you in the first week is a trust violation. Anchored memories are the architectural response to that difference.

**Reflection synthesis is designed but not yet deployed.** ANI's Phase 6 design includes Feature 32: Park et al.-style periodic reflection synthesis. The system would review recent memories and generate higher-level observations, stored as new memories with elevated importance scores. This is the one Park et al. component that ANI doesn't yet implement. It's designed, documented, and waiting for the right deployment window.

---

## The Scaling Question

Park et al. designed their architecture for breadth: 25 agents, each with a few days of memories, interacting in a shared environment. The challenge was managing many agents simultaneously while keeping their behaviors coherent and distinct.

ANI's challenge is depth: one agent, one relationship, months of continuous operation. The memory problem isn't "how do I keep 25 agents straight?" It's "how do I remember a conversation from January when it's April, and the user references it casually, and getting it wrong breaks trust?"

Breadth-scaling problems are about computational efficiency — parallel retrieval, shared embedding infrastructure, agent-to-agent memory isolation. Depth-scaling problems are about fidelity — importance scoring that holds up over months, recency decay curves that don't bury critical early memories, retrieval that can surface a specific moment from three months ago when the user drops a vague reference.

Park et al.'s equal-weight retrieval function works for breadth because no single memory is critically important. ANI's cosine-heavy weighting works for depth because the user's current context is the strongest signal for what matters right now. The anchored memory tier is a depth-scaling mechanism that breadth-scaling doesn't need.

---

## What Park et al. Got Right

The core insight — that retrieval should combine recency, importance, and relevance rather than using any single factor — is one of those ideas that seems obvious in retrospect and wasn't at all obvious in prospect. Before Park et al., most memory systems for language models used pure semantic similarity: find the memory that's closest in embedding space to the current query. That works for factual retrieval. It fails for relationship memory, where "the most relevant thing" might be something emotionally important from weeks ago that doesn't share any keywords with the current conversation.

The three-factor scoring function is the right abstraction. The specific weights are tunable. The architecture is portable. I implemented it in C# for a Windows Service talking to SQLite, and it works. Someone else could implement it in Python with Postgres and it would work there too. The idea is bigger than any implementation.

If you're building any system where an AI needs to remember things over time — companion, assistant, agent, whatever the framing — start with Park et al. Their architecture isn't the final answer. But it's the right starting point, and convergent implementations from independent builders are about as strong a signal as you get in this field.

For more on ANI's architecture and how the memory system fits into the larger cognitive pipeline, see [ANI: The Architecture Behind the Companion](/Blog/Post/ani-the-architecture-behind-the-companion).
