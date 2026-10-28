# GiftSquire PRD

Release status, 28 October 2026: the user approved production deployment. GiftSquire is live at https://giftsquire-v1.vercel.app through GitHub and Vercel, with independent Convex production. Owner setup and hosted core acceptance are complete; see [exact evidence](docs/HOSTED_VERIFICATION.md). This supersedes earlier deployment deferral. Demo production remains separate.

Version 0.3 — updated 28 October 2026: scoped feedback, explicit purchase reports, full Partner Brief snapshots and lipstick comparison presentation. Requirements and implementation evidence are tracked separately.

## 1. Product and audience

GiftSquire serves adults shopping for themselves and people selecting clothing gifts for friends, colleagues, partners and family. Occasions include everyday purchases, events, celebrations and festive seasons. Its emotional promise combines personal choice with thoughtful giving.

Core outcomes: compare personalised previews; optionally explore lipstick with an outfit; save a reviewed choice; for gifts, choose only from recipient-approved options while preserving a surprise where possible.

## 2. Foundation and destination

Use the existing Next.js App Router, React, TypeScript and Convex foundation, adapted in the YouCam workspace. Use a separate Convex project and Vercel/GitHub linkage for GiftSquire. Do not reuse prior project user IDs, sessions, auth signing keys, admin assignments, deployment identifiers or data.

Reuse GeneaOne's verified email infrastructure through Resend. Destination subjects, sender display name, HTML branding, OTP screens and account links must say GiftSquire. Email/password signup, verification, login, password reset and logout remain required.

## 3. Journeys

### GS-01: Shop for myself
Select “For myself,” an occasion and available catalog constraints. Add or select clothing candidates. Explicitly provide a photo for the preview. Compare at least three options where inputs and API access allow. Optionally select “Complete my look” for lipstick. Review and save a preferred item/look.

### GS-02: Gift planning
Select “For someone else,” relationship/occasion and giver-controlled catalog/budget details. Create a shortlist and a revocable invitation. The recipient accepts, provides their own consented photo and previews the choices. The recipient approves or rejects options. The giver finalises an approved item; no approved options is a clear incomplete state, not an automatic substitute.

### GS-02b: They have shared a photo with me

Retain the invitation-led path and add giver-led preparation using an adult recipient's photo. Before upload, the giver explicitly confirms that the recipient permitted its use in GiftSquire and YouCam. Possessing a photo alone is not consent. No recipient account, camera capture or live walkthrough is required to prepare previews this way.

Giver-created looks are proposals, never recipient approvals. An invitation lets the recipient review, approve, replace or delete their photo. Only the authenticated recipient approves; final selection still requires a current approval. Record who supplied the photo. A recipient-provided replacement must not inherit giver access to the original image; reset affected renders and approvals after replacement.

### GS-05: Partner Brief and Gift Brief

**Partner Brief:** private to the account owner. Include occasion, relationship, style wishes, optional budget, shortlist, actual generated preview images, shade/revision details, approval status and saved final choice. Support viewing and printing/downloading as PDF.

**Gift Brief:** recipient-facing. Include selected actual preview images, a personal message, occasion and review/invitation link. Exclude budget, private planning notes and the surprise final choice by default. Identify unapproved proposals accurately. Include only results available to the giver under the current sharing permissions.

Use real YouCam output images rather than screenshots of the interface. Offer individual image downloads and a clean printable brief. Do not include the source portrait. Result images contain likenesses: require conscious selection for sharing.

Before Resend delivery, show the email address, subject, message and exact images. Sending requires an explicit Send action. Creating/downloading a brief does not send email. Bind the reviewed snapshot to current photo/render versions; reject stale or revoked snapshots. Prevent duplicate sends and preserve the draft after failure. Keep invitations expiring/revocable. Automated QA sends only to disposable addresses owned by the project operator.

