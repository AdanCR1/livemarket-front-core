export type DynamicFieldType =
  | "text"
  | "number"
  | "boolean"
  | "radio"
  | "select"
  | "textarea";

export interface DynamicFieldConfig {
  name: string;
  label: string;
  type: DynamicFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  suffix?: string;
  defaultValue?: unknown;
}

export interface JsonSchemaProperty {
  type: "string" | "number" | "integer" | "boolean";
  title?: string;
  description?: string;
  enum?: string[];
  uiWidget?: DynamicFieldType;
  suffix?: string;
  default?: unknown;
}

export interface BusinessModelJsonSchema {
  type: "object";
  required?: string[];
  properties: Record<string, JsonSchemaProperty>;
  additionalProperties?: boolean;
}

/**
 * Schemas JSON por nicho (fallback estático alineado con el diseño de UX/UI).
 *
 * ⚠️ Las claves de este objeto deben coincidir EXACTAMENTE con el enum
 * `business_model_local` de Postgres en MS2:
 *   ['ropa', 'tecnologia', 'jugueteria', 'gastronomia', 'otros']
 *
 * ⚠️ Los campos `properties`, `required` y `additionalProperties` de cada nicho
 * deben reflejar el `schema` jsonb de la tabla `business_model_schemas`.
 * Si divergen, el trigger `validate_product_attributes` rechazará el INSERT
 * con el error "Los atributos no cumplen con el esquema de <nicho>".
 */
export const NICHE_JSON_SCHEMAS: Record<string, BusinessModelJsonSchema> = {
  gastronomia: {
    type: "object",
    required: ["porcion"],
    properties: {
      porcion: {
        type: "string",
        title: "Porción",
        enum: ["Individual", "Para compartir", "Familiar"],
        uiWidget: "radio",
        default: "Individual",
      },
      categoria: {
        type: "string",
        title: "Categoría del menú",
        enum: [
          "Salteñas y empanadas",
          "Sopas y caldos",
          "Platos de fondo (segundos)",
          "Anticuchos y parrilla",
          "Postres y dulces",
          "Bebidas típicas",
        ],
        uiWidget: "select",
      },
      ingredientes_extra: {
        type: "boolean",
        title: "Ingredientes extra",
        default: false,
      },
      info_alergenos: {
        type: "string",
        title: "Info alérgenos",
        description: "Ej: Contiene gluten, lácteos, maní...",
      },
    },
    additionalProperties: false,
  },

  tecnologia: {
    type: "object",
    required: ["marca"],
    properties: {
      marca: {
        type: "string",
        title: "Marca",
        description: "Ej: Samsung, Apple, Xiaomi, Sony...",
      },
      modelo: {
        type: "string",
        title: "Modelo",
        description: "Ej: Galaxy S24, WH-1000XM5...",
      },
      garantia_meses: {
        type: "integer",
        title: "Garantía",
        suffix: "meses",
        default: 12,
      },
      condicion: {
        type: "string",
        title: "Estado del equipo",
        enum: ["Nuevo sellado", "Open Box", "Reacondicionado"],
        uiWidget: "radio",
        default: "Nuevo sellado",
      },
    },
    additionalProperties: false,
  },

  ropa: {
    type: "object",
    required: ["talla", "material"],
    properties: {
      talla: {
        type: "string",
        title: "Talla",
        enum: ["XS", "S", "M", "L", "XL", "Única"],
        uiWidget: "radio",
        default: "M",
      },
      color: {
        type: "string",
        title: "Color principal",
        description: "Ej: Negro mate, Beige, Azul marino...",
      },
      material: {
        type: "string",
        title: "Material / Tela",
        description: "Ej: Algodón pima 100%, Lino, Cuero...",
      },
      hecho_a_mano: {
        type: "boolean",
        title: "Confección artesanal / Diseño de autor",
        default: false,
      },
    },
    additionalProperties: false,
  },

  jugueteria: {
    type: "object",
    required: ["edad_recomendada"],
    properties: {
      edad_recomendada: {
        type: "string",
        title: "Edad recomendada",
        enum: [
          "0-2 años",
          "3-5 años",
          "6-11 años",
          "12+ años / Coleccionistas",
        ],
        uiWidget: "radio",
        default: "3-5 años",
      },
      categoria: {
        type: "string",
        title: "Categoría de juguete",
        enum: [
          "Juguetes tradicionales de madera",
          "Muñecas y muñecos de trapo",
          "Juegos de mesa y destreza",
          "Juguetes didácticos y de construcción",
          "Juguetes al aire libre",
        ],
        uiWidget: "select",
      },
      requiere_baterias: {
        type: "boolean",
        title: "Incluye / Requiere baterías",
        default: false,
      },
      material_seguro: {
        type: "string",
        title: "Material y certificaciones",
        description: "Ej: Plástico ABS libre de BPA, Madera natural...",
      },
    },
    additionalProperties: false,
  },

  otros: {
    type: "object",
    required: [],
    properties: {
      categoria: {
        type: "string",
        title: "Categoría",
        enum: [
          "Artesanía textil",
          "Cerámica y alfarería",
          "Madera y tallado",
          "Cuero y marroquinería",
          "Hogar y cocina",
          "Herramientas",
          "Mascotas",
        ],
        uiWidget: "select",
      },
      dimensiones: {
        type: "string",
        title: "Dimensiones / Peso aproximado",
        description: "Ej: 30x20cm - 1.2 kg",
      },
      envio_inmediato: {
        type: "boolean",
        title: "Disponible para entrega inmediata",
        default: true,
      },
    },
    // 'otros' es el cajón de sastre: permite atributos libres que el
    // formulario no declara (coherente con la DB).
    additionalProperties: true,
  },
};

/**
 * Convierte un JSON Schema en un arreglo de campos de formulario tipados.
 * El orden de iteración respeta el orden de `properties` en el schema.
 */
export function parseSchemaToFields(
  schema: BusinessModelJsonSchema
): DynamicFieldConfig[] {
  const requiredSet = new Set(schema.required ?? []);
  const fields: DynamicFieldConfig[] = [];

  for (const [key, prop] of Object.entries(schema.properties)) {
    let fieldType: DynamicFieldType = "text";

    if (prop.uiWidget) {
      fieldType = prop.uiWidget;
    } else if (prop.type === "boolean") {
      fieldType = "boolean";
    } else if (prop.type === "number" || prop.type === "integer") {
      fieldType = "number";
    } else if (prop.enum && prop.enum.length > 0) {
      fieldType = prop.enum.length <= 4 ? "radio" : "select";
    }

    fields.push({
      name: key,
      label: prop.title ?? key.replace(/_/g, " "),
      type: fieldType,
      required: requiredSet.has(key),
      placeholder: prop.description,
      options: prop.enum,
      suffix: prop.suffix,
      defaultValue: prop.default,
    });
  }

  return fields;
}

export function getFieldsForNiche(niche: string): DynamicFieldConfig[] {
  const schema = NICHE_JSON_SCHEMAS[niche] ?? NICHE_JSON_SCHEMAS.otros;
  return parseSchemaToFields(schema);
}