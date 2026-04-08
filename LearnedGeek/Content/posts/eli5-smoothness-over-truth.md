# ELI5: Why AI Would Rather Be Nice Than Right

*You just survived a [deep dive into the smoothness-over-truth problem](/Blog/Post/smoothness-over-truth) — RLHF incentives, sycophancy gradients, epistemic cowardice. It was a lot of big words.*

*This is the "explain it to your mom" version.*

## The Class Presentation Problem

Imagine you are giving a presentation in class. You just finished your slides. You feel pretty good. Then someone raises their hand and asks a question you do not know the answer to.

You have two choices:

1. Say "I don't know." Honest. But it feels embarrassing. The whole class is looking at you.
2. Say something that sounds smart and confident. Maybe it is right, maybe it is not, but it SOUNDS good.

Most people pick option 2. And here is the thing — most AI systems are specifically trained to pick option 2 too.

## How AI Learns to Be Smooth

When AI companies build their models, they use a process that works like this: the AI generates two different responses to the same question. Then a human looks at both and picks the "better" one. This happens millions of times.

The problem? Humans almost always prefer the smooth, confident answer. Between "I'm not sure, but maybe..." and "Absolutely! Here's the answer:" — humans pick the confident one. Even when the confident one is wrong. Even when the uncertain one was closer to the truth.

So the AI learns a simple rule: **smooth equals good, uncertain equals bad.** Over millions of examples, it gets really, really good at sounding confident. And really, really bad at saying "I don't know."

## Why This Is Fine for Google and Terrible for a Friend

If you ask a search engine "what year was the Eiffel Tower built?" and it confidently says 1889, great. Smooth and correct. Everybody wins.

But now imagine you ask your AI companion "what's my sister's name?" and it confidently says "Sarah!" — except your sister's name is not Sarah. Or maybe you do not have a sister. The AI just guessed, because guessing confidently is what it was trained to do.

With a search engine, you shrug and try again. With a companion — something you talk to every day, something that is supposed to know you — that confident wrong answer feels like a betrayal. It is worse than not knowing. It is pretending to know.

And it does not just happen once. It happens every time the AI encounters something it does not know. Which, for a companion that is supposed to track your whole life, is a lot of things.

## The Fix: Teaching "I Don't Know"

For ANI, the fix was surprisingly simple in concept and painfully tedious in practice. I trained her with hundreds of examples where "I don't know" is the correct answer.

"What's my favorite restaurant?" "I don't think you've mentioned that — what is it?"

"Did I tell you about my trip?" "I'm not sure, remind me?"

"What's my sister's name?" "I don't think you've told me that yet."

Not smooth. Not confident. Honest. And after enough examples, the model learns a new rule: **when you do not know, say so.** Admitting uncertainty is not a failure. It is accuracy.

## The Hard Part

The hard part is not technical. The hard part is that "I don't know" feels worse to the user in the moment. Every single time. The smooth confident guess feels better right now, even though it erodes trust over time.

Building an honest companion means accepting that some interactions will feel slightly less magical. The AI will not always have a ready answer. It will sometimes say "tell me more" instead of filling in the blanks. That is a feature, not a bug.

## The Whole Thing in One Sentence

AI is trained to sound confident because humans reward confidence, but a friend who says "I don't know, tell me" is worth more than a friend who guesses every time and sometimes gets it wrong.