### GS-03: Optional lipstick
From one selected outfit, preview a small set of lipstick shades. Retain consistent source/context where supported. Store the exact outfit, shade settings and render revision behind a saved look. Changing the source photo or outfit invalidates dependent results and any affected approval. Never claim exact merchant colour calibration, physical fit or a validated beauty score without evidence.

### GS-04: Improve a choice
Chat and Discuss with AI work on an owned selected item/look or a saved decision. Build a change request, review it and confirm before applying. Preserve unrelated choices and valid approvals; invalidate approvals tied to changed inputs. Distinguish before-purchase preferences from explicit user-reported post-purchase feedback. No purchase is inferred from a preview.

## 4. Interaction design

Retain two setup modes: User Mode and Interactive Mode. Reuse a contextual speech-bubble description anchored to the active mode. Keep manual entry available even when voice is selected. A visible Interactive default may carry over, but the microphone and paid session never start automatically.

Feedback has Chat and Discuss with AI. Do not call these extra shopping modes. Number the expected steps: context → candidates → preview/compare → review/choose → discuss/improve. Adapt numbering to the journey rather than forcing recipient users through giver-only steps.

Retain the warm, polished layout, responsive cards, legible states and top-menu theme dropdown. Replace all product names, icons, logos, artwork and food vocabulary. A proposed palette is deep plum/ink, warm ivory, muted rose and restrained gold; final brand assets remain a design task. Keep signature, midnight, dark and white appearances accessible.

A lightweight colour-coded dashboard may show candidate count, completed/failed previews, recipient-approved options, saved decisions and revisions. Price totals require actual catalog amounts/currency. Never display invented attractiveness, medical or probability metrics.

## 5. YouCam and orchestration

The clothing preview must use a real eligible YouCam API. Optional lipstick must use the appropriate makeup VTO API; chain the completed outfit into a lipstick close-up, displayed alongside the preserved full outfit. Compare Rose, Berry and Coral as labelled actual outputs. Reuse ready shade results for the same source/outfit without a new paid task; a changed source invalidates them. Do not imply a single merged full-body image. Do not add general Skin Analysis merely to increase API count.

The application coordinates upload, task creation, polling, timeout, retry and storage. Provider keys remain server-only. An LLM can interpret reviewed requests and guide conversation; it does not fabricate previews, approve for a recipient or bypass catalog/ownership policy.

Record the provider operation, input revisions, task status and resulting artifact for each preview. Show useful progress and partial success. Retry only failed operations on explicit user action where spending is involved. Do not duplicate a completed render because another candidate failed.

## 6. Photos, ownership and approvals

Camera/upload access is explicit. Show the actual cloud-processing and retention choices before transmission. Give users clear retake and deletion/reset controls. The giver must not gain access to the recipient's original image by receiving an invitation or approval.

Model giver, recipient and self-shopper permissions separately from administration. Invitations should expire and be revocable. A giver cannot impersonate a recipient approval. Bind approvals to exact candidate, source-image and render versions; reject stale requests independently of UI state. A preview does not establish physical size or fit.

## 7. Voice requirements

Reuse the proven connection lifecycle and review/recovery patterns, replacing meal-specific context, prompts and schemas.

- Explicit start; proactive short welcome; clear instructions.
- Destination-owned context with role, journey, selected resource and version.
- Editable proposal before creating/updating a shortlist or decision.
- Optional fields must not cause permanent confirmation deadlocks.
- Captured captions and notes survive interruption within the current page.
- Explicit prepare/retry from captured conversation without automatically restarting voice.
- Explicit reconnect after confirmed cleanup/cooldown; preserve draft ordering and ignore stale callbacks.
- Clear offline, idle, duration, tab-hidden and cleanup states.
- A synchronous duplicate-click guard and server-side ownership/version checks.
- Frontend microphone stop and backend provider cleanup verified separately.
- Page-retained captions are not crash-proof persistence or provider conversation memory.

