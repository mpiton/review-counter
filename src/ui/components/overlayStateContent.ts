import type { DegradedOverlayState } from "./types";

interface OverlayStateContent {
  readonly actionLabel?: string;
  readonly actionTone?: "accent" | "neutral";
  readonly desc: string;
  readonly icon: string;
  readonly title: string;
}

export const overlayStateContent: Record<DegradedOverlayState, OverlayStateContent> = {
  "auth-error": {
    actionLabel: "Reconfigurer",
    desc: "GitHub a renvoyé 401. Régénérez un token et reconfigurez l'extension.",
    icon: "⚠️",
    title: "Token invalide ou expiré",
  },
  empty: {
    desc: "Personne n'attend de review. Profitez-en.",
    icon: "🎉",
    title: "Aucune PR ouverte",
  },
  "network-error": {
    actionLabel: "Réessayer",
    desc: "Impossible de joindre l'API GitHub.",
    icon: "📡",
    title: "Connexion impossible",
  },
  "no-token": {
    actionLabel: "Ouvrir la configuration",
    actionTone: "accent",
    desc: "Un PAT avec le scope public_repo est requis pour compter les reviews.",
    icon: "🔑",
    title: "Configurez votre token GitHub",
  },
  "rate-limit": {
    desc: "Le quota GitHub est épuisé. Réessayez dans un moment.",
    icon: "⏳",
    title: "Limite API atteinte",
  },
};
