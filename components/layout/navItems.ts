import {
  BarChart3,
  CalendarPlus,
  Clapperboard,
  Gauge,
  Info,
  Radio,
  Settings,
  Target,
  Trophy,
  Wine,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Gauge;
  gerantOnly?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Accueil", icon: Trophy },
  { href: "/regie", label: "Régie live", icon: Radio, gerantOnly: true },
  { href: "/dashboard", label: "Duel de zones", icon: Gauge },
  { href: "/diffusion", label: "Diffusion", icon: Clapperboard },
  { href: "/alcoolemie", label: "Alcoolémie", icon: Wine, gerantOnly: true },
  { href: "/predictions", label: "Pronostics", icon: Target },
  { href: "/history", label: "Historique", icon: BarChart3 },
  { href: "/events/new", label: "Créer un événement", icon: CalendarPlus, gerantOnly: true },
  { href: "/settings", label: "Seuils", icon: Settings, gerantOnly: true },
  { href: "/about", label: "À propos", icon: Info },
];
