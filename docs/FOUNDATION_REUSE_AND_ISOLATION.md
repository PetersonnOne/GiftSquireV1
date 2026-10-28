# Foundation reuse and project isolation

27 October 2026. Internal migration record; previous-product provenance is kept here rather than in GiftSquire UI.

## Source and destination

Source foundation: D:/Agent Studio/Codex App/Hackathons/Qloo Hackathon 2026.
Destination: D:/Agent Studio/Codex App/Hackathons/YouCam Hackathon 2026.

Reuse the architecture and tested patterns, not the production identity or business records. Do not modify or deploy the source application as part of this migration.

## Configuration inspection

The destination .env has populated OpenAI, YouCam key/secret, OpenRouter and Resend fields. Presence is not a live credential validation. Values were not printed and no API requests were made.

Initial inspection found that all three Convex deployment/public URL values matched the source development configuration. The user subsequently authorized cleanup: these values, the copied Vercel OIDC token and the unused email-mode flag are now removed. The sender display name is GiftSquire, with the original email address preserved. A separate GiftSquire deployment must be provisioned before any Convex push, email setup or production deployment. Provider credential values remain unchanged.

Do not copy a source .env, .vercel linkage, .git directory, .convex state, browser sessions, private QA credentials, deployment/auth keys or source backend data into an active destination project. Existing destination keys belong only in ignored local files and server environments. A copied Vercel OIDC token is not a new project linkage and must not be treated as one.

## Reuse map

| Retain/adapt | Replace |
| --- | --- |
| Next.js/React/TypeScript layout, providers and deployment pattern | Product metadata, URLs, manifests and branding |
| Identity forms, account/admin patterns, OTP delivery and redirect fixes | Destination auth signing material, user IDs, roles and email templates |
| Theme switcher, numbered guidance, contextual mode bubbles, warm cards | Colours, logo, icons, all food imagery and meal descriptions |
| VoiceSession connection/recovery lifecycle and related tests | Meal request/feedback schema, prompts, context ownership and action handlers |
| Reviewed text/voice handoff and explicit confirmation | Shopping/recipient approval contracts and versioned look/decision operations |
| Job progress, saved-version recovery and targeted-change patterns | Household/recipe/meal tables, catalog data and Qloo taste/ranking services |
| Realistic Chromium capture, word-aligned audio, captions and demo doctrine | All footage, scripts, sponsor references and judge claims |

## Ordered migration

1. Preserve the destination reference document/research and .env; add ignore rules before creating Git history.
2. Copy an allowlisted source foundation into the destination, excluding secrets, linkage, source data and old media. Keep a source manifest for reproducibility.
3. Establish destination-only Convex/Vercel/repository configuration before deploying or importing runtime data.
4. Retain the auth/recovery fixes; rebrand sender/templates and test GeneaOne email from the destination.
5. Replace the food domain with self-shopping/gifting entities and a new YouCam adapter. Remove unused source modules and provider dependencies.
6. Verify clothing plus optional lipstick preview with actual account access and correct image/task schemas.
7. Adapt voice and feedback contracts to destination roles/resources/versions.
8. Build the complete user/recipient journeys; run security, recovery and browser acceptance.
9. Capture a new product-specific demo and prepare submission materials from actual verified evidence.

## Guard against stale assumptions

The source's acceptance tests prove source behaviour, not GiftSquire correctness. Source snapshots must not silently become production configuration. No destination backend, live YouCam call or application build was completed by this documentation work.

## Snapshot now retained

An allowlisted source snapshot is in archive/source-foundation-2026-10-27 with file hashes. Full voice guides/reference snapshots are in archive/voice-reference. The generic script doctrine is adapted under docs/DEMO_SCRIPT_DOCTRINE.md. These are migration references, not a runnable or rebranded destination build.
