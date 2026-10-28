# GiftSquire product vision

Approved direction, 27 October 2026. Canonical product name: **GiftSquire**. Earlier brainstorming names are superseded.

## The beauty of the product

Choosing something to wear can be personal. Choosing it for someone else adds another question: will they actually enjoy wearing it?

GiftSquire is a thoughtful shopping companion for **yourself or someone you care about**. It helps people preview clothing, optionally complete the look with lipstick, compare choices and keep a decision they understand.

**Working promise: See the look. Share the choice. Keep the surprise.**

## Two shopping journeys, one product

### Shop for myself

Choose an occasion, practical preferences and a small clothing shortlist. Preview the items on your own photo using YouCam. Optionally explore a few lipstick shades with a selected outfit. Compare the results and save your preferred choice.

This is a complete first-class journey, not a gift flow that requires inventing a second person. The app does not require the shopper to be buying for someone else.

### Choose a gift

Choose something for a friend, colleague, partner or family member. Birthdays, graduations, weddings, work celebrations, holidays and festive seasons give the choice a clear context.

The giver proposes a shortlist and invites the recipient. The recipient controls their own photo, previews the items and indicates what they would welcome. The giver chooses from the approved options. Where multiple options are approved, the exact final item can remain a surprise. One approved item is still a valid result; the app must not force multiple approvals.

The recipient controls whether their photo or previews are shared. Approval of an item is not automatic approval to disclose their image.

## Optional beauty that serves the choice

“Complete my look” adds a small lipstick comparison to a selected clothing preview. It is optional and available to anyone who wants it. The person's natural face is retained; the task is trying a chosen cosmetic appearance, not grading attractiveness.

The first version does not expand into foundation matching, skincare diagnosis, full facial reshaping or a general beauty chatbot. An outfit-and-lipstick combination must be verified through the actual YouCam APIs before it is presented as implemented.

## Four interaction labels with distinct jobs

- User Mode: manual fields, controls and review.
- Interactive Mode: voice-guided setup, followed by editable review and confirmation.
- Chat: written discussion to refine a shortlist or saved choice.
- Discuss with AI: spoken discussion of that same selected context.

Shopping for myself versus gifting describes the **journey**. User Mode versus Interactive Mode describes **how information is entered**. Chat versus Discuss with AI describes **how a choice is discussed and improved**. These must not become six competing top-level modes.

## Product foundation

Reuse the existing tested Next.js/React/TypeScript/Convex application foundation and its mature account, OTP, theme, voice, recovery and deployment patterns. Rebuild the domain around shopping and gifting. The entire destination project lives in the YouCam folder, with independent data and deployment configuration.

Remove the previous product's names, food imagery, meal language, recipe schema and Qloo integration from the new application's user-facing experience and business logic. This is a new YouCam product, not a meal planner with renamed buttons.

## Competitive story

YouCam's personalised previews make the comparison possible. GiftSquire adds the shopping context, recipient participation, version-aware approval, useful comparison, saved outcome and recoverable workflow.

The central demonstration is a decision: someone finds a look for themselves, or a recipient rejects an unsuitable gift and approves alternatives that inform the giver's choice. Benefits such as reduced returns are hypotheses to evaluate, not existing measurements.

## Current status

Product direction and reuse requirements are documented. The supplied environment contains populated API fields. The YouCam key has now passed a live read-only authentication check; other credentials and actual YouCam rendering still require their own acceptance. No GiftSquire application, backend deployment or account flow has yet been claimed as implemented.

## Lead positioning

GiftSquire helps thoughtful gift-givers choose something the recipient would genuinely welcome wearing—by letting the recipient preview and approve options while the final choice can remain a surprise. Self-shopping remains first-class. Lead judging copy with the giver/recipient problem and a demonstrated approved choice. Voice supports the experience; accessibility outcomes require separate acceptance. See docs/POSITIONING_AND_COMPETITIVE_EDGE.md.
