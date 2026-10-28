# YouCam authentication check

27 October 2026. Official documentation: [Introduction](https://docs.perfectcorp.com/develop/introduction), [Quick Start](https://docs.perfectcorp.com/develop/quick_start_guide), [API Server](https://docs.perfectcorp.com/develop/api_server), [Unit API schema](https://docs.perfectcorp.com/_bundle/reference/unit_system.json?download=).

## Result

The configured YOUCAM_API_KEY was accepted: HTTP 200 with provider status 200 and a 20-entry first page of the feature-cost catalog. The same endpoint with an intentionally invalid key returned HTTP 401. This establishes authenticated access for this read-only endpoint.

Check performed: GET https://yce-api-01.makeupar.com/s2s/v2.0/credit/feature-cost?page_size=20 using the documented Bearer API-key header. No image upload, AI task creation, purchase or account mutation was performed. Credit balance and successful clothing/makeup generation have not been tested by this check.

## Authentication distinction

The current v2 feature-cost API explicitly accepts the API key directly as Bearer authentication. The v1 unit-balance endpoint documents a legacy access_token scheme. Do not interpret a legacy-token mismatch as evidence that the current API key is invalid. YOUCAM_SECRET_KEY is preserved but was not needed by this v2 test.

## Reproduce

Run python scripts/check-youcam-key.py from the project root. It reads .env without printing credentials and saves sanitized results under the ignored .private folder. Raw response bodies from errors and account tokens are not printed. The helper never creates an AI task.

## Configuration cleanup

The destination .env no longer contains copied Convex deployment/public URLs, the source Vercel OIDC token or its unused public email-mode flag. The existing sender address is preserved with the display name GiftSquire. Provider credentials and configured OpenAI model values are preserved. A server-only YouCam base URL and a secret-free .env.example are provided.

GiftSquire still needs its own Convex/Vercel linkage before app deployment; no new backend has been provisioned here. The source project's environment was not modified.
