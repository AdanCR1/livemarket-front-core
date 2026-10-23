import type { IconType } from "react-icons";
import {
  FiCoffee,
  FiCpu,
  FiShoppingBag,
  FiGift,
  FiGrid,
  FiDollarSign,
  FiEye,
  FiPackage,
  FiStar,
  FiTrendingUp,
  FiActivity,
  FiUsers,
  FiMessageSquare,
  FiHeart,
  FiMapPin,
  FiImage,
  FiVideo,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiArrowLeft,
  FiArrowRight,
  FiUploadCloud,
  FiSettings,
  FiLogOut,
  FiExternalLink,
  FiMenu,
  FiBarChart2,
  FiRadio,
  FiUser,
} from "react-icons/fi";

export interface PanelThemeConfig {
  niche: string;
  label: string;
  icon: IconType;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  fontDisplay: string;
  roleGreeting: string;
  productCreationTitle: string;
  illustrationLabel: string;
  dashboardBgImage: string;
  icons: typeof baseIcons;
}

const baseIcons = {
  dashboard: FiBarChart2,
  products: FiPackage,
  live: FiRadio,
  settings: FiSettings,
  sales: FiDollarSign,
  visits: FiEye,
  rating: FiStar,
  activity: FiActivity,
  add: FiPlus,
  edit: FiEdit2,
  delete: FiTrash2,
  close: FiX,
  check: FiCheck,
  back: FiArrowLeft,
  next: FiArrowRight,
  upload: FiUploadCloud,
  image: FiImage,
  video: FiVideo,
  location: FiMapPin,
  logout: FiLogOut,
  external: FiExternalLink,
  menu: FiMenu,
  user: FiUser,
  users: FiUsers,
  comments: FiMessageSquare,
  heart: FiHeart,
  trend: FiTrendingUp,
  eye: FiEye,
};

export const PANEL_THEMES: Record<string, PanelThemeConfig> = {
  gastronomia: {
    niche: "gastronomia",
    label: "Gastronomía",
    icon: FiCoffee,
    primaryColor: "#e8590c",
    accentColor: "#f59f00",
    bgColor: "#140b06",
    surfaceColor: "#241309",
    fontDisplay: "'Playfair Display', Georgia, serif",
    roleGreeting: "Chef",
    productCreationTitle: "Nuevo producto gastronómico",
    illustrationLabel: "Sabor artesanal, madera y cocina en vivo",
    dashboardBgImage: "/img/bg-gastronomia.webp",
    icons: baseIcons,
  },
  tecnologia: {
    niche: "tecnologia",
    label: "Tecnología",
    icon: FiCpu,
    primaryColor: "#0ca678",
    accentColor: "#22b8cf",
    bgColor: "#050d0b",
    surfaceColor: "#0c1d18",
    fontDisplay: "'Space Grotesk', sans-serif",
    roleGreeting: "Tech Partner",
    productCreationTitle: "Nuevo producto tecnológico",
    illustrationLabel: "Circuitos, componentes e innovación digital",
    dashboardBgImage: "/img/bg-tecnologia.webp",
    icons: baseIcons,
  },
  ropa: {
    niche: "ropa",
    label: "Moda",
    icon: FiShoppingBag,
    primaryColor: "#c2255c",
    accentColor: "#f06595",
    bgColor: "#14050e",
    surfaceColor: "#260a1a",
    fontDisplay: "'DM Serif Display', Georgia, serif",
    roleGreeting: "Diseñador",
    productCreationTitle: "Nueva prenda o accesorio",
    illustrationLabel: "Alta costura, telas y pasarela",
    dashboardBgImage: "/img/bg-ropa.webp",
    icons: baseIcons,
  },
  jugueteria: {
    niche: "jugueteria",
    label: "Juguetería",
    icon: FiGift,
    primaryColor: "#7048e8",
    accentColor: "#b197fc",
    bgColor: "#0d071a",
    surfaceColor: "#1a0e33",
    fontDisplay: "'Fredoka', sans-serif",
    roleGreeting: "Creador",
    productCreationTitle: "Nuevo juguete o juego",
    illustrationLabel: "Creatividad, diversión y coleccionables",
    dashboardBgImage: "/img/bg-jugueteria.webp",
    icons: baseIcons,
  },
  otros: {
    niche: "otros",
    label: "Otros",
    icon: FiGrid,
    primaryColor: "#495057",
    accentColor: "#868e96",
    bgColor: "#0a0b0d",
    surfaceColor: "#16181d",
    fontDisplay: "'Inter', sans-serif",
    roleGreeting: "Comerciante",
    productCreationTitle: "Nuevo producto del catálogo",
    illustrationLabel: "Inventario general y misceláneos",
    dashboardBgImage: "/img/bg-otros.webp",
    icons: baseIcons,
  },
};

export function getPanelTheme(niche?: string): PanelThemeConfig {
  if (!niche) return PANEL_THEMES.gastronomia;
  return PANEL_THEMES[niche] ?? PANEL_THEMES.otros;
}