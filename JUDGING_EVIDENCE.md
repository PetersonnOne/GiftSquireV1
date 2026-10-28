# GiftSquire judging evidence plan

27 October 2026. Planning record; no proposed feature is promoted to a tested result.

| Intended strength | Planned demonstration | Evidence status |
| --- | --- | --- |
| YouCam is essential | Real clothing previews plus a verified optional lipstick operation | Planned rendering; live read-only YouCam authentication verified (200; invalid control 401) |
| A clear consumer decision | Complete self-shopping or giver/recipient journey ending in a saved choice | PRD documented |
| Recipient agency | Private photo controls, explicit approval, stale-approval invalidation | PRD documented |
| Approachable interaction | User/Interactive setup and Chat/Discuss with AI, with review and recovery | Reuse requirement documented; destination acceptance pending |
| Coherent product design | Numbered journey, new brand, readable comparison, accessible themes and dashboard | Proposed design direction |
| A memorable demo | Actual product footage, YouCam causality, confirmed result and under-three-minute captioned film | Pipeline requirements documented; no new media generated |

Current official-source research is in Research/YouCam_Previous_Winners_and_Idea_Strategy_2026-10-27.md. Public copy should foreground actual achievements when implemented and use What's next for proposed extensions. No measured return reduction, perfect physical fit or clinical benefit is claimed.


## 27 October 2026: YouCam credential test and environment cleanup

User authorized adapting the destination environment. YOUCAM_API_KEY returned HTTP 200/provider status 200 on the documented v2 read-only feature-cost endpoint; an invalid-key control returned HTTP 401. No images uploaded or AI tasks created. The preserved secret key was not used. Credit balance and actual preview generation remain separate checks.

Removed copied CONVEX_DEPLOYMENT, NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CONVEX_SITE_URL, VERCEL_OIDC_TOKEN and unused NEXT_PUBLIC_EMAIL_MODE. Rebranded RESEND_FROM display to GiftSquire while preserving the existing address. All retained credential/model values compared equal before and after. Added YOUCAM_API_BASE_URL and a sanitized .env.example. Source application configuration was untouched; no new remote backend or email operation was performed.

The initial unchanged-env findings above are historical; the active .env is now cleaned. Sanitized reports are in .private and the reproducible helper/docs are in scripts/check-youcam-key.py and docs/YOUCAM_AUTHENTICATION_CHECK.md. TinyFish retrieval failed; the official documentation and published OpenAPI schema were read directly.


## Audience-led positioning - 27 October 2026

The user requested a clear audience and meaningful benefit comparable in clarity to the previous winner, with original wording. Lead with thoughtful clothing gift-givers and recipients, occasions/festive seasons, recipient-approved options and preserving a final surprise. Retain self-shopping as first-class and optional lipstick as supporting context. Voice is a supporting interaction, not evidence of blind/low-vision accessibility. Proposed messaging and required proof are recorded in docs/POSITIONING_AND_COMPETITIVE_EDGE.md. No new runtime, user study, media generation or outcome claim is established by this writing task.


## Approved scope update - 27 October 2026
PRD v0.2 adds recipient invitation and permissioned shared-photo gifting paths, a private Partner Brief and a reviewed recipient Gift Brief using real render images. Status: approved requirements; implementation/acceptance in progress. Giver-created previews are not recipient approvals.


## Implemented evidence update - 27 October 2026

Actual YouCam V4 previews now underpin the comparison flow: three outfit results plus an invitation-led uploaded-photo result. Optional makeup is an actual YouCam lipstick close-up kept alongside its original outfit. Human approval is enforced separately from giver proposals. Twenty-three local backend/recovery tests passed. Two QA accounts completed email verification and Chromium login; the invitation/recipient upload/approval path and chat confirmation have been exercised. Independent GiftSquire backend is development-hosted; public launch and final voice/email/export acceptance remain tracked in VERIFICATION.md.


## Completed validation batch and user-requested pause - 27 October 2026

All six checks in .private/browser-acceptance.json passed: Interactive setup through a real self-shopping preview/approval/saved choice; Partner Brief print/PDF; separate recipient approval through giver choice while hiding the original photo; real shared-photo outputs with separate lipstick close-up; Gift Brief privacy and explicit Resend send; actual image download. Resend reported the QA Gift Brief delivered. The email included three actual outfit images and one lipstick close-up.

Actual GPT Live conversations were exercised for both Interactive Mode and Discuss with AI using a controlled outgoing audio track. Both greeted first and mentioned YouCam. Interactive review populated the manual form; discussion review saved the confirmed style preference while keeping existing images/approvals. Captured-conversation review also worked after the discussion session stopped. No real-customer or physical-device listening claim is made by this controlled QA.

User requested a credit-preserving pause after this batch. CONTINUATION.md records exact completion, local evidence, session handling, one undeployed prompt refinement, pending email-recovery UX, remaining auth/mobile/release checks and independent hosting work. Final optimized build for the latest feature set and production launch remain pending.


## 28 October 2026 - optimized local release verification

The optimized Next.js build completed (all routes including studio/brief); local production-mode server runs on4327. Backend changes deployed/typechecked only to GiftSquire's independent development deployment. Twenty-eight automated tests passed, including interrupted-send lock/window, atomic preference/history save, scoped admin access and recipient-withdrawal privacy. Subsequent frontend TypeScript check passed. Source formatting completed.

Real Chromium authentication acceptance passed: normal password login, logout, invalid recovery OTP rejection with the form retained, rejection of the old verification code, a fresh Resend recovery code resetting the password, and login using the changed password. The old-code test does not independently age a fresh token; provider expiry remains configured to15minutes. Four mobile themes passed overflow and saved-appearance checks. The first harness full navigation raced a theme save and aborted; waiting for the save and using the actual navigation link passed. Nine focused layout/recovery checks then passed, including no beforeunload prompt, selected-mode state, self-only Partner Brief option and mobile studio layout.

Interrupted-send UI was tested with a simulated sending-state websocket response and an advanced browser clock; no provider email was sent for this test. Server policy was tested separately through real Convex-test mutations. Production code keeps retries within23hours to stay inside Resend's documented24hour idempotency retention: https://resend.com/docs/dashboard/emails/idempotency-keys . Successful real Gift Brief acceptance/delivery from27October remains the provider integration evidence.

Existing GPT Live sessions were confirmed closed. Refined discussion preparation was verified on existing saved context, avoiding a new paid voice session. Public static bundles/repository candidates (126 files at scan) and the original reference DOCX contained no configured provider secret. Ignore coverage for environments, QA state, archives, retrospective and submission folders was verified. A separate local Git repository was initialized; no remote/public GiftSquire hosting was configured by this verification task.

Current stage: locally verified release candidate for owner review. Pending: user's own verified admin account, physical audio review and independent GitHub/Vercel/production-backend hosted acceptance. CareTable was untouched. CONTINUATION.md records the next actions.
