import Link from "next/link";
import { PRODUCTS } from "../../convex/catalog";
export default function Home() {
  return (
    <div className="gs-home">
      <section className="gs-hero">
        <div className="gs-hero-copy">
          <span className="eyebrow">A LITTLE THOUGHT. A LOVELIER CHOICE.</span>
          <h1>
            Not just a gift.
            <br />A little <em>“that’s so you.”</em>
          </h1>
          <p>
            For your next look. For someone you love. See the possibilities, let
            them have a say, and keep a little surprise.
          </p>
          <div className="actions">
            <Link className="button" href="/studio">
              Find their kind of lovely ↗
            </Link>
            <Link href="/studio?journey=self" className="button outline">
              A little something for me
            </Link>
          </div>
          <div className="gs-proof">
            <span>✧ Real YouCam previews</span>
            <span>♡ Recipient-led choices</span>
            <span>◌ Voice or your own pace</span>
          </div>
        </div>
        <div className="gs-editorial" aria-label="Clothing inspiration">
          <div className="gs-orbit">
            A thoughtful choice
            <br />
            <em>starts with them.</em>
          </div>
          <img
            className="gs-fashion-one"
            src={PRODUCTS[3].image}
            alt="Orange two-piece outfit inspiration"
          />
          <img
            className="gs-fashion-two"
            src={PRODUCTS[1].image}
            alt="Neutral outfit inspiration"
          />
          <div className="gs-note">
            <span>♡ THE BEST KIND OF SURPRISE</span>
            <strong>Something they’d choose, too.</strong>
            <small>Give them a say. Keep the final pick.</small>
          </div>
          <span className="gs-flower" aria-hidden="true">
            ✳
          </span>
        </div>
      </section>
      <section className="gs-intro">
        <span className="eyebrow">STYLE, WITH SOMEONE IN MIND</span>
        <h2>
          A more personal way
          <br />
          to find <em>the one.</em>
        </h2>
        <p>
          A birthday, a celebration, or simply because. GiftSquire turns “will
          they like it?” into a conversation you can see.
        </p>
      </section>
      <section className="gs-feature-grid">
        {[
          {
            n: "01",
            title: "Start with a little story",
            text: "Choose yourself or someone else. Tell us the occasion, their style and what you have in mind.",
            icon: "✎",
          },
          {
            n: "02",
            title: "See the possibilities",
            text: "YouCam creates outfit previews from a consented photo. Add a touch of lipstick if it feels like you.",
            icon: "✧",
          },
          {
            n: "03",
            title: "Their say. Your surprise.",
            text: "Your recipient approves the looks they would welcome. Choose from those favourites and keep the final pick yours.",
            icon: "♡",
          },
        ].map((x) => (
          <article key={x.n}>
            <div>
              <span className="gs-number">{x.n}</span>
              <span className="gs-card-icon">{x.icon}</span>
            </div>
            <h3>{x.title}</h3>
            <p>{x.text}</p>
          </article>
        ))}
      </section>
      <section className="gs-bottom">
        <div>
          <span className="eyebrow">
            LESS GUESSING. MORE THOUGHTFUL GIVING.
          </span>
          <h2>
            Good style is personal.
            <br />
            So is a good gift.
          </h2>
        </div>
        <Link className="button" href="/studio">
          Open your studio ↗
        </Link>
      </section>
    </div>
  );
}