Initial limits may reuse five minutes, six starts/account/day, 24 shared/day, one-minute cooldown and 90-second inactivity handling. These are a starting policy to verify for this project and its judging period, not a promise about cost or capacity. Show the configured allowance in both voice entries.

## 8. Accounts, email and administration

Port the established authentication reuse/redirect fixes; do not globally suppress browser navigation warnings. Test signup, OTP rejection/expiry, verification, login, password recovery, logout and return navigation.

Reusing an email domain does not make accounts shared with another application. Use GiftSquire-owned identities and permissions. Administration should report destination usage/jobs, owned artifacts and operational status without exposing user photos or secrets by default.

## 9. Acceptance and evidence

- A first-time user can complete self-shopping without a recipient.
- Both invitation-led and explicit-permission shared-photo gifting paths work.
- Giver-generated previews remain proposals until the actual recipient approves.
- Partner Brief is private; Gift Brief omits private budget, notes and surprise final choice.
- Briefs export actual render images and reject stale snapshots after input/sharing changes.
- Sending requires reviewed recipient/content confirmation; email failures keep the draft.
- A giver and recipient complete the invitation/preview/approval/final-choice loop in separate browser contexts.
- Three real previews and a tested optional lipstick operation are linked to their actual inputs.
- Wrong-owner, expired/revoked invitation and stale-version requests are rejected.
- Changed inputs clear affected approvals; unrelated choices remain intact.
- A failed render can be retried without repeating successful work.
- Both setup modes and both feedback modes reach the same reviewed business operations.
- Voice welcomes first, handles interruptions/review retries, and does not apply an unconfirmed update.
- Destination signup/reset email and UI branding are correct.
- Appearance, keyboard use, mobile layout and caption readability pass checks.
- No old project keys, backend URLs, user data, public branding, food assets or Qloo dependencies remain in the active destination application.
- Evidence distinguishes implemented, locally tested, hosted-verified and user-reviewed outcomes.

## 10. Demo and submission resources

Maintain Git-ignored Submission Video Workspace, Submit Projects and retrospective-catalog folders in this project. Reuse the script doctrine, capture/editing workflow, audio alignment lesson, caption generation and technical verification methods. Do not reuse old product footage or testimonials as GiftSquire evidence.

Plan a 1–3-minute, 1080p walkthrough: emotional shopping/gifting hook; manual steps with visible pointer and typing; real YouCam comparison; optional lipstick; recipient approval; voice alternative; discussion/refinement; saved result; explicit YouCam credit and thanks. Keep the sponsor's contribution visible in the causal journey.

Preferred production roles may carry over: Sarah narration through ElevenLabs/OpenRouter, a separate male user actor and the app's actual configured Live voice. A scripted audio rehearsal can guide visuals, but final feature evidence should use actual application outputs. Keep word alignment tied to recorded-file time, not an assumed constant offset from Live session timestamps. Use readable bottom subtitles. No background music is selected.

This PRD authorises planning and the requested foundation adaptation; it does not claim that a new demo was recorded, paid media was generated or anything was published.

## 11. What's next

After the first complete release, consider broader catalog/category coverage, richer occasion support, optional merchant integration and improved usage reporting. Keep the first build centred on self-shopping and gifting decisions; defer checkout, shipping, a marketplace, broad skincare routines and a full makeover suite.

## 12. Local completion and release boundary — 28 October

Chat and Discuss with AI target overall wishes, a named candidate or the owner’s private saved choice. Planning and explicitly user-reported post-purchase notes remain separate. Saving a note does not change images or approvals. Private decision notes never enter recipient history or AI context.

Partner Brief snapshots include relationship, the complete candidate shortlist and source/preview/generated revision details even when only one image is included. Any candidate change invalidates the private snapshot. Gift Briefs omit this private metadata.

Complete and verify the local app first. The intended GitHub repository is https://github.com/PetersonnOne/GiftSquireV1. Creating or triggering Vercel production deployment requires the user’s new explicit approval. Demo recording remains a separate phase.
