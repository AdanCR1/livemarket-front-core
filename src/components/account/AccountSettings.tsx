import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  FiUser,
  FiShield,
  FiCreditCard,
  FiLock,
  FiUploadCloud,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiRefreshCw,
  FiShoppingBag,
  FiLogOut,
  FiArrowRight,
  FiCheck
} from 'react-icons/fi';

type Profile = {
  id: string | null;
  role: 'B2B' | 'B2C';
  email: string | null;
  store_id: string | null;
  business_model: string | null;
  display_name?: string | null;
  refund_qr_url?: string | null;
};

type Account = {
  id: string;
  account_holder: string;
  account_number: string;
  currency: string;
  is_active: boolean;
};

type QrInfo = {
  account: Account | null;
  qr_payload: string | null;
  updated_at?: string | null;
};

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  const obj = await r.json();
  if (!r.ok || !obj.success) {
    throw new Error(typeof obj.error === 'string' ? obj.error : 'Error de consulta');
  }
  return obj.data as T;
}

async function qrFromImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Imagen demasiado grande (máximo 5 MB)');
  const { default: jsQR } = await import('jsqr');
  const bitmap = await createImageBitmap(file);
  try {
    const max = 1400;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas no disponible');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const parsed = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
    if (!parsed) throw new Error('La imagen no contiene un código QR bancario válido');
    return parsed.data;
  } finally {
    bitmap.close();
  }
}

