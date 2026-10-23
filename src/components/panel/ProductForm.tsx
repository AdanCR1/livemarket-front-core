import { useState, useEffect, type FormEvent } from "react";
import { getPanelTheme } from "../../lib/panel-themes";
import { getFieldsForNiche, type DynamicFieldConfig } from "../../lib/schemas";
import { buildMediaUrl } from "../../lib/constants";
import type { ProductWithMedia, CreateProductPayload, MediaSlotInput } from "../../lib/types/types";

interface ProductFormProps {
  storeId: string;
  niche: string;
  initialProduct?: ProductWithMedia | null;
  onCancel: () => void;
  onSubmit: (payload: CreateProductPayload, mediaSlots: MediaSlotInput[]) => Promise<void>;
}

const SLOT_LABELS = [
  "Imagen principal (Obligatoria)",
  "Segunda imagen (Opcional)",
  "Tercera imagen (Opcional)",
];

export function ProductForm({
  storeId,
  niche,
  initialProduct,
  onCancel,
  onSubmit,
}: ProductFormProps) {
  const theme = getPanelTheme(niche);
  const dynamicFields: DynamicFieldConfig[] = getFieldsForNiche(niche);

  const [name, setName] = useState(initialProduct?.name ?? "");
  const [description, setDescription] = useState(initialProduct?.description ?? "");
  const [price, setPrice] = useState(
    initialProduct?.price !== undefined ? String(initialProduct.price) : ""
  );
  const [stock, setStock] = useState(
    initialProduct?.stock !== undefined ? String(initialProduct.stock) : ""
  );
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});

  // ─── 3 slots de media (order 0, 1, 2) ───
  const [slotFiles, setSlotFiles] = useState<Record<number, File | null>>({ 0: null, 1: null, 2: null });
  const [slotPreviews, setSlotPreviews] = useState<Record<number, string | null>>({ 0: null, 1: null, 2: null });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar atributos dinámicos
  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    dynamicFields.forEach((field) => {
      if (initialProduct?.attributes && field.name in initialProduct.attributes) {
        defaults[field.name] = initialProduct.attributes[field.name];
      } else if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      } else {
        defaults[field.name] = field.type === "boolean" ? false : "";
      }
    });
    setAttributes(defaults);
  }, [niche, initialProduct]);

  // Inicializar previews de slots desde el producto existente
  useEffect(() => {
    const previews: Record<number, string | null> = { 0: null, 1: null, 2: null };
    if (initialProduct?.media) {
      for (const m of initialProduct.media) {
        previews[m.order] = buildMediaUrl(m.url) ?? null;
      }
    }
    setSlotPreviews(previews);
    setSlotFiles({ 0: null, 1: null, 2: null });
  }, [initialProduct]);

  function handleAttributeChange(fieldName: string, value: unknown) {
    setAttributes((prev) => ({ ...prev, [fieldName]: value }));
  }

  function handleSlotFileChange(order: number, file: File | null) {
    setSlotFiles((prev) => ({ ...prev, [order]: file }));
    setSlotPreviews((prev) => {
      const next = { ...prev };
      if (file) {
        next[order] = URL.createObjectURL(file);
      } else {
        // Si no hay file nuevo, restaurar preview del existing (o null)
        const existing = initialProduct?.media?.find((m) => m.order === order);
        next[order] = existing ? buildMediaUrl(existing.url) ?? null : null;
      }
      return next;
    });
  }

  function handleClearSlot(order: number) {
    setSlotFiles((prev) => ({ ...prev, [order]: null }));
    setSlotPreviews((prev) => ({ ...prev, [order]: null }));
    // También marcamos la imagen existente como "removida" (el backend la borrará
    // porque no estará en el payload).
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock, 10);

    const hasMainImage = slotFiles[0] !== null || slotPreviews[0] !== null;
    if (!hasMainImage) {
      setErrorMsg("Debes subir al menos la imagen principal del producto.");
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    try {
      // Construir únicamente los slots que realmente tengan un archivo nuevo o una URL existente
      const mediaSlots: MediaSlotInput[] = [0, 1, 2]
        .map((order) => {
          const file = slotFiles[order];
          const existing = initialProduct?.media?.find((m) => m.order === order);
          const hasPreview = !!slotPreviews[order];
          return {
            order,
            file: file ?? null,
            existingUrl: !file && existing && hasPreview ? existing.url : null,
          };
        })
        .filter((s) => s.file !== null || s.existingUrl !== null);

      await onSubmit(
        {
          store_id: storeId,
          business_model: niche,
          name: name.trim(),
          description: description.trim() || undefined,
          price: parsedPrice,
          stock: parsedStock,
          attributes,
        },
        mediaSlots
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al guardar el producto"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto panel-card p-4 md:p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 md:pb-5 mb-4 md:mb-6 border-b border-[var(--panel-border)]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.primaryColor}25, ${theme.accentColor}15)`,
              color: theme.primaryColor,
            }}
          >
            <theme.icon className="w-5 h-5" />
          </div>
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold panel-font-display">
            {initialProduct ? `Editar: ${initialProduct.name}` : theme.productCreationTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg text-[var(--panel-muted)] hover:text-[var(--panel-text)] transition-colors"
        >
          <theme.icons.close className="w-5 h-5" />
        </button>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Datos básicos */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--panel-muted)] mb-1.5">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Plato especial, Smartphone, Casaca..."
              className="panel-input w-full px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--panel-muted)] mb-1.5">
              Descripción
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe los detalles principales de tu producto..."
              className="panel-input w-full px-4 py-2.5 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--panel-muted)] mb-1.5">
                Precio (Bs) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="panel-input w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--panel-muted)] mb-1.5">
                Stock *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="panel-input w-full px-4 py-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Atributos del nicho */}
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: theme.accentColor }}
            >
              Atributos de {theme.label}
            </span>
            <div className="flex-1 h-px bg-[var(--panel-border)]" />
          </div>

          <div className="space-y-4">
            {dynamicFields.map((field) => (
              <div key={field.name}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--panel-muted)] mb-2">
                  {field.label} {field.required && "*"}
                </label>

                {field.type === "radio" && field.options && (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((opt) => {
                      const selected = attributes[field.name] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAttributeChange(field.name, opt)}
                          className={`radio-option ${selected ? "selected" : ""}`}
                        >
                          <span className="radio-dot" />
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {field.type === "boolean" && (
                  <button
                    type="button"
                    onClick={() => handleAttributeChange(field.name, !attributes[field.name])}
                    className="flex items-center gap-3"
                  >
                    <span className={`toggle-switch ${attributes[field.name] ? "on" : ""}`}>
                      <span className="toggle-knob" />
                    </span>
                    <span className="text-sm text-[var(--panel-muted)]">
                      {attributes[field.name] ? "Sí" : "No"}
                    </span>
                  </button>
                )}

                {field.type === "select" && field.options && (
                  <select
                    value={String(attributes[field.name] ?? "")}
                    onChange={(e) => handleAttributeChange(field.name, e.target.value)}
                    required={field.required}
                    className="panel-input w-full px-4 py-2.5 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {(field.type === "text" || field.type === "number") && (
                  <div className="flex items-center gap-2">
                    <input
                      type={field.type}
                      required={field.required}
                      value={String(attributes[field.name] ?? "")}
                      onChange={(e) =>
                        handleAttributeChange(
                          field.name,
                          field.type === "number" ? Number(e.target.value) : e.target.value
                        )
                      }
                      placeholder={field.placeholder}
                      className="panel-input flex-1 px-4 py-2.5 text-sm"
                    />
                    {field.suffix && (
                      <span className="text-xs text-[var(--panel-muted)] font-medium px-2">
                        {field.suffix}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Multimedia: 3 slots */}
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: theme.accentColor }}
            >
              Imágenes (hasta 3)
            </span>
            <div className="flex-1 h-px bg-[var(--panel-border)]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((order) => {
              const preview = slotPreviews[order];
              const hasFile = !!slotFiles[order];
              return (
                <div key={order} className="space-y-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--panel-muted)]">
                    {SLOT_LABELS[order]}
                  </span>

                  {preview ? (
                    <div className="relative group">
                      <img
                        src={preview}
                        alt={SLOT_LABELS[order]}
                        className="w-full aspect-square object-cover rounded-xl border border-[var(--panel-border)]"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                        <label className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs cursor-pointer hover:bg-white/20">
                          Cambiar
                          <input
                            type="file"
                            accept="image/webp"
                            className="hidden"
                            onChange={(e) => handleSlotFileChange(order, e.target.files?.[0] ?? null)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleClearSlot(order)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/30 text-white text-xs hover:bg-red-500/50"
                        >
                          Quitar
                        </button>
                      </div>
                      {hasFile && (
                        <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-emerald-500/80 text-white text-[10px] font-bold">
                          Nuevo
                        </span>
                      )}
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="w-full aspect-square rounded-xl border-2 border-dashed border-[var(--panel-border)] hover:border-[var(--panel-primary)] flex flex-col items-center justify-center gap-2 text-center transition-colors">
                        <theme.icons.upload className="w-6 h-6" style={{ color: theme.accentColor }} />
                        <span className="text-[11px] font-medium">Subir WEBP</span>
                        <span className="text-[10px] text-[var(--panel-muted)]">máx. 10 MB</span>
                      </div>
                      <input
                        type="file"
                        accept="image/webp"
                        className="hidden"
                        onChange={(e) => handleSlotFileChange(order, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[var(--panel-muted)] mt-2">
            Solo aceptamos <strong>.webp</strong>. Convertí tu imagen en{" "}
            <a href="https://cloudconvert.com/png-to-webp" target="_blank" rel="noreferrer" className="underline" style={{ color: theme.accentColor }}>
              cloudconvert.com
            </a>.
          </p>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-[var(--panel-border)] nav-buttons">
          <button type="button" onClick={onCancel} className="panel-btn-secondary px-5 py-2.5 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="panel-btn-primary px-6 py-2.5 text-sm inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Guardando...
              </>
            ) : (
              <>
                <theme.icons.check className="w-4 h-4" />
                {initialProduct ? "Guardar cambios" : "Publicar producto"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}