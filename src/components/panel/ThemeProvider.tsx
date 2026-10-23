import type { ReactNode, CSSProperties } from "react";
import { getPanelTheme } from "../../lib/panel-themes";

interface ThemeProviderProps {
  niche: string;
  children: ReactNode;
}

export function ThemeProvider({ niche, children }: ThemeProviderProps) {
  const theme = getPanelTheme(niche);

  const customStyles: CSSProperties = {
    "--panel-primary": theme.primaryColor,
    "--panel-accent": theme.accentColor,
    "--panel-bg": theme.bgColor,
    "--panel-surface": theme.surfaceColor,
    "--panel-font-display": theme.fontDisplay,
  } as CSSProperties;

  return (
    <div
      className="panel relative min-h-screen overflow-x-hidden"
      data-niche={theme.niche}
      style={customStyles}
    >
      {/* ── Fondo Temático Fijo para el Panel B2B ── */}
      {/* ── Fondo Temático Fijo y Centrado para el Panel ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden w-screen h-screen"
        aria-hidden="true"
      >
        <img
          src={theme.dashboardBgImage}
          alt=""
          className="w-full h-full object-cover object-center min-w-full min-h-full opacity-55 filter blur-[1px] brightness-90 contrast-110"
        />
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            background: `radial-gradient(circle at 50% 50%, color-mix(in srgb, ${theme.primaryColor} 10%, transparent), var(--panel-bg) 75%)`,
          }}
        />
      </div>

      {/* Contenedor relativo para asegurar z-index sobre el fondo */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
}