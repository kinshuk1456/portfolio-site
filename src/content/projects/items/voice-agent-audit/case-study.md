## The question underneath

How do you test a conversational voice agent against messy, unpredictable callers before you trust it with real ones? Text transcripts and scripted fixtures miss most of what goes wrong on a phone line: timing, interruptions, mishearing, and the loops a conversation falls into when two systems disagree about what happens next.

This project was my answer for an AI engineering take-home assessment. The brief was to build a bot that calls an AI medical receptionist, holds realistic conversations, and reports what the receptionist gets wrong. The receptionist was a test line provided for the assessment. I'm describing what was built and measured, not a product anyone deployed.

## How the AI patient works

Each call is a Python LiveKit Agents session in pipeline mode, with three separate stages:

- **Hearing:** local faster-whisper `tiny.en` on the CPU, about 0.3 s per utterance. Silero VAD and a 1.0–2.5 s end-of-turn window decide when the receptionist has finished. Preemptive generation is off, so the patient never answers a half-heard sentence.
- **Thinking:** GPT-OSS 120B (or 20B) on Groq writes the patient's reply. It runs inside a scoped-memory controller that holds the scenario's fixed facts, the last four turns, and which questions have been answered so far.
- **Speaking:** a local Windows SAPI voice. It sounds robotic, but it starts in tens of milliseconds and costs nothing.

Before anything is spoken, the controller checks the draft. If the draft invents a phone number, changes the patient's name or date of birth, claims a real existing appointment, or asks the receptionist to act on a record, the controller replaces it with a grounded line or ends the call politely. The patient holds back its date of birth until asked, and every call opens with a recording notice.

There are ten scenarios: new appointment, rescheduling, cancellation, refill, office information, insurance, visit preparation, an ambiguous date, correction recovery, and accessibility. Each uses a clearly fictional patient profile.

## Evidence first

Every call folder holds a stereo recording with the patient on the left channel and the receptionist on the right, speaker-labeled transcripts, call timing, the exact text the patient spoke, the controller's decision log, and per-turn latency. Nothing was edited after capture. Locally simulated audio sits in a separate folder and was never counted as a call.

Keeping the two speakers on separate channels mattered more than I expected. It let me re-transcribe the receptionist's side on its own to double-check quotes. It also let me measure exactly who was talking when, and separate "the receptionist did something odd" from "our bot talked over it".

## What the calls showed

- **29 attempts, 24 genuine two-sided conversations.** The other five: two stopped at an early consent gate, one ran out the greeting timeout before the patient spoke, one recorded only the notice, and one went unanswered.
- **Ten selected conversations, across 7 of the 10 scenario types.** Seven were clean. Three were coherent but flawed, and their flaws are disclosed: a repeated question and an invented phone number; an abrupt ending caused by our own safety check; and a long verification loop cut off by our 180-second cap.
- **Coverage gaps, stated plainly.** No usable recording exists for new-appointment scheduling or for the two date edge-case scenarios.

### Receptionist findings, with confidence

The recordings support six findings. Each is marked by severity and by how strongly the evidence supports it. None is confirmed against how the product was meant to behave.

- **A caller-ID greeting used a stored first name**, even after the caller had introduced themselves differently. Medium severity; high confidence it happened, but human listening is still pending.
- **The incoming caller ID was read back as "your phone number"** during verification. Low severity; high confidence it happened.
- **The same general questions were answered in some calls and blocked behind identity verification in others.** Medium severity; probable. Caller wording differed between calls, so a controlled test is still needed.
- **Verification loops:** details were confirmed, then asked for again until time ran out. Medium severity; probable.
- **A demo profile was created with a date of birth the caller never gave.** Low severity; needs verification, and it may be an intended demo feature.
- **Some answers described "most clinics"** instead of this clinic's own process. Low severity; needs verification.

The report also lists what worked well: when a record couldn't be found, the receptionist said so and offered a follow-up rather than inventing one.

### Our caller's limitations

These went into their own list, not the bug report. The patient over-answers confirmations instead of saying "Yes, that's correct." It repeats its goal during verification loops. It made up a phone number once, because the scenario didn't define one and it had no clean way to say "I don't have that." It occasionally slips from "my name" to "your name." Whisper `tiny.en` mishears words, so receptionist quotes are labeled as machine transcription.

## Guardrails on the experiment itself

Real calls cost real money and reach a real system, so the harness had to be safe by default:

- Nothing dials without a verified readiness file, a person's approval of that exact call ID, and room left in an attempt ledger with a hard cap.
- The destination is fixed in code. Calls stop at 180 seconds, and a failed or ambiguous call never redials automatically.
- Credentials, approvals and receipts stay out of git. The whole run used a few dollars of telephony, with free tiers for the model, the LiveKit connection and the experiments.
- Once the calls were done, new spending was switched off in code.

## What I'd do next

- Give the patient a short "I don't have that" reply and a plain "Yes, that's correct", so confirmations stop turning into recitals.
- Rerun the inconsistent-verification finding as a controlled test, with the same question word for word, with and without volunteered identity.
- Have someone listen to each bug-report passage, to move the findings from machine transcription to verified.
- Fill the coverage gaps for new appointments and date edge cases, and try a larger speech-to-text model now that the turn latency is measured stage by stage.

## What I took from it

The useful work wasn't wiring up the pipeline. It was refusing to guess. Measuring each stage showed the "slow speech-to-text" was really a turn-commit setting. Replaying real calls showed which safety rules were too strict. Keeping the caller's mistakes apart from the receptionist's kept the bug report honest. A voice agent is only as testable as the evidence you keep about it.
