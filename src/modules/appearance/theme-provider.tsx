"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { isTheme, themes, type Theme, type ThemeChoice } from "./themes";
type Context = {
  choice: ThemeChoice;
  effective: Theme;
  setChoice: (choice: ThemeChoice) => Promise<void>;
  error: string;
};
const ThemeContext = createContext<Context | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const site = useQuery(api.appearance.site);
  const personal = useQuery(api.appearance.mine, isAuthenticated ? {} : "skip");
  const save = useMutation(api.appearance.setMine);
  const [guest, setGuest] = useState<ThemeChoice>("site");
  const [error, setError] = useState("");
  useEffect(() => {
    const stored = localStorage.getItem("giftsquire-guest-theme");
    if (stored === "site" || (stored && isTheme(stored))) setGuest(stored);
  }, []);
  const choice = isAuthenticated ? personal || "site" : guest;
  const effective = choice === "site" ? site?.theme || "midnight" : choice;
  useEffect(() => {
    document.documentElement.dataset.theme = effective;
  }, [effective]);
  async function setChoice(next: ThemeChoice) {
    setError("");
    try {
      if (isAuthenticated) await save({ theme: next });
      else {
        setGuest(next);
        localStorage.setItem("giftsquire-guest-theme", next);
      }
    } catch {
      setError("Your theme could not be saved. Please try again.");
    }
  }
  return (
    <ThemeContext.Provider value={{ choice, effective, setChoice, error }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemePicker() {
  const context = useContext(ThemeContext);
  if (!context) return null;
  return (
    <div className="theme-picker">
      <label className="sr-only" htmlFor="theme-choice">
        Choose appearance
      </label>
      <select
        id="theme-choice"
        value={context.choice}
        onChange={(e) => void context.setChoice(e.target.value as ThemeChoice)}
      >
        <option value="site">Site default</option>
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} · {t.shades}
          </option>
        ))}
      </select>
      {context.error && <small role="alert">{context.error}</small>}
    </div>
  );
}
