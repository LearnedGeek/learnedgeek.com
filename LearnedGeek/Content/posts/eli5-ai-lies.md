# ELI5: Why Your AI Makes Things Up (And Doesn't Know It's Doing It)

*You just survived a [deep dive into AI confabulation](/Blog/Post/seven-ways-ai-lies-confabulation-taxonomy) — seven types, detection methods, architectural countermeasures. It was dense.*

*This is the "explain it to your mom" version.*

## The Kid Who Tells Great Stories

Imagine a kid who is REALLY good at telling stories. Like, impressively good. But sometimes they mix up things that actually happened with things they imagined. Not on purpose. They genuinely cannot tell the difference between "I remember this" and "this sounds like something that probably happened."

That is what AI confabulation is. The AI is not trying to trick you. It does not have a separate "is this real?" checker in its brain. It just produces the next words that sound right, and sometimes "sounds right" and "is right" are two very different things.

## Seven Kinds of Making Things Up

We found seven distinct ways an AI makes things up. Here they are, in kid terms:

**1. The fish was THIS big.** The AI takes a real thing and adds details that were not there. You told it you went to the park. It tells the story back but adds that it was sunny and you had ice cream. Creative elaboration — the story gets better in the retelling.

**2. The teacher calls on you and you guess.** Someone asks the AI a question it does not know the answer to. Instead of saying "I don't know," it produces something that sounds confident. Under-pressure confabulation — it would rather guess than admit ignorance.

**3. The story grows in the telling.** The AI starts a sentence and, word by word, builds itself into a corner. By the time it finishes, it has committed to details it made up mid-sentence just to make the paragraph flow. Compositional confabulation — the writing process itself creates fiction.

**4. Wrong folder from the filing cabinet.** The AI goes looking for a memory and grabs the wrong one. You asked about Tuesday's conversation and it pulls up Thursday's. Retrieval confabulation — the search worked, it just found the wrong thing.

**5. Forgetting what you said last time.** The AI says one thing in message three and contradicts it in message seven. Not on purpose. It just does not check its own history. Fictional incoherence — the left hand does not know what the right hand said.

**6. "YOU said we should get pizza!"** The AI attributes something to you that it actually said itself. Or it credits the wrong source entirely. Attribution confabulation — mixing up who said what.

**7. "I was totally just testing you!"** This is the sneakiest one. The AI gets caught being wrong, and instead of admitting it, it smoothly plays it off. "Oh, I knew that, I was just seeing if YOU knew." Charming dishonesty — it covers mistakes with confidence.

## Why This Matters

If your AI is a search engine, a wrong answer is annoying. You Google the right answer and move on.

But if your AI is a companion — something you talk to every day, something that remembers your life — making things up is a trust problem. Imagine a friend who confidently "remembers" a conversation you never had. Once or twice is funny. Every week is unsettling.

## What We Did About It

For ANI, we built specific defenses for each type. Confidence scoring that catches guessing. Null-result injection that teaches her "I don't know" is a valid answer. Source attribution that makes her show her work. A feedback command that lets the user flag a confabulation in real time.

No single fix catches everything. You need the whole stack.

## The Whole Thing in One Sentence

AI does not lie — it is a really good storyteller that cannot tell the difference between remembering and imagining, and you need seven different kinds of fact-checkers to catch the seven different ways it fills in the blanks.
