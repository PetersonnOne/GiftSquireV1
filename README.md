# GiftSquire

**Choose with confidence. Give with thought.**

A clothing gift should feel like *them*. GiftSquire helps thoughtful gift-givers explore real YouCam outfit previews, give the recipient a say, and keep the final choice a surprise. Shopping for yourself is a first-class journey too.

## A more personal way to choose

- **Two gifting paths:** invite the recipient to try privately, or prepare proposals from a photo they explicitly permitted you to use.
- **Real YouCam clothing previews:** compare styles using the actual reference outfit and consented photo. Optional lipstick is presented as a labelled close-up alongside the full outfit.
- **Recipient-led approval:** a giver-created preview is a proposal. Only the recipient approves a gift; the final pick must use a current approved look.
- **Your pace, your way:** User Mode and Interactive Mode for setup; Chat and Discuss with AI for reviewed style preferences.
- **Thoughtful briefs:** a private Partner Brief for planning and a recipient Gift Brief using actual generated images, with print/PDF, image downloads and explicit reviewed Resend delivery.
- **Privacy in the workflow:** photo provenance, controlled preview sharing, revocable invitations and approval checks tied to current image revisions.
- **A welcoming studio:** numbered steps, live colour-coded stats, four appearances and email verification/password recovery.

YouCam creates the visual previews. GiftSquire coordinates the private shopping space, invitations, reviews and approvals. The AI Style Guide helps express wishes; it cannot invent preview results, approve for a recipient or make a purchase.

## Run locally

Use Node.js 24. Install with `npm ci`. Configure a **GiftSquire-owned** Convex deployment and copy `.env.example` to a local environment file with your server credentials. Keep keys off the browser; provision provider credentials in the destination Convex environment. See [setup](docs/DEVELOPMENT_SETUP.md).

```sh
npm run dev
npm run typecheck
npm test
npm run build
```

The studio runs at `http://localhost:4327`. `npm run convex:dev` updates the linked backend. Do not reuse a different app's deployment or auth signing keys.

## Verification

The optimized Next.js build, TypeScript checks and 28 automated tests pass. Chromium checks cover account recovery, mobile themes, shopping/approval, actual-image/PDF exports and reviewed email delivery. Both voice modes have completed real GPT Live handoffs in controlled QA. [Detailed evidence](VERIFICATION.md) records each run.

## Explore the project

- [Product vision](GiftSquire_Product_Vision.md)
- [PRD](GiftSquire_PRD.md)
- [Judging evidence](JUDGING_EVIDENCE.md)
- [Verification record](VERIFICATION.md)
- [Competitive positioning](docs/POSITIONING_AND_COMPETITIVE_EDGE.md)
- [Research](Research/README.md)

## What's next

Connect independent GitHub/Vercel hosting, complete owner and hosted acceptance, then capture the walkthrough using verified application results. Broader merchant catalogs and purchasing integrations can follow the focused first release.

Clothing and optional lipstick previews powered by **YouCam · Perfect Corp.**
