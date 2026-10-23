import { useState, type FormEvent } from "react";
import {
    FiEye,
    FiEyeOff,
    FiMail,
    FiLock,
    FiUserPlus,
} from "react-icons/fi";
import { AuthService } from "../../lib/types/services";
import { establishSession } from "../../components/auth/establishSession";
import type { LoginPayload } from "../../lib/types/types";

export default function LoginForm() {
    const [form, setForm] = useState<LoginPayload>({
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { data, error: loginError } = await AuthService.login(form);

        if (loginError || !data) {
            setError(loginError ?? "No se pudo iniciar sesión.");
            setLoading(false);
            return;
        }

        const result = await establishSession(data);
        setLoading(false);

        if (!result.ok) {
            setError(result.error);
            return;
        }

        window.location.href = result.redirectTo;
    }

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
                <label htmlFor="email" className="auth-label">
                    Correo electrónico
                </label>

                <div className="auth-input-wrapper">
                    <span className="auth-input-icon" aria-hidden="true">
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
                    <span className="auth-input-icon" aria-hidden="true">
                        <FiLock size={15} />
                    </span>

                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
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
                        onClick={() => setShowPassword(!showPassword)}
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

                <a href="/recuperar-password" className="auth-forgot">
                    ¿Olvidaste tu contraseña?
                </a>
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
                {loading ? "Ingresando…" : "Iniciar sesión"}
            </button>

            <div className="auth-divider">
                <span>o continúa con</span>
            </div>

            <div className="auth-socials">
                <button
                    type="button"
                    className="auth-social"
                    aria-label="Continuar con Google"
                    title="Google"
                >
                    <span
                        style={{
                            fontSize: "15px",
                            fontWeight: 700,
                        }}
                    >
                        G
                    </span>
                </button>

                <button
                    type="button"
                    className="auth-social"
                    aria-label="Continuar con TikTok"
                    title="TikTok"
                >
                    <FiUserPlus size={16} />
                </button>
            </div>

            <p className="auth-register">
                ¿No tenés cuenta?{" "}
                <a href="/registro">Registrate</a>
            </p>
        </form>
    );
}