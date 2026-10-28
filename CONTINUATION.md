# GiftSquire continuation

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
