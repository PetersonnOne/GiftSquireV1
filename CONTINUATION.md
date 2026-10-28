# GiftSquire continuation

## Current state after restart recovery — 28 October 2026

Production deployment and hosted acceptance completed before the laptop crash. Live: https://giftsquire-v1.vercel.app . GitHub main is connected to Vercel project giftsquire-v1; Convex production is tame-meerkat-333 and development remains striped-viper-361. CareTable is untouched.

The owner personally verified the production account; superadmin provisioning and a protected member-administration query passed. Hosted signup/recovery/mobile, self setup, recipient invitation, actual clothing/lipstick, approval/final selection, Partner Brief/PDF and delivered Gift Brief passed. Both hosted voice modes passed audio/review/confirmation; the first Interactive start timed out and passed on explicit retry. Physical listening is an owner review, not a claimed QA result.

After restart, cloud health and the Ready deployment were verified. Final release records/test scripts and a small unrendered-candidate label fix are being pushed; check the newest Git-triggered build before final handoff. Thirty-nine tests pass. See docs/HOSTED_VERIFICATION.md for evidence and private artifact paths. No more paid render/voice tests are needed without a new failure or material change.

Provider/signing keys stay in Convex; the production deploy key stays secret in Vercel. Preview backends are not configured. Keep .private, output/playwright, retrospective and submission folders ignored. Demo recording/submission media are a separate next phase and have not started.

The older progress notes below are historical and superseded by this current-state section.

Updated 28 October 2026. The user explicitly approved production deployment. Earlier instructions to defer Vercel are superseded.

## Release in progress

- Code pushed to https://github.com/PetersonnOne/GiftSquireV1 on main; initial release configuration commit b0055a5.
- Independent Vercel project giftsquire-v1 in Joseph's projects is linked to that repository. Production environment has the secret Convex deployment key and public backend URLs.
- Convex production tame-meerkat-333 is deployed with independent signing keys, provider settings and the intended hosted SITE_URL. Development remains striped-viper-361 and localhost:4327.
- vercel.json deploys Convex and builds Next.js together. Final hosted build and assigned URL still need acceptance.

## Next checks

Inspect the Git-triggered Vercel build, verify actual hostname/SITE_URL, and test hosted accounts, private access, shopping, AI and voice. Production is a clean database: do not import local QA accounts or private artifacts. The designated owner must create/verify their own production account before operator-only admin bootstrap for the matching verified identity.

39 automated tests pass. Latest local voice evidence: both modes connected and played decoded audio; Interactive review/confirmation passed. A later discussion startup timed out again, so fresh connection reliability remains intermittent. Do not claim permanent transport resolution; use bounded explicit retries.

CareTable remains untouched. Keep credentials, browser sessions, render evidence, retrospective and submission folders ignored. Demo recording remains a separate phase. See docs/PRODUCTION_DEPLOYMENT.md and VERIFICATION.md for exact release evidence.
