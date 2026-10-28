"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { useState } from "react";
import { ThemeProvider } from "@/modules/appearance/theme-provider";
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
        // Reuse the server-confirmed token instead of rotating it immediately
        // after sign-in, when navigation can otherwise hit Auth's unload guard.
        initialAuthTokenReuse: true,
      }),
  );
  return (
    <ConvexAuthNextjsProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </ConvexAuthNextjsProvider>
  );
}
