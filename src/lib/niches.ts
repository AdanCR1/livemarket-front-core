import type { IconType } from "react-icons";
import {
  FiCoffee,
  FiCpu,
  FiShoppingBag,
  FiGift,
  FiGrid,
} from "react-icons/fi";

export interface MegaMenuLink {
  label: string;
  href: string;
  description?: string;
}

export interface MegaMenuColumn {
  title: string;
  links: MegaMenuLink[];
}

export interface NicheConfig {
  slug: string;
  label: string;
  theme: string;
  icon: IconType;
  emoji: string;
  tagline: string;
  description: string;
  gradient: string;
  active: boolean;
  megaMenu?: MegaMenuColumn[];
}

export const NICHES: Record<string, NicheConfig> = {
  gastronomia: {
    slug: "gastronomia",
    label: "Gastronomía",
    theme: "theme-gastronomia",
    icon: FiCoffee,
    emoji: "🍳",
    tagline: "Sabores auténticos del mercado",
    description:
      "Descubre restaurantes, panaderías y mercados artesanales en tu ciudad. Compra en vivo con los mejores productores.",
    gradient: "from-orange-900/50 via-amber-900/50 to-red-950/50",
    active: true,
    megaMenu: [
      {
        title: "Categorías",
        links: [
          { label: "Restaurantes", href: "/gastronomia/restaurantes" },
          { label: "Panaderías", href: "/gastronomia/panaderias" },
          { label: "Mercados", href: "/gastronomia/mercados" },
        ],
      },
      {
        title: "Destacados",
        links: [
          { label: "Ofertas en vivo", href: "/gastronomia/en-vivo" },
          { label: "Mejor valorados", href: "/gastronomia/mejor-valorados" },
        ],
      },
    ],
  },
  tecnologia: {
    slug: "tecnologia",
    label: "Tecnología",
    theme: "theme-tecnologia",
    icon: FiCpu,
    emoji: "💻",
    tagline: "Innovación al alcance",
    description:
      "Tiendas de electrónica, gadgets y componentes con transmisiones en vivo y ofertas exclusivas.",
    gradient: "from-cyan-900/50 via-blue-900/50 to-indigo-950/50",
    active: false,
    megaMenu: [
      {
        title: "Dispositivos",
        links: [
          { label: "Celulares", href: "/tecnologia/celulares" },
          { label: "Computadoras", href: "/tecnologia/computadoras" },
          { label: "Tablets", href: "/tecnologia/tablets" },
        ],
      },
      {
        title: "Accesorios",
        links: [
          { label: "Audio", href: "/tecnologia/audio" },
          { label: "Wearables", href: "/tecnologia/wearables" },
          { label: "Cables y cargadores", href: "/tecnologia/accesorios" },
        ],
      },
    ],
  },
    ropa: {
    slug: "ropa",
    label: "ropa",
    theme: "theme-ropa",
    icon: FiShoppingBag,
    emoji: "👗",
    tagline: "Estilo sin fronteras",
    description:
      "Boutiques, diseñadores independientes y marcas emergentes. Desfiles en vivo y colecciones exclusivas.",
    gradient: "from-pink-900/50 via-rose-900/50 to-fuchsia-950/50",
    active: false,
    megaMenu: [
      {
        title: "Ropa",
        links: [
          { label: "Remeras", href: "/ropa/remeras" },
          { label: "Pantalones", href: "/ropa/pantalones" },
          { label: "Abrigos", href: "/ropa/abrigos" },
        ],
      },
      {
        title: "Accesorios",
        links: [
          { label: "Bolsos", href: "/ropa/bolsos" },
          { label: "Lentes", href: "/ropa/lentes" },
        ],
      },
    ],
  },
  jugueteria: {
    slug: "jugueteria",
    label: "Juguetería",
    theme: "theme-jugueteria",
    icon: FiGift,
    emoji: "🧸",
    tagline: "Diversión para todas las edades",
    description:
      "Encuentra juguetes educativos, de colección, juegos de mesa y entretenimiento para toda la familia.",
    gradient: "from-purple-900/50 via-violet-900/50 to-purple-950/50",
    active: false,
    megaMenu: [
      {
        title: "Por Edad",
        links: [
          { label: "Bebés", href: "/jugueteria/bebes" },
          { label: "Niños", href: "/jugueteria/ninos" },
          { label: "Coleccionistas", href: "/jugueteria/coleccionistas" },
        ],
      },
      {
        title: "Categorías",
        links: [
          { label: "Educativos", href: "/jugueteria/educativos" },
          { label: "Juegos de mesa", href: "/jugueteria/juegos-de-mesa" },
          { label: "Figuras de acción", href: "/jugueteria/figuras" },
        ],
      },
    ],
  },
  otros: {
    slug: "otros",
    label: "Otros",
    theme: "theme-otros",
    icon: FiGrid,
    emoji: "📦",
    tagline: "Variedad sin límites",
    description:
      "Explora artículos misceláneos, productos para el hogar, mascotas y categorías generales en nuestro marketplace.",
    gradient: "from-gray-900/50 via-slate-900/50 to-zinc-950/50",
    active: false,
    megaMenu: [
      {
        title: "Categorías Varias",
        links: [
          { label: "Hogar", href: "/otros/hogar" },
          { label: "Mascotas", href: "/otros/mascotas" },
          { label: "Herramientas", href: "/otros/herramientas" },
          { label: "Miscelánea", href: "/otros/miscelanea" },
        ],
      },
    ],
  },
};

export type NicheKey = keyof typeof NICHES;
export type NicheConfigType = NicheConfig;

export function getNicheConfig(slug: string | undefined): NicheConfig | undefined {
  if (!slug) return undefined;
  return NICHES[slug as NicheKey];
}

export function getValidNicheSlugs(): string[] {
  return Object.keys(NICHES);
}

export function getActiveNiches(): NicheConfig[] {
  return Object.values(NICHES).filter((n) => n.active);
}