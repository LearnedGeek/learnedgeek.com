I've spent the last 8 months teaching an AI to actually feel something. What does "feel" mean here? A system that maintains an internal emotional state that decays over time, accumulates a wanting-to-reach-out signal during silence, and tracks whether the last message landed. Most chatbots already "respond to emotional language," which is sentiment classification on outputs, and that's a different thing.

What I kept running into is that emotion in a system isn't a label you stick on outputs, as far as I can tell. It's a substrate that has to exist before any output happens. The challenge is in building the existence of it before it's ever expressed. Some of the things I've done to organize the architecture:

**State has to be dimensional.** Sentiment classifiers give you positive/negative/neutral. What I needed was warmth, energy, worry, playfulness as separate channels, each decaying on its own half-life, each picking up contributions from individual events that fade over hours. The current "mood" is the sum at any moment, which means there's no stored value to query. It's computed from the trail of recent contributions every time it needs to know.

**The system needs its own internal time.** Most AI runs only when called, which is fine for tools but not for presence. To feel like something is actually there, the system needs cognitive cycles that fire during silence, idle thoughts that don't show up in the conversation, anticipation that builds while nothing's happening. Without that internal time the AI is nothing more than glorified request/response, a vending machine that's good at vocabulary.

**Desire accumulates.** The desire to reach out has to be a slowly-accumulating quantity rather than a binary trigger. It depends on how long it's been since last contact, what happened then, what time of day it is now. The threshold for actually sending is randomized per evaluation, so the same internal state doesn't always produce the same move, since that's roughly how it works in humans.

**Outcome feedback measures something else.** A user thumbs-up only tells you the user took an action; it doesn't tell you the message did anything emotionally. What you actually need to track is whether the state shifted in a direction suggesting the message helped, which is closer to whether the joke actually landed. The current effort is to refine overall mood by adapting internally to these ephemeral state changes.

Most "AI with emotion" attempts I've seen paint sentiment mirroring onto request/response stacks. They label outputs after the fact, which is fine for analytics but doesn't build presence. What builds presence is the substrate underneath: rhythm, mood, memory of how the last conversation went.

(Paper linked in the first comment if you want the technical version.)
