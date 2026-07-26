# HabitPact

## What I Did

- Owned the product end to end — vision, user journeys, spec, and roadmap — from whiteboard concept to a working prototype.
- Built a cross-platform app in Flutter.
- Used AI-assisted development (Claude, ChatGPT) across the whole loop — requirements, prototyping, and debugging — to ship quickly.
- Prioritized the feature set against market and competitive research of habit-tracking and commitment-device tools.

## Key Features

### Live in working prototype

- **Accountability partners** — group chats, direct messaging, friend invites, and peer voting are all functional.
- **Goal verification** — users submit proof of completion; peers vote to approve or reject. Server-side settlement logic is built and pending Cloud Functions deployment.
- **Commitment contracts** — users create pacts with points-based stakes. Real financial movement is planned once payments are integrated.

### Partially live

- **Habit and streak tracking** — challenges and pacts are live; full streak tracking and long-term habit history are still in progress.
- **Progress analytics** — points balance and recent activity are visible; analytics dashboards, trend charts, and streak breakdowns are planned.

### Planned

- **Device locking** — app usage tracking is built as a foundation. Blocking distracting apps is future work; platform-level constraints (iOS/Android) apply.
- **Financial penalties** — real money movement (wallet top-up, withdrawals, penalty settlement) is planned once Cloud Functions and payment integration are in place.
- **Group challenges**
- **Rewards**

## Tech Stack

**App:** Flutter (cross-platform iOS and Android)

**Backend:** Firebase (Authentication + Firestore + Cloud Functions)

- **Firebase Authentication** — email/password sign-up, login, email verification, and password reset
- **Cloud Firestore** — primary data store for users, groups, chats, messages, challenges, proofs, invite codes, and points transactions
- **Cloud Functions** — proof settlement, challenge completion, and points updates (implemented; deployment pending)
- **Firebase Security Rules** — access control across all collections (implemented; deployment pending)

**Client:** SharedPreferences for minor caching only; Firestore is the source of truth

## Try It

The app is in a working prototype / beta-ready state. To request a demo, [get in touch](mailto:kinshuk.agarwal@email.ucr.edu?subject=HabitPact%20Demo%20Request).
