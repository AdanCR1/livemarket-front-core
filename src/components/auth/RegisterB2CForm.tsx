import { useState, type FormEvent } from "react";
import {
    FiEye,
    FiEyeOff,
    FiMail,
    FiLock,
    FiUser,
} from "react-icons/fi";
import { AuthService } from "../../lib/types/services";
import { establishSession } from "../../components/auth/establishSession";
import type { RegisterB2CPayload } from "../../lib/types/types";

export default function RegisterB2CForm() {
    const [form, setForm] = useState<RegisterB2CPayload>({
        email: "",
        password: "",
        display_name: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error: registerError } = await AuthService.registerB2C({
            ...form,
            display_name: form.display_name?.trim() || undefined,
        });

        if (registerError) {
            setError(registerError);
            setLoading(false);
            return;
        }

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
    }

    if (success) {
        return (
            <div className="auth-success">
                <div className="auth-success-icon">
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                </div>

                <p>
                    Tu cuenta fue creada correctamente.
                </p>

                <a href="/login" className="auth-button">
                    Iniciar sesión
                </a>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
                <label
                    htmlFor="display_name"
                    className="auth-label"
                >
                    Nombre
                </label>

                <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                        <FiUser size={15} />
                    </span>

                    <input
                        id="display_name"
                        type="text"
                        className="auth-input has-icon"
                        placeholder="Tu nombre"
                        value={form.display_name}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                display_name: e.target.value,
                            })
                        }
                    />
                </div>
            </div>

            <div className="auth-field">
                <label htmlFor="email" className="auth-label">
                    Correo electrónico
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
                        className="auth-input has-icon"
                        placeholder="correo@ejemplo.com"
                        value={form.email}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                email: e.target.value,
                            })
                        }
                    />
                </div>
            </div>

            <div className="auth-field">
                <label htmlFor="password" className="auth-label">
                    Contraseña
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
                        className="auth-input has-icon has-action"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                password: e.target.value,
                            })
                        }
                    />

                    <button
                        type="button"
                        className="auth-input-action"
                        onClick={() =>
                            setShowPassword(!showPassword)
                        }
                        aria-label={
                            showPassword
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                        }
                    >
                        {showPassword ? (
                            <FiEyeOff size={15} />
                        ) : (
                            <FiEye size={15} />
                        )}
                    </button>
                </div>

                <p className="auth-help">
                    Mínimo 6 caracteres.
                </p>
            </div>

            {error && (
                <p role="alert" className="auth-error">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="auth-button"
            >
                {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>

            <p className="auth-register">
                ¿Ya tenés cuenta?{" "}
                <a href="/login">Iniciá sesión</a>
            </p>

            <p className="auth-register" style={{ marginTop: "-10px" }}>
                ¿Tenés una tienda?{" "}
                <a href="/registro/negocio">
                    Registrate como negocio
                </a>
            </p>
        </form>
    );
}