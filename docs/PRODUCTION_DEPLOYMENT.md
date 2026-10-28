# GiftSquire production deployment

The user authorized production deployment on 28 October 2026. This supersedes earlier instructions to defer deployment.

## Independent services

- GitHub: https://github.com/PetersonnOne/GiftSquireV1
- Vercel project: `giftsquire-v1`, Joseph's projects
- Convex project: `joseph-petersonn/giftsquire`
- Production backend: `https://tame-meerkat-333.convex.cloud`
- Production auth/HTTP origin: `https://tame-meerkat-333.convex.site`
- Local development remains on `striped-viper-361`; no development database export is imported into production.

## Git-based releases

`main` is the intended production branch. Vercel builds from GitHub, running the versioned build command in `vercel.json`: Convex deploy followed by the Next.js build, with the production backend URL injected into the frontend.

Vercel's production environment contains `CONVEX_DEPLOY_KEY` as a secret and the two public Convex URLs. OpenAI, YouCam and Resend credentials stay in the production Convex environment, alongside independently generated auth signing keys and the public site URL. Never commit environment files or pass provider keys through `NEXT_PUBLIC_` variables.

Production deploy credentials are not configured for preview builds. Configure isolated preview backends before relying on feature-branch preview acceptance.

## Accounts and acceptance

Production starts with separate accounts. The designated owner signs up and verifies their own account on the live site; only then may the operator bootstrap the matching verified owner as superadmin. Never promote the first signup automatically or migrate disposable local QA accounts into production.

Confirm the final assigned Vercel hostname before considering `SITE_URL` and invitation URLs accepted. Record deployed commit, provider build status, production signup/recovery, authorization and actual hosted journeys in `VERIFICATION.md`. Local voice connectivity was intermittent; hosted voice requires its own check. Demo recording remains a separate phase.
