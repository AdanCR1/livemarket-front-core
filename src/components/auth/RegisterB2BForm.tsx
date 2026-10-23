import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
  FiMapPin,
  FiShoppingBag,
  FiChevronDown,
  FiCheck,
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiUploadCloud,
  FiImage,
} from "react-icons/fi";
import { AuthService } from "../../lib/types/services";
import { establishSession } from "../../components/auth/establishSession";
import { MOCK_DEPARTMENTS, MOCK_CITIES } from "../../lib/mock-data";
import { MS3_URL } from "../../lib/constants";
import type { RegisterB2BPayload, NicheSlug } from "../../lib/types/types";

const NICHE_LABELS: Record<NicheSlug, string> = {
  gastronomia: "Gastronomía",
  tecnologia: "Tecnología",
  moda: "Moda",
  servicios: "Servicios",
};

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  store_name: string;
  business_model: NicheSlug;
  department_id: string;
  city_id: string;
  local_address: string;
  logo_url: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const STEPS = [
  {
    id: 1,
    title: "Datos de tu tienda",
    subtitle: "Contanos sobre tu negocio",
    icon: <FiShoppingBag size={20} />,
    fields: ["store_name", "business_model"],
  },
  {
    id: 2,
    title: "Ubicación",
    subtitle: "¿Dónde está tu tienda?",
    icon: <FiMapPin size={20} />,
    fields: ["department_id", "city_id", "local_address"],
  },
  {
    id: 3,
    title: "Tu cuenta",
    subtitle: "Creá tus credenciales de acceso",
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
    business_model: "gastronomia",
    department_id: "",
    city_id: "",
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

  const filteredCities = form.department_id
    ? MOCK_CITIES.filter((c) => c.department_id === Number(form.department_id))
    : [];

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

    if (stepFields.includes("department_id") && !form.department_id) {
      errors.department_id = "Seleccioná un departamento";
    }

    if (stepFields.includes("city_id") && !form.city_id) {
      errors.city_id = "Seleccioná una ciudad";
    }

    if (stepFields.includes("email")) {
      if (!form.email.trim()) {
        errors.email = "El correo es requerido";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = "Ingresá un correo válido";
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
        errors.confirmPassword = "Confirmá tu contraseña";
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

    const cityId = Number(form.city_id);
    if (!Number.isInteger(cityId) || cityId < 1) {
      setError("Seleccioná una ciudad válida.");
      return;
    }

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
        business_model: form.business_model,
        city_id: cityId,
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
      const { data: session } = await AuthService.login({
        email: form.email,
        password: form.password,
      });

      if (!session) {
        setSuccess(true);
        setLoading(false);
        return;
      }

      const result = await establishSession(session);
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

  function handleDepartmentChange(value: string) {
    setForm((prev) => ({ ...prev, department_id: value, city_id: "" }));
    if (fieldErrors.department_id) {
      setFieldErrors((prev) => ({ ...prev, department_id: undefined }));
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
        <p>Tu tienda fue registrada correctamente. Ya podés iniciar sesión.</p>
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

              <div className="auth-field">
                <label htmlFor="business_model" className="auth-label">
                  Rubro <span className="b2b-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <select
                    id="business_model"
                    required
                    className="auth-input"
                    style={{ appearance: "none", cursor: "pointer" }}
                    value={form.business_model}
                    onChange={(e) => updateField("business_model", e.target.value as NicheSlug)}
                  >
                    {Object.entries(NICHE_LABELS).map(([slug, label]) => (
                      <option key={slug} value={slug}>{label}</option>
                    ))}
                  </select>
                  <FiChevronDown
                    size={15}
                    style={{
                      position: "absolute",
                      right: "13px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#7893aa",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

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
                      className="w-12 h-12 object-cover rounded-lg border border-[rgba(113,177,220,0.4)]"
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
              <div className="auth-field">
                <label htmlFor="department_id" className="auth-label">
                  Departamento <span className="b2b-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <select
                    id="department_id"
                    required
                    className={`auth-input ${fieldErrors.department_id ? "b2b-input-error" : ""}`}
                    style={{ appearance: "none", cursor: "pointer" }}
                    value={form.department_id}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                  >
                    <option value="">Seleccioná un departamento</option>
                    {MOCK_DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <FiChevronDown
                    size={15}
                    style={{
                      position: "absolute",
                      right: "13px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#7893aa",
                      pointerEvents: "none",
                    }}
                  />
                </div>
                {fieldErrors.department_id && (
                  <p className="b2b-field-error">{fieldErrors.department_id}</p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="city_id" className="auth-label">
                  Ciudad <span className="b2b-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <select
                    id="city_id"
                    required
                    disabled={!form.department_id}
                    className={`auth-input ${fieldErrors.city_id ? "b2b-input-error" : ""}`}
                    style={{
                      appearance: "none",
                      cursor: form.department_id ? "pointer" : "not-allowed",
                      opacity: form.department_id ? 1 : 0.5,
                    }}
                    value={form.city_id}
                    onChange={(e) => updateField("city_id", e.target.value)}
                  >
                    <option value="">
                      {!form.department_id ? "Primero seleccioná un departamento" : "Seleccioná una ciudad"}
                    </option>
                    {filteredCities.map((city) => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                  <FiChevronDown
                    size={15}
                    style={{
                      position: "absolute",
                      right: "13px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#7893aa",
                      pointerEvents: "none",
                    }}
                  />
                </div>
                {fieldErrors.city_id && (
                  <p className="b2b-field-error">{fieldErrors.city_id}</p>
                )}
              </div>

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
          ¿Sos comprador? <a href="/registro">Registrate acá</a>
        </p>
        <p className="auth-register" style={{ marginTop: "-5px" }}>
          ¿Ya tenés cuenta? <a href="/login">Iniciá sesión</a>
        </p>
      </div>
    </div>
  );
}