# YouCam: previous winners and competitive idea strategy

Researched 27 October 2026. Research and proposals only; no app has been built or independently validated by this work. The original recommendation DOCX is preserved unchanged.

## The opportunity

Build a complete shopping decision with a recognisable audience, a reason YouCam is essential, a meaningful saved outcome and a demonstration that shows the result. A personal lipstick comparison is a viable starting point, but a stronger competitive proposition needs a distinctive decision or audience beyond previewing several colours.

This recommendation is my interpretation of the evidence, not a judge score or guarantee of winning.

## Current event, separate from the earlier round

The current event is the [YouCam API Skin AI & eCommerce VTO Hackathon](https://youcam-api-skin-ai-ecommerce.devpost.com/). Its [official rules](https://youcam-api-skin-ai-ecommerce.devpost.com/rules) specify a November 2, 2026 deadline at 11:45 a.m. Eastern, equivalent to 5:45 p.m. Lagos time. They require at least one eligible YouCam API, a working project/repository, English materials or translation and a public 1–3-minute end-to-end video. The four equally weighted criteria cover implementation, design, impact and idea quality. Judging runs November 3–20; announcement is around November 24. Do not transfer CareTable's deadlines or video assumptions to this event.

The rules accept Skin, Beauty, Fashion, Jewelry & Watch and Hair & Beard integrations. Skin Analysis plus VTO is not a mandatory combination. Access for judging and correct API use still matter.

The [current gallery](https://youcam-api-skin-ai-ecommerce.devpost.com/project-gallery) is not published as of this check. It cannot establish the strength or novelty of this round's eventual field.

## Confirmed previous winners

These are from the earlier YouCam API Skin AI & Apparel VTO event, not winners of the current competition. The [previous gallery](https://youcam-api.devpost.com/project-gallery) and project award badges confirm their status.

| Project and award | Published product | My interpretation of the edge |
| --- | --- | --- |
| [Aloud — first](https://devpost.com/software/aloud-lxqr70) | Voice-led beauty shopping for blind/low-vision users; guided capture, structured skin output and spoken ingredient information. | A clearly defined underserved user and an experience redesigned around independent completion. |
| [ShadeSpan — second](https://devpost.com/software/shadespan) | Garments rendered across six skin tones, with colour-contrast assessment and a merchandising report. | Turns visual generation into a concrete retailer decision with inspectable evidence. |
| [CASTING — 3rd–5th group](https://devpost.com/software/casting) | Product imagery across eight panel members, measured tone coverage and exportable assets/report. | Clear business user, multi-API orchestration and a useful output beyond one generated image. |
| [KeepMe — 3rd–5th group](https://devpost.com/software/keepme) | User-defined appearance protections, output checks, supported repairs and an approval receipt. | Makes trust and user control into an enforceable workflow. |
| [ConfidFit — 3rd–5th group](https://devpost.com/software/confidfit) | Shopify apparel try-on with merchant enablement, metering and operations. | Embeds the API in an actual retail workflow and addresses running the service. |

The last three badges use a combined 3rd–5th label; this research does not invent their individual order. Project descriptions are author-reported, not independent software audits.

## What the organiser actually said

Perfect Corp's [October announcement](https://www.perfectcorp.com/business/news/YouCam-API-Hackthon-eCommerce) confirms the first two places and highlights accessibility, broader representation, shopper trust and operational retail integration. This supports a direction centred on real shopping problems. I did not find individual judge scorecards explaining every award.

A separate [DeveloperWeek recap](https://www.perfectcorp.com/business/blog/general/perfect-corp-hackathon) names CLOSET and FitCast as winners in that different event. Styling/commerce and weather-aware outfit planning therefore also have visible precedent. Keep those results separate from the five winners above.

## Lessons to apply

These are design inferences, not extra official criteria:

- State who benefits and which moment is improved before listing technology.
- Give YouCam a necessary job in the decision. A generic chat interface with a try-on button is a weaker story.
- Turn outputs into an action: a shortlist, approved choice, report or reusable comparison.
- Make user preferences, constraints, confirmation and recovery work through the entire journey.
- Demonstrate the chosen outcome and preserve evidence behind it.
- A coherent experience matters more than adding API count. An LLM is optional unless its specific role improves the workflow.
- Borrow the discipline of the winners, not their product identity or core proposition.

## Candid assessment of the uploaded lipstick idea

Keep its strong foundations: one understandable purchase moment, three or four comparable options, the same source image, useful capture/error guidance and a saved comparison card.

Strengthen its decision value. A standard colour grid, an AI explanation and a confidence number do not by themselves establish a new contribution. Do not infer that a skin-concern score determines an ideal lipstick shade.

The [Makeup VTO product page](https://yce.perfectcorp.com/ai-api/products/virtual-makeup-try-on-api) documents lip-colour rendering. The separate [Facial Color Tones Analyzer](https://docs.perfectcorp.com/reference/ai_skin_tone_analysis) describes skin, eye, eyebrow, lip and hair colours. Those are different roles from general skin-condition analysis. We must verify the chosen API's response schema and account access before promising specific outputs. No numerical personal-match probability is proposed.

## Strongest brainstorming direction: GiftSquire

Working title only. Concept, not an implemented product or a cleared brand name.

**Keep the surprise. Lose the guessing.**

GiftSquire helps someone choose a clothing gift that the recipient would actually like to wear, while leaving the final choice a surprise.

### The full decision loop

1. The giver creates an occasion, budget range and shortlist of three garments from a small permissioned sample catalog.
2. The recipient opens a private invitation, supplies their own photo and explicitly starts the preview process.
3. YouCam renders the shortlist on that same person. Individual loading/error states allow only failed renders to be retried.
4. The recipient privately compares the options and approves more than one item they would welcome.
5. The giver chooses only from the approved shortlist. The exact final selection can remain a surprise.
6. Both can revisit a dated decision card. Changing a garment or source photo invalidates the affected approval.

The giver does not automatically receive the recipient's original photo or previews. Sharing those is a separate recipient choice.

### Why I would explore this first

It extends virtual try-on into a two-person purchase decision with meaningful state and consent. The user problem can be explained in one sentence and the result is visible: an unwanted option is rejected, acceptable alternatives are approved, and the giver retains a surprise choice.

The contribution is the collaborative decision workflow. It is not a claim that gifting or VTO has never been combined anywhere. This research is not an exhaustive novelty or market-demand study.

YouCam remains essential: the recipient's choices are informed by actual personalised previews. An LLM can optionally help interpret gift preferences or wording; it must not replace the try-on evidence or decide approvals.

This direction differs from the five winner propositions reviewed above. Privacy and confirmation support the gifting flow rather than becoming another identity-drift repair product.

### Feasibility and scope

Start with adult clothing gifts in one supported garment category, three reference images and two invitation-based roles. Build a usable shortlist, preview, approval, revision and save journey. No checkout, payments, shipping, large store or subscription system is needed to demonstrate that decision.

Perfect Corp's [Clothes V4 article](https://www.perfectcorp.com/business/blog/ai-clothes/ai-clothes-try-on-api-v4-outerwear) documents photo/reference-based garment try-on and asynchronous file/task/status processing. Its layering discussion also shows that separate garment operations may be needed. Exact endpoint/version access, image requirements, unit use and retention must be checked against the account before implementation; no paid calls were made in this research.

The promise is appearance-informed gifting, not a physical size or fit guarantee. Reduced unwanted gifts or returns would be a future measured outcome, not a launch statistic.

### What would make it a credible entry

- A two-browser demonstration of giver and recipient roles.
- Real YouCam renders on consented input, not static result mockups.
- Explicit recipient approval that the giver cannot impersonate.
- A changed image/garment clearing stale approval.
- One rejected option and at least two approved alternatives, preserving some surprise.
- A saved final decision that matches the approved version.
- A failure/retry path that preserves work without repeating all paid calls.
- A concise 1–3-minute film showing the before, comparison and final choice.

Validate whether people actually want shortlist-based gift surprises before locking the idea. This is a product question, not a mandatory research gate or a claim that validation already happened.

## Runner-up: a stronger personal shade comparison

If lipstick is the preferred domain, develop a personal shade decision notebook rather than a broad beauty advisor. Users set their occasion, preferred finish and budget, compare the same few shades on the same photo, record what they prefer and save the reason for the choice. Later comparisons can use their explicit choices without pretending to discover a universal beauty score.

This is closer to the uploaded proposal and likely simpler to deliver. Its main challenge is distinctiveness. The portfolio of polished makeup previews in the wider market means the comparison interaction and saved decision must be especially clear.

## My recommendation

Explore GiftSquire first, with the strengthened lipstick concept as the runner-up. Choose based on a compelling user need, available API access and the ability to demonstrate a complete real journey by the deadline. Do not add Skin Analysis simply to fill a second lane.

The next concrete step is to agree the audience and core promise, then verify a single real API path and write a PRD around the chosen decision loop. No application scaffold, registrations, image uploads, paid API calls or publication has been started.

## Retrieval record

TinyFish CLI was available but its fetch returned an error. Direct web retrieval of Devpost, Perfect Corp's organiser announcement, project pages and official API documentation supplied the evidence. No participant counts, author adoption statistics or conversion estimates are treated as evidence of winning odds.
