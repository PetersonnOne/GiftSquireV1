# GiftSquire development setup

This destination uses Next.js App Router, React, TypeScript and its own Convex project. Local app port: 4327. The provisioned development deployment is striped-viper-361 under joseph-petersonn/giftsquire; it is not a public production launch.

1. Install Node.js 24, then run npm ci.
2. Keep .env and .env.local ignored. Next reads both; .env.local contains destination Convex linkage.
3. Add OpenAI, YouCam and Resend credentials to the destination Convex environment. Browser-public variables are only NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL.
4. Configure destination-only JWT_PRIVATE_KEY/JWKS and SITE_URL. scripts/configure-backend.mjs is guarded for this development project and never prints credentials. It does not configure production automatically.
5. Run npm run convex:dev in one terminal and npm run dev in another. Run typecheck, tests and build before release.
6. Create a real owner account using verified email. Bootstrap staff access only through the operator-only administration:bootstrapOwner function for its verified user ID; never promote the first signup automatically.

Provider routes: YouCam cloth-v4 uses ref_file_url, not template_id. Makeup VTO uses a bounded upper-body crop of the actual outfit preview and stores a separate close-up. sharp is deployed as a Node external package. Binary provider response headers are not sufficient validation: inspect bounded image bytes and normalize MIME.

Briefs bind image versions, approval state and sharing permissions. Resend uses a stable idempotency key per reviewed brief. Local development invitation links point to localhost; configure SITE_URL to the independent hosted app before real-recipient use. Deletion withdraws app access, not copies already downloaded or emailed.

QA credentials, render evidence, browser artifacts, retrospective records and submission media remain ignored. Source-reference archives are historical provenance, not acceptance evidence for this app.
