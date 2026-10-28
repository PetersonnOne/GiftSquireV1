"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
type Stage =
  "signIn" | "signUp" | "reset" | "email-verification" | "reset-verification";
export function SignInForm() {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const viewer = useQuery(api.identity.current, isAuthenticated ? {} : "skip");
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const requested =
      new URLSearchParams(window.location.search).get("flow") === "reset";
    if (requested) setStage("reset");
    setReady(true);
  }, []);
  const [stage, setStage] = useState<Stage>("signIn"),
    [email, setEmail] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (
      ready &&
      !pending &&
      !isLoading &&
      viewer &&
      !viewer.isAnonymous &&
      stage !== "reset" &&
      stage !== "reset-verification"
    )
      router.replace(
        sessionStorage.getItem("giftsquire-invite") ? "/join" : "/account",
      );
  }, [viewer, router, ready, stage, pending, isLoading]);
  const codeStage =
    stage === "email-verification" || stage === "reset-verification";
  const title =
    stage === "signIn"
      ? "Welcome back."
      : stage === "signUp"
        ? "Let’s get acquainted."
        : stage === "reset"
          ? "A fresh start."
          : stage === "email-verification"
            ? "Check your email."
            : "Choose a new password.";
  function change(next: Stage) {
    setStage(next);
    setError("");
    setNotice("");
  }
  return (
    <form
      className="panel auth-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        setNotice("");
        const data = new FormData(e.currentTarget);
        try {
          await signIn("password", data);
          if (stage === "reset") {
            setStage("reset-verification");
            setNotice(
              "If the account exists, a recovery code will arrive shortly.",
            );
          } else if (stage === "signUp" || stage === "signIn") {
            setStage("email-verification");
            setNotice(
              "Enter the verification code sent to your email. Already verified accounts sign in immediately.",
            );
          } else if (stage === "reset-verification") {
            router.replace(
              sessionStorage.getItem("giftsquire-invite")
                ? "/join"
                : "/account",
            );
          }
        } catch {
          if (stage === "reset") {
            setStage("reset-verification");
            setNotice(
              "If the account exists, a recovery code will arrive shortly.",
            );
          } else
            setError(
              codeStage
                ? "The code could not be verified. Check the code and email, or request a new code."
                : "The request could not be completed. Check your details and try again.",
            );
        } finally {
          setPending(false);
        }
      }}
    >
      <span className="eyebrow">YOUR PERSONAL STYLE STARTS HERE</span>
      <h1>{title}</h1>
      <p>
        {codeStage
          ? "Codes expire after 15 minutes."
          : "Use your email and a unique password to access your account."}
      </p>
      {viewer?.isAnonymous && (
        <div className="notice">
          You are using a sample session.{" "}
          <button
            type="button"
            className="text-button"
            onClick={async () => {
              await signOut();
              localStorage.removeItem("giftsquire-active-plan");
            }}
          >
            Leave the sample to sign in
          </button>
        </div>
      )}
      <fieldset disabled={!ready || pending || viewer?.isAnonymous === true}>
        {stage === "signUp" && (
          <label>
            Your name
            <input name="name" autoComplete="name" maxLength={80} required />
          </label>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            required
            readOnly={codeStage}
            onChange={(e) => setEmail(e.target.value.trim())}
          />
        </label>
        {(stage === "signIn" || stage === "signUp") && (
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                stage === "signIn" ? "current-password" : "new-password"
              }
              minLength={12}
              maxLength={128}
              required
            />
            <small>Use 12–128 characters.</small>
          </label>
        )}
        {codeStage && (
          <label>
            Verification code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              minLength={8}
              maxLength={8}
              required
            />
          </label>
        )}
        {stage === "reset-verification" && (
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
        )}
        <input type="hidden" name="flow" value={stage} />
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <button className="button" type="submit">
          {pending
            ? "Please wait…"
            : stage === "signUp"
              ? "Create account"
              : stage === "reset"
                ? "Send recovery code"
                : codeStage
                  ? "Verify and continue"
                  : "Sign in"}
          <span>↗</span>
        </button>
      </fieldset>
      <div className="auth-links">
        {stage === "signIn" ? (
          <>
            <button
              className="text-button"
              type="button"
              onClick={() => change("signUp")}
            >
              New here? Create an account
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => change("reset")}
            >
              Forgot your password?
            </button>
          </>
        ) : (
          <button
            className="text-button"
            type="button"
            onClick={() => change("signIn")}
          >
            Back to sign in / request a new code
          </button>
        )}
      </div>
    </form>
  );
}
