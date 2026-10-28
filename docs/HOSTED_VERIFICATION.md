# Hosted release acceptance — 28 October 2026

Live: https://giftsquire-v1.vercel.app . Repository: https://github.com/PetersonnOne/GiftSquireV1 . GitHub main triggers Vercel builds that deploy Convex and Next.js together. The initial Ready deployment used commit b657760 and independent Convex production tame-meerkat-333. Development remains striped-viper-361; CareTable was untouched.

## Passed on production

- Two separate QA signups, delivered verification codes, invalid-code rejection, password recovery and new-password login.
- Four mobile appearances, User Mode self-shopping setup, and recipient invitation acceptance in a second browser.
- Actual YouCam outfit generation and Rose lipstick close-up, recipient-only approval, giver approved-choice selection, complete Partner Brief and PDF export.
- Reviewed Gift Brief sending: Resend reports delivered; links use the production hostname; private shortlist, budget and relationship metadata are excluded.
- Recipient-uploaded original photo stays hidden from the giver. Unprivileged QA access to member administration is denied.
- The designated owner personally verified the separate production account. Operator inspection confirmed the matching verified identity, assigned superadmin and verified its protected member-administration API. No owner password was accessed.
- Both hosted voice modes completed greeting/captions, decoded browser audio playback, actual AI review preparation and confirmed handoff. Interactive Mode first timed out; one explicit retry passed. This does not promise uninterrupted networking. Controlled microphone devices and written handoff notes were used; physical microphone/speaker listening remains an owner review.

## Security and recovery evidence

Provider credentials and independent auth signing keys live in Convex. Vercel holds the production deploy key as a secret and the two public backend URLs. Fourteen hosted JavaScript chunks contained no configured provider/deploy credential or development backend URL; the production backend URL was confirmed. QA voice sessions inspected after acceptance were closed.

After the laptop restart, remote main and the Ready Vercel deployment were rechecked. Homepage, sign-in and health returned HTTP200. Final release records and test scripts were the remaining uncommitted work. A small Partner Brief label correction distinguishes unrendered candidates from generated results; its regression assertion checks that draft candidates have no generated revision.

## Evidence locations

Private records under `.private/`: production-auth-acceptance.json, production-recovery-acceptance.json, production-journeys.json, production-owner-status.json, production-owner-api.json, production-interactive-voice.json, production-interactive-voice-attempt1.json, production-discussion-voice.json, production-final-checks.json and production-public-scan.json. Screenshots and PDF are under `output/playwright/production-*`.

These private files, credentials and browser sessions stay ignored. QA accounts were created independently on production using owner-controlled aliases; no development database was imported. Thirty-nine automated tests passed before release. Preview backends and demo recording are separate later work.