export function AccountSettings({ variant = 'customer' }: { variant?: 'customer' | 'merchant' }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [info, setInfo] = useState<QrInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedQrImage, setSavedQrImage] = useState('');

  // Control del Modal de Seguridad
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'unlock' | 'upload' | 'confirm'>('unlock');
  const [password, setPassword] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Archivo y datos del QR
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [payload, setPayload] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [previewQr, setPreviewQr] = useState('');

  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, q] = await Promise.all([
          getJson<Profile>('/api/profile/me'),
          getJson<QrInfo>('/api/profile/receiving-qr')
        ]);
        if (cancelled) return;
        setProfile(p);
        setInfo(q);

        // Si ya tiene QR guardado
        const initialQr = q.qr_payload || p.refund_qr_url;
        if (initialQr) {
          if (initialQr.startsWith('http')) {
            setSavedQrImage(initialQr);
          } else {
            QRCode.toDataURL(initialQr, { width: 220, margin: 2 }).then(url => {
              if (!cancelled) setSavedQrImage(url);
            }).catch(() => { });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setNotification({
            type: 'error',
            text: e instanceof Error ? e.message : 'No se pudo cargar la información de tu perfil'
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function openSecurityModal() {
    setVerificationEmail(profile?.email?.trim() || '');
    setPassword('');
    setConfirmPassword('');
    setQrFile(null);
    setPayload('');
    setUploadedUrl('');
    setPreviewQr('');
    setModalError('');
    setModalStep('unlock');
    setIsModalOpen(true);
  }

  // Paso 1: Validar identidad contra el backend
  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password.length < 1) {
      setModalError('Introduce tu contraseña actual.');
      return;
    }

    setBusy(true);
    setModalError('');

    try {
      const res = await fetch('/api/profile/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', // Asegura el envío de la cookie mc_session
        body: JSON.stringify({
          password,
          email: verificationEmail.trim().toLowerCase() // MS1 no incluye email en el JWT
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Contraseña incorrecta.');
      }
      setModalStep('upload');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Contraseña incorrecta');
    } finally {
      setBusy(false);
    }
  }

  // Paso 2: Procesar QR y subir a MS3
  async function handleFileSelected(file: File) {
    setBusy(true);
    setModalError('');
    try {
      // Validar legibilidad
      const decoded = await qrFromImage(file);
      setPayload(decoded);
      setQrFile(file);

      // Generar preview local
      const preview = await QRCode.toDataURL(decoded, { width: 200, margin: 2 });
      setPreviewQr(preview);

      // Subir archivo binario a MS3
      const formData = new FormData();
      formData.append('file', file);

      // Astro extrae el JWT de la cookie httpOnly y lo reenvía a MS3.
      // El navegador nunca necesita acceder directamente al token.
      const ms3Res = await fetch('/api/profile/upload-payout-qr', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });

      const ms3Data = await ms3Res.json().catch(() => ({}));
      if (!ms3Res.ok || !ms3Data.success) {
        throw new Error(ms3Data.error || 'No se pudo subir la imagen a MS3');
      }

      if (typeof ms3Data.data?.url !== 'string') throw new Error('MS3 no devolvió la URL del QR');
      setUploadedUrl(ms3Data.data.url);
      setModalStep('confirm');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error al procesar el archivo');
    } finally {
      setBusy(false);
    }
  }

  // Paso 3: Confirmación final con segunda solicitud de clave
  async function handleConfirmUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmPassword.trim()) {
      setModalError('Debes ingresar tu contraseña para confirmar el cambio.');
      return;
    }

    setBusy(true);
    setModalError('');

    try {
      const res = await fetch('/api/profile/receiving-qr', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verificationEmail.trim().toLowerCase(),
          password: confirmPassword,
          qr_payload: payload.trim(),
          refund_qr_url: uploadedUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Error al actualizar el QR');
      }

      setInfo(prev => prev ? { ...prev, qr_payload: payload.trim() } : prev);
      setSavedQrImage(previewQr || uploadedUrl);
      setIsModalOpen(false);
      setNotification({
        type: 'success',
        text: 'Tu QR de recepción bancaria se actualizó y vinculó con éxito.',
      });
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error en la confirmación');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-28 rounded-2xl bg-white/5 border border-market-border/40" />
        <div className="h-64 rounded-2xl bg-white/5 border border-market-border/40" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-market-white animate-fade-in">
      {/* Alertas */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${notification.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
            : 'bg-red-950/80 border-red-500/40 text-red-200'
          }`}>
          <div className="flex items-center gap-2.5 text-sm">
            {notification.type === 'success' ? <FiCheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> : <FiAlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
            <span>{notification.text}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Identidad de Usuario */}
      <div className="rounded-2xl border border-market-border/60 bg-market-card/80 backdrop-blur-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-theme-primary to-theme-accent flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-theme-primary/10">
            {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : <FiUser className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {profile?.display_name || profile?.email?.split('@')[0] || 'Mi Perfil'}
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <FiShield className="w-3 h-3" /> Verificado
              </span>
            </h1>
            <p className="text-xs text-market-muted mt-0.5">{profile?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-market-border/40">
          <a
            href="/mis-pedidos"
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-market-border/80 hover:bg-white/5 transition-colors flex items-center gap-1.5 text-market-white"
          >
            <FiShoppingBag className="w-4 h-4" /> Mis Pedidos
          </a>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' });
              window.location.assign('/login');
            }}
            className="p-2 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <FiLogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cuenta y QR Bancario */}
      <div className="rounded-2xl border border-market-border/60 bg-market-card/80 backdrop-blur-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-market-border/50 pb-5">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-white">
              <FiCreditCard className="w-5 h-5 text-theme-primary" />
              Cuenta Bancaria y QR de Reembolso
            </h2>
            <p className="text-xs text-market-muted mt-0.5">
              Utilizado para devoluciones automáticas en caso de disputas resueltas a tu favor.
            </p>
          </div>

          <button
            type="button"
            onClick={openSecurityModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-theme-primary to-theme-accent text-white text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <FiLock className="w-3.5 h-3.5" />
            {info?.account || savedQrImage ? 'Actualizar Cuenta / QR' : 'Vincular Cuenta Bancaria'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Tarjeta Visual */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-black border border-white/10 shadow-xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-theme-primary">Solari Móvil</span>
                <p className="text-xs text-white/50">Sistema de Pagos y Custodia Segura</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${info?.account?.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}> {info?.account?.is_active ? 'Activa' : 'Sin Vincular'} </span> </div>  <div> <span className="text-[10px] uppercase text-white/40 block mb-0.5">Número de cuenta</span> <p className="text-base sm:text-lg font-mono font-bold tracking-widest text-white"> {info?.account?.account_number ? `**** **** ${info.account.account_number.slice(-4)}` : '•••• •••• •••• ••••'}
              </p>
            </div>

            <div className="flex justify-between items-end text-xs">
              <div>
                <span className="text-[10px] uppercase text-white/40 block">Titular</span>
                <span className="font-semibold text-white/90">
                  {info?.account?.account_holder || profile?.display_name || 'No registrado'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-white/40 block">Moneda</span>
                <span className="font-semibold text-white/90">{info?.account?.currency || 'BOB (Bs)'}</span>
              </div>
            </div>
          </div>

          {/* QR Activo */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-black/40 border border-market-border/40 text-center">
            {savedQrImage ? (
              <>
                <div className="p-2.5 bg-white rounded-xl shadow-md mb-3">
                  <img src={savedQrImage} alt="QR bancario activo" className="w-36 h-36 object-contain" />
                </div>
                <span className="text-[11px] font-semibold text-market-white">QR Verificado</span>
                <span className="text-[10px] text-market-muted">Destino para desembolsos</span>
              </>
            ) : (
              <div className="py-8 space-y-2">
                <FiCreditCard className="w-10 h-10 text-market-muted/40 mx-auto" />
                <p className="text-xs text-market-muted">No has configurado tu código QR de reembolso.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Seguro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-market-card border border-market-border/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-market-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-market-border/40 pb-4">
              <div className="w-10 h-10 rounded-xl bg-theme-primary/15 border border-theme-primary/30 text-theme-primary flex items-center justify-center shrink-0">
                <FiLock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Seguridad Bancaria</h3>
                <p className="text-xs text-market-muted">
                  {modalStep === 'unlock' && 'Paso 1: Identificación con contraseña'}
                  {modalStep === 'upload' && 'Paso 2: Subir imagen del QR'}
                  {modalStep === 'confirm' && 'Paso 3: Confirmación y firma de cambios'}
                </p>
              </div>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* PASO 1: Desbloquear con contraseña */}
            {modalStep === 'unlock' && (
              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-market-muted mb-1.5">Correo de tu cuenta MarketCloud</label>
                  <input type="email" autoComplete="username" required value={verificationEmail}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    placeholder="tu-correo@ejemplo.com"
                    className="w-full rounded-xl border border-market-border bg-black/30 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-theme-primary" />
                  <p className="text-[11px] text-market-muted mt-1">Usa el mismo correo con el que inicias sesión. Se verifica que pertenezca a tu usuario actual.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-market-muted mb-1.5">
                    Ingresa tu contraseña actual
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-market-border bg-black/30 px-3.5 py-2.5 text-xs text-white placeholder:text-market-muted/40 focus:outline-none focus:border-theme-primary"
                  />
                  <p className="text-[11px] text-market-muted mt-1.5 leading-relaxed">
                    Para proteger los fondos de tu cuenta, debes verificar tu clave antes de modificar los datos de cobro.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-market-border text-market-muted hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {busy ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Desbloquear</span>}
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* PASO 2: Subida y parseo de QR */}
            {modalStep === 'upload' && (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-market-border/60 rounded-2xl bg-black/20 hover:border-theme-primary/60 hover:bg-black/30 transition-all cursor-pointer">
                  <FiUploadCloud className="w-8 h-8 text-theme-primary mb-2" />
                  <span className="text-xs font-semibold text-white">Selecciona tu imagen QR</span>
                  <span className="text-[10px] text-market-muted mt-0.5">JPG, PNG o WebP (Máx. 5 MB)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                  />
                </label>

                {busy && (
                  <p className="text-xs text-center text-market-muted flex items-center justify-center gap-2">
                    <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando QR y subiendo a R2...
                  </p>
                )}

                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setModalStep('unlock')}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-market-border text-market-muted hover:text-white"
                  >
                    Atrás
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: Reconfirmar con contraseña para aplicar el cambio */}
            {modalStep === 'confirm' && (
              <form onSubmit={handleConfirmUpdate} className="space-y-4">
                <div className="p-3 rounded-xl bg-black/40 border border-market-border/40 flex items-center gap-3">
                  <img src={previewQr} alt="Vista previa QR" className="w-16 h-16 bg-white p-1 rounded-lg shrink-0 object-contain" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <FiCheckCircle className="w-3.5 h-3.5" /> Imagen validada y cargada
                    </span>
                    <p className="text-[10px] text-market-muted font-mono truncate mt-0.5">{payload}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-market-muted mb-1.5">
                    Reingresa tu contraseña para confirmar
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-market-border bg-black/30 px-3.5 py-2.5 text-xs text-white placeholder:text-market-muted/40 focus:outline-none focus:border-theme-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-market-border/40">
                  <button
                    type="button"
                    onClick={() => setModalStep('upload')}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-market-border text-market-muted hover:text-white"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {busy ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FiCheck className="w-3.5 h-3.5" />}
                    <span>Confirmar y Guardar</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}