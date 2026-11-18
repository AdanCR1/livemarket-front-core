import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
  FiMapPin,
  FiShoppingBag,
  FiCheck,
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiUploadCloud,
  FiImage,
} from "react-icons/fi";
import { AuthService, TECHNOLOGY, SUCRE_CITY_ID } from "../../lib/types/services";
import { establishSession } from "../../components/auth/establishSession";
import { MS3_URL } from "../../lib/constants";
import type { RegisterB2BPayload } from "../../lib/types/types";


interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  store_name: string;
  local_address: string;
  logo_url: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const STEPS = [
  {
    id: 1,
    title: "Datos de tu tienda",
    subtitle: "Cuéntanos sobre tu negocio",
    icon: <FiShoppingBag size={20} />,
    fields: ["store_name"],
  },
  {
    id: 2,
    title: "Ubicación",
    subtitle: "¿Dónde está tu tienda?",
    icon: <FiMapPin size={20} />,
    fields: ["local_address"],
  },
  {
    id: 3,
    title: "Tu cuenta",
    subtitle: "Crea tus credenciales de acceso",
    icon: <FiBriefcase size={20} />,
    fields: ["email", "password", "confirmPassword"],
  },
];

export default function RegisterB2BForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    confirmPassword: "",
    store_name: "",
    local_address: "",
    logo_url: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [animationDirection, setAnimationDirection] = useState<"forward" | "backward">("forward");


  function handleLogoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("El archivo seleccionado debe ser una imagen.");
      return;
    }

    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    setError(null);
  }

  function validateStep(stepIndex: number): boolean {
    const errors: FormErrors = {};
    const stepFields = STEPS[stepIndex].fields;

    if (stepFields.includes("store_name")) {
      if (!form.store_name.trim()) {
        errors.store_name = "El nombre de la tienda es requerido";
      } else if (form.store_name.trim().length < 3) {
        errors.store_name = "Mínimo 3 caracteres";
      }
    }



    if (stepFields.includes("email")) {
      if (!form.email.trim()) {
        errors.email = "El correo es requerido";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = "Ingresa un correo válido";
      }
    }

    if (stepFields.includes("password")) {
      if (!form.password) {
        errors.password = "La contraseña es requerida";
      } else if (form.password.length < 6) {
        errors.password = "Mínimo 6 caracteres";
      }
    }

    if (stepFields.includes("confirmPassword")) {
      if (!form.confirmPassword) {
        errors.confirmPassword = "Confirma tu contraseña";
      } else if (form.password !== form.confirmPassword) {
        errors.confirmPassword = "Las contraseñas no coinciden";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goToStep(stepIndex: number) {
    setAnimationDirection(stepIndex > currentStep ? "forward" : "backward");
    setCurrentStep(stepIndex);
    setError(null);
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      goToStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validateStep(currentStep)) return;


    setLoading(true);

    try {
      let uploadedLogoUrl = "";

      // 1. Si el usuario adjuntó un logo, subirlo primero a MS Media
      if (logoFile) {
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append("file", logoFile);

        const uploadRes = await fetch(`${MS3_URL}/upload/store-logo`, {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success) {
          uploadedLogoUrl = uploadData.data.url;
        }
        setUploadingLogo(false);
      }

      // 2. Ejecutar registro B2B
      const payload: RegisterB2BPayload = {
        email: form.email.trim(),
        password: form.password,
        store_name: form.store_name.trim(),
        business_model: TECHNOLOGY,
        city_id: SUCRE_CITY_ID,
        local_address: form.local_address?.trim() || undefined,
        logo_url: uploadedLogoUrl || undefined,
      };

      const { error: registerError } = await AuthService.registerB2B(payload);

      if (registerError) {
        setError(registerError);
        setLoading(false);
        return;
      }

      // 3. Iniciar sesión tras registro exitoso
      const result = await establishSession({
        email: form.email,
        password: form.password,
      });
      setLoading(false);

      if (!result.ok) {
        setSuccess(true);
        return;
      }

      window.location.href = result.redirectTo;
    } catch (err: any) {
      setError(err.message || "Error al completar el registro.");
      setLoading(false);
    }
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }


  if (success) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">
          <FiCheck size={22} />
        </div>
        <h3 style={{ margin: "0 0 8px", color: "var(--auth-text)", fontSize: "18px" }}>
          ¡Tienda registrada!
        </h3>
        <p>Tu tienda fue registrada correctamente. Ya puedes iniciar sesión.</p>
        <a href="/login" className="auth-button">Iniciar sesión</a>
      </div>
    );
  }

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="b2b-wizard">
      <div className="b2b-progress">
        <div className="b2b-progress-track">
          <div
            className="b2b-progress-fill"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="b2b-progress-steps">
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={`b2b-progress-dot ${idx === currentStep ? "active" : ""} ${idx < currentStep ? "completed" : ""}`}
              onClick={() => idx < currentStep && goToStep(idx)}
              disabled={idx > currentStep}
            >
              {idx < currentStep ? <FiCheck size={12} /> : idx + 1}
            </button>
          ))}
        </div>
      </div>

      <div
        key={currentStep}
        className={`b2b-step-content ${animationDirection === "forward" ? "slide-forward" : "slide-backward"}`}
      >
        <div className="b2b-step-header">
          <div className="b2b-step-icon">{step.icon}</div>
          <h2 className="b2b-step-title">{step.title}</h2>
          <p className="b2b-step-subtitle">{step.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* PASO 1: Datos de la tienda + Logo */}
          {currentStep === 0 && (
            <>
              <div className="auth-field">
                <label htmlFor="store_name" className="auth-label">
                  Nombre de la tienda <span className="b2b-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <FiShoppingBag size={15} />
                  </span>
                  <input
                    id="store_name"
                    type="text"
                    required
                    className={`auth-input has-icon ${fieldErrors.store_name ? "b2b-input-error" : ""}`}
                    placeholder="Ej: Café Central"
                    value={form.store_name}
                    onChange={(e) => updateField("store_name", e.target.value)}
                  />
                </div>
                {fieldErrors.store_name && (
                  <p className="b2b-field-error">{fieldErrors.store_name}</p>
                )}
              </div>

              <p className="text-sm text-market-muted">Comercio de tecnología</p>

              {/* Selector de Logo de la tienda */}
              <div className="auth-field">
                <label className="auth-label">Logo de tu tienda (Opcional)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-[rgba(113,177,220,0.25)] hover:border-theme-primary bg-[rgba(15,39,66,0.35)] cursor-pointer transition-all"
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-12 h-12 object-contain rounded-lg border border-[rgba(113,177,220,0.4)]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[rgba(24,194,232,0.1)] text-theme-primary flex items-center justify-center">
                      <FiImage size={20} />
                    </div>
                  )}
                  <div className="text-left flex-1">
                    <p className="text-xs font-semibold text-[var(--auth-text)] m-0">
                      {logoPreview ? "Cambiar logotipo" : "Subir imagen o logotipo"}
                    </p>
                    <p className="text-[10px] text-[var(--auth-muted)] m-0 mt-0.5">
                      Recomendado: PNG o JPG cuadrado (máx 5MB)
                    </p>
                  </div>
                  <FiUploadCloud size={16} className="text-theme-primary mr-1" />
                </div>
              </div>
            </>
          )}

          {/* PASO 2: Ubicación */}
          {currentStep === 1 && (
            <>
              <p className="text-sm text-market-muted">Ubicación comercial: Sucre, Chuquisaca</p>

              <div className="auth-field">
                <label htmlFor="local_address" className="auth-label">
                  Dirección <span style={{ color: "#637e92" }}>(opcional)</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <FiMapPin size={15} />
                  </span>
                  <input
                    id="local_address"
                    type="text"
                    className="auth-input has-icon"
                    placeholder="Calle, número, zona"
                    value={form.local_address}
                    onChange={(e) => updateField("local_address", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* PASO 3: Credenciales */}
          {currentStep === 2 && (
            <>
              <div className="auth-field">
                <label htmlFor="email" className="auth-label">
                  Correo electrónico <span className="b2b-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <FiMail size={15} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={`auth-input has-icon ${fieldErrors.email ? "b2b-input-error" : ""}`}
                    placeholder="correo@ejemplo.com"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="b2b-field-error">{fieldErrors.email}</p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="password" className="auth-label">
                  Contraseña <span className="b2b-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <FiLock size={15} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`auth-input has-icon has-action ${fieldErrors.password ? "b2b-input-error" : ""}`}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-input-action"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="b2b-field-error">{fieldErrors.password}</p>
                ) : (
                  <p className="auth-help">Mínimo 6 caracteres</p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="confirmPassword" className="auth-label">
                  Confirmar contraseña <span className="b2b-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <FiLock size={15} />
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`auth-input has-icon has-action ${fieldErrors.confirmPassword ? "b2b-input-error" : ""}`}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-input-action"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="b2b-field-error">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          {error && <div role="alert" className="auth-error">{error}</div>}

          <div className="b2b-nav-buttons">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="b2b-btn b2b-btn-secondary"
                disabled={loading}
              >
                <FiArrowLeft size={15} />
                Atrás
              </button>
            )}

            {isLastStep ? (
              <button
                type="submit"
                disabled={loading || uploadingLogo}
                className="b2b-btn b2b-btn-primary"
                style={{ flex: 1 }}
              >
                {loading || uploadingLogo ? (
                  <>
                    <span className="b2b-spinner" />
                    Registrando tienda…
                  </>
                ) : (
                  <>
                    Registrar tienda
                    <FiCheck size={15} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="b2b-btn b2b-btn-primary"
                style={{ flex: 1 }}
              >
                Continuar
                <FiArrowRight size={15} />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="b2b-links">
        <p className="auth-register">
          ¿Eres comprador? <a className="inline-block px-1 py-2 text-sm" href="/registro">Regístrate aquí</a>
        </p>
        <p className="auth-register" style={{ marginTop: "-5px" }}>
          ¿Ya tienes una cuenta? <a className="inline-block px-1 py-2 text-sm" href="/login">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}
