import type { IconType } from "react-icons";

interface NicheIconRenderProps {
  Icon: IconType;
  className?: string;
}

/**
 * Wrapper para renderizar un icono de react-icons dinámicamente
 * en Astro. Evita el bug "[object Object]" al interpolar el componente
 * directamente en una expresión de plantilla.
 */
export function NicheIconRender({ Icon, className }: NicheIconRenderProps) {
  const Cmp = Icon;
  return <Cmp className={className} />;
}