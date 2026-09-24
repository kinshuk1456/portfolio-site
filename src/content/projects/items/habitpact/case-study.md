## The behavior problem

Habit trackers are mostly a mirror. They show you the streak you kept or the streak you broke, and then they rely on the same willpower that was already failing you to fix it. The behavior-change research points somewhere more social: people follow through when someone they respect is watching, and when there's something real on the line.

HabitPact takes that seriously. The unit isn't a solo streak — it's a **pact between friends**: you set a goal together, you submit proof, your friends approve or reject it, and points are staked on whether you actually did the thing.

## Why existing habit trackers felt insufficient

A streak counter has no teeth. It can't tell whether you actually did the workout, it doesn't cost you anything to lie to it, and nobody else ever sees it. Take away the private honor system and put the goal, the proof, and the judgment inside a small group of people who know you, and the incentive changes completely. That was the bet worth building to find out.

## Designing accountability between friends

Most of the real work was product rules, not screens:

- **What counts as proof, and who gets to judge it?** Proof submission plus peer approval — so the group, not the app, decides whether a commitment was met.
- **What happens on a tie, a no-show vote, or a rejected proof?** Edge cases like these are where an accountability app either feels fair or feels broken, so they got most of the design attention.
- **What's actually at stake?** Points-based stakes in the prototype, with a clear path to stronger consequences later — without pretending those stronger consequences already exist.

## What's built (and what isn't)

I'm deliberate about this line, because an accountability product loses the plot if it isn't honest about itself.

**Working in the prototype**
- **Accountability groups** — friend invites, group and direct chat, and peer voting are functional.
- **Goal verification** — users submit proof; peers vote to approve or reject.
- **Commitment pacts** — created with points-based stakes and progress tracking.

**Partially built**
- **Streak / habit history** — pacts and challenges are live; long-term streak history is in progress.
- **Progress analytics** — points balance and recent activity are visible; trend charts are planned.

**Explored, not shipped**
- **Device-lock accountability, photo proof at scale, real financial penalties, group challenges, rewards.** App-usage tracking exists as a foundation, but app-blocking, real money movement, and the rest are future work — and platform constraints (iOS/Android) apply. I don't present any of these as production-ready.

## Testing & reliability

Because I lean on AI-assisted development to move quickly, the discipline is in verification, not in the generation. Generated code is a draft, not an answer — I validate state behavior, persistence, and edge cases against acceptance criteria before trusting any of it.

- **167 automated host tests passing**
- **Tested on 2 physical Android devices** (not just an emulator)
- **Release APK produced** — packaged to a shippable, installable build

## Tech stack

- **App:** Flutter (cross-platform iOS/Android)
- **Backend:** Firebase — Authentication (email/password, verification, reset), Cloud Firestore as the source of truth for users, groups, chats, challenges, proofs, invite codes, and points, and Cloud Functions for settlement logic. Security Rules govern access across collections.

## What I learned about 0→1 product ownership

The interesting part wasn't writing the code — AI made that the fast part. It was owning the entire problem: deciding what a pact *is*, what proof *means*, how disputes resolve, and where to stop so the honest story stays honest. That's the difference between building features and owning a product, and it's the part I'd want a hiring manager to look at.

## Try it

The app is in a beta-ready state. To see a demo, [get in touch](mailto:kinshuk.agarwal@email.ucr.edu?subject=HabitPact%20Demo%20Request).
