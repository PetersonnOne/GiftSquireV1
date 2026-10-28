export const themes = [
  { id: "garden", name: "Signature", shades: "Ivory · plum · rose" },
  { id: "midnight", name: "Midnight", shades: "Plum · ink · rose" },
  { id: "dark", name: "Dark", shades: "Black · charcoal · white" },
  { id: "white", name: "White", shades: "White · gray · black" },
] as const;
export type Theme = (typeof themes)[number]["id"];
export type ThemeChoice = Theme | "site";
export function isTheme(value: string): value is Theme {
  return themes.some((t) => t.id === value);
}
