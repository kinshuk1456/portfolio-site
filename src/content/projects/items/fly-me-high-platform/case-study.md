## The problem

Fly Me High is a small travel company. Like a lot of small businesses, it ran on spreadsheets and manual steps — customer records here, prospects there, operational handoffs happening over messages and memory. That works until it doesn't: records take too long to process, things fall through the cracks between people, and nobody can see the whole picture. There was no internal software because there had never been anyone whose job was to build it.

## Context

I was that person — the **first full-time technical hire.** That's a specific kind of role: you're not slotting into an existing engineering org with conventions and a backlog. You're the one deciding what to build, in a company where most of your colleagues aren't technical and the "spec" is how people already do the work.

## Discovery

So I started by learning the business, not by writing code. I sat with how sales and operations actually moved a customer through — what got typed into which sheet, where the handoffs were, what people re-entered by hand. Those pains became the requirements. Building software inside a non-technical organization means you're also the one translating "this part is annoying" into "here's the record model and the API for it."

## What I built

- **Backend architecture and system** in **Java / Spring Boot** on **PostgreSQL**, modeling customers, prospects, and the operational handoffs between them.
- **REST APIs** I designed, tested, and debugged in **Postman**, so the frontend and internal users had a reliable contract to build on.
- **Coordinated ~4 frontend interns** — defining their tasks, setting roadmap priorities, and keeping the work pointed at what operations actually needed.
- **Release and user support** — because when you build the internal tool, you're also the person who makes sure people can use it.

## Decisions & tradeoffs

The judgment call throughout was scope. It's tempting to build the general system; the right move in a company adopting its first internal tool is to build the specific thing that removes today's manual step and earns trust, then grow. I prioritized the workflows that were costing the most time by hand, and I spent real effort on API debugging because a slow or flaky internal tool doesn't get adopted — it gets worked around.

## Outcome

- **~30 minutes less processing time per customer record.**
- **Adoption grew from ~3 to 6–7 internal users** as the tool proved itself.
- **~25% faster backend responses** after targeted API debugging.

## What I learned

This was my first real lesson in forward-deployed work before I had the words for it: the code is the easy half. The hard, valuable half is understanding a non-technical organization's real workflow well enough to turn it into software people actually adopt — and then staying close enough to support them once they do.
