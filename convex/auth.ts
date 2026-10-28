import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { verificationEmail, resetEmail } from "./services/email";
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: verificationEmail,
      reset: resetEmail,
      validatePasswordRequirements(password) {
        if (password.length < 12 || password.length > 128)
          throw new Error("Use a password between 12 and 128 characters.");
      },
      profile(params) {
        const email = String(params.email || "")
          .trim()
          .toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
          throw new Error("Enter a valid email address.");
        return {
          email,
          name: String(params.name || "GiftSquire member")
            .trim()
            .slice(0, 80),
        };
      },
    }),
  ],
});
