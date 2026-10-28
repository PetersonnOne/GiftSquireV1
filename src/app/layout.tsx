import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { BrandLogo } from "@/components/brand-logo";
import "./globals.css";
import "./glass.css";
export const metadata: Metadata = {
  title: {
    default: "GiftSquire — Choose with confidence. Give with thought.",
    template: "%s | GiftSquire",
  },
  description:
    "A personal style and gifting companion. Preview outfits with YouCam, invite your recipient and choose something they would love to wear.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" data-theme="midnight" suppressHydrationWarning>
        <body>
          <Providers>
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <Header />
            <main id="main">{children}</main>
            <footer>
              <BrandLogo />
              <p>Choose with confidence. Give with thought.</p>
              <small>
                Clothing & lipstick previews powered by YouCam · Perfect Corp.
              </small>
            </footer>
          </Providers>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
