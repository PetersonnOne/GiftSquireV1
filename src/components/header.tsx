"use client";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { ThemePicker } from "@/modules/appearance/theme-provider";
export function Header() {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.identity.current, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();
  return (
    <header className="header">
      <Link className="brand" href="/">
        <BrandLogo />
      </Link>
      <nav aria-label="Main navigation">
        <Link
          aria-current={pathname === "/studio" ? "page" : undefined}
          href="/studio"
        >
          Your studio
        </Link>
        <Link
          aria-current={pathname === "/account" ? "page" : undefined}
          href="/account"
        >
          Your account
        </Link>
        {viewer && viewer.role !== "member" && (
          <Link href="/admin">Administration</Link>
        )}
      </nav>
      <div className="header-tools">
        <ThemePicker />
        {isAuthenticated ? (
          <button className="text-button" onClick={() => void signOut()}>
            Sign out
          </button>
        ) : (
          <Link className="button small" href="/sign-in">
            Sign in <span>↗</span>
          </Link>
        )}
      </div>
    </header>
  );
}
