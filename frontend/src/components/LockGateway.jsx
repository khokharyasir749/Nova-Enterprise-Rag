import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerCompany, verifyCompanyAccess } from '../services/api';
import {
  Lock,
  KeyRound,
  Building2,
  PlusCircle,
  LogIn,
  ArrowRight,
  Shield,
  ShieldAlert,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Users,
  Briefcase,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';

export default function LockGateway() {
  const {
    loginWorkspace,
    registeredCompanies,
    loadingCompanies,
    loadCompanies,
    addToast
  } = useAuth();

  const [activeMode, setActiveMode] = useState('enter'); // 'enter' | 'register'
  
  // Enter Workspace State
  const [selectedTenant, setSelectedTenant] = useState(
    registeredCompanies.length > 0 ? registeredCompanies[0].tenant_id : ''
  );
  const [verifyAccessCode, setVerifyAccessCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Register Company State (Tiered Passkeys & Custom Logo)
  const [regName, setRegName] = useState('');
  const [regLogoUrl, setRegLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [hrKey, setHrKey] = useState('');
  const [employeeKey, setEmployeeKey] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setRegError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        setRegLogoUrl(dataUrl);
        setLogoPreview(dataUrl);
        setRegError('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Auto-switch to 'register' tab if no companies exist yet
  React.useEffect(() => {
    if (!loadingCompanies && registeredCompanies.length === 0) {
      setActiveMode('register');
    }
  }, [loadingCompanies, registeredCompanies.length]);

  // Keep selectedTenant in sync if companies list loads
  React.useEffect(() => {
    if (!selectedTenant && registeredCompanies.length > 0) {
      setSelectedTenant(registeredCompanies[0].tenant_id);
    }
  }, [registeredCompanies, selectedTenant]);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyError('');

    if (!selectedTenant) {
      setVerifyError('Please select a company workspace or register a new one.');
      return;
    }
    if (!verifyAccessCode.trim()) {
      setVerifyError('Please enter your role access passkey.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyCompanyAccess({
        tenant_id: selectedTenant,
        access_code: verifyAccessCode.trim(),
      });
      // Lock session to the role and logo verified by backend
      loginWorkspace(res.tenant_id, res.name, res.role, res.logo_url);
    } catch (err) {
      setVerifyError(err.message || 'Access Denied: Invalid passkey or company workspace.');
      addToast('Verification failed: Invalid access passkey.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const autoGenerateKeys = () => {
    const slug = regName.trim()
      ? regName.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)
      : 'corp';
    const rand = Math.floor(100 + Math.random() * 900);
    setAdminKey(`${slug}-admin-${rand}`);
    setHrKey(`${slug}-hr-${rand}`);
    setEmployeeKey(`${slug}-emp-${rand}`);
    addToast('Generated unique tiered passkeys for all 3 roles', 'info');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');

    const cleanName = regName.trim();
    const cleanAdmin = adminKey.trim();
    const cleanHr = hrKey.trim();
    const cleanEmp = employeeKey.trim();

    if (!cleanName) {
      setRegError('Please provide a company name.');
      return;
    }
    if (!cleanAdmin || !cleanHr || !cleanEmp) {
      setRegError('All 3 role passkeys (Admin, HR, and Employee) are required.');
      return;
    }
    if (new Set([cleanAdmin, cleanHr, cleanEmp]).size < 3) {
      setRegError('Admin, HR, and Employee passkeys must all be distinct for secure role separation.');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await registerCompany({
        name: cleanName,
        admin_key: cleanAdmin,
        hr_key: cleanHr,
        employee_key: cleanEmp,
        logo_url: regLogoUrl.trim() || undefined,
      });
      await loadCompanies();
      addToast(`Company '${res.data.name}' registered successfully! Unlocked with ADMIN role.`, 'success');
      // Unlock with ADMIN role by default for the creator
      loginWorkspace(res.data.tenant_id, res.data.name, 'admin', res.data.logo_url);
    } catch (err) {
      setRegError(err.message || 'Failed to register company.');
      addToast(err.message || 'Registration error', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-lg bg-[#09090b]/98 border border-zinc-800 rounded-2xl shadow-[0_0_60px_rgba(185,28,28,0.15)] overflow-hidden animate-fade-in my-8">
        
        {/* Gateway Header */}
        <div className="p-6 text-center border-b border-zinc-800 bg-black/40">
          <div className="inline-flex p-3 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-400 shadow-inner mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Tenant Workspace Gateway
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Role-gated security barrier. Your active role is locked strictly by your role-specific passkey.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-2 border-b border-zinc-800 bg-black/20">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/60 border border-zinc-800">
            <button
              onClick={() => {
                setActiveMode('enter');
                setVerifyError('');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeMode === 'enter'
                  ? 'bg-red-950/70 text-white shadow-sm border border-red-800/60'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Enter Workspace</span>
            </button>
            <button
              onClick={() => {
                setActiveMode('register');
                setRegError('');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all relative cursor-pointer ${
                activeMode === 'register'
                  ? 'bg-red-950/70 text-white shadow-sm border border-red-800/60'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Company</span>
              {registeredCompanies.length === 0 && !loadingCompanies && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Register your first company" />
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Enter Workspace Form */}
        {activeMode === 'enter' && (
          loadingCompanies ? (
            <div className="p-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-red-400" />
              <span>Loading registered companies...</span>
            </div>
          ) : registeredCompanies.length === 0 ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                <Building2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">No Companies Registered Yet</h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  There are currently no tenant workspaces. Please register your company first to configure tiered role passkeys.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('register');
                  setRegError('');
                }}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-semibold text-xs transition-all shadow-lg shadow-red-950/40 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Company Now</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifySubmit} className="p-6 space-y-4">
              {verifyError && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-950/30 border border-red-800/40 text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{verifyError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-red-400" />
                  Select Company Workspace
                </label>
                <select
                  value={selectedTenant}
                  onChange={(e) => {
                    setSelectedTenant(e.target.value);
                    setVerifyError('');
                  }}
                  className="w-full bg-black/60 border border-zinc-800 focus:border-red-500 text-xs sm:text-sm text-zinc-100 rounded-xl px-3.5 py-2.5 outline-none cursor-pointer font-sans"
                >
                  {registeredCompanies.map((c) => (
                    <option key={c.tenant_id} value={c.tenant_id} className="bg-[#09090b] text-zinc-100">
                      {c.name} ({c.tenant_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-red-400" />
                  Role Access Key (Passkey)
                </label>
                <input
                  type="password"
                  placeholder="Enter your Admin, HR, or Employee passkey..."
                  value={verifyAccessCode}
                  onChange={(e) => {
                    setVerifyAccessCode(e.target.value);
                    setVerifyError('');
                  }}
                  className="w-full bg-black/60 border border-zinc-800 focus:border-red-500 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 rounded-xl px-3.5 py-2.5 outline-none font-mono tracking-wider transition-colors"
                  autoFocus
                />
                <div className="mt-2 p-3 rounded-xl bg-black/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                    <span>Tiered Role Lock:</span>
                  </div>
                  <p>
                    Entering an <strong>Admin Key</strong> unlocks full admin controls. An <strong>HR Key</strong> restricts access to HR files. An <strong>Employee Key</strong> grants standard handbook access.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying || !verifyAccessCode.trim()}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/40 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Passkey & Locking Role...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )
        )}

        {/* Tab 2: Register Company Form with Tiered Passkeys */}
        {activeMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
            {regError && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-950/30 border border-red-800/40 text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{regError}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-red-400" />
                  Company / Organization Name
                </label>
                <button
                  type="button"
                  onClick={autoGenerateKeys}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-300 transition-colors cursor-pointer"
                  title="Auto-fill example distinct passkeys"
                >
                  <Sparkles className="w-3 h-3 text-red-400" />
                  <span>Auto-fill Keys</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. Lonetex Textile Exports"
                value={regName}
                onChange={(e) => {
                  setRegName(e.target.value);
                  setRegError('');
                }}
                className="w-full bg-black/60 border border-zinc-800 focus:border-red-500 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Optional Company Logo Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-red-400" />
                  Company Logo (Optional)
                </label>
                <label className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Paste image URL (https://...) or upload an image file"
                  value={regLogoUrl.startsWith('data:') ? 'Custom Image Attached (Base64)' : regLogoUrl}
                  onChange={(e) => {
                    setRegLogoUrl(e.target.value);
                    setLogoPreview(e.target.value);
                    setRegError('');
                  }}
                  className="w-full bg-black/60 border border-zinc-800 focus:border-red-500 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 rounded-xl px-3.5 py-2.5 outline-none transition-colors"
                />

                {logoPreview && (
                  <div className="flex items-center gap-3 p-2 bg-black/60 border border-zinc-800 rounded-xl">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-8 h-8 rounded-lg object-contain border border-zinc-700 p-0.5 bg-black/40 shrink-0"
                      onError={() => setLogoPreview('')}
                    />
                    <div className="overflow-hidden min-w-0 flex-1">
                      <p className="text-[11px] text-zinc-200 font-medium truncate">
                        {regLogoUrl.startsWith('data:') ? 'Image File Attached' : regLogoUrl}
                      </p>
                      <p className="text-[10px] text-emerald-400">Ready for workspace</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRegLogoUrl('');
                        setLogoPreview('');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3 Tiered Passkey Inputs */}
            <div className="space-y-3 pt-1 border-t border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Define 3 Distinct Role Passkeys
              </span>

              {/* Admin Key */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                    Admin Passkey
                  </span>
                  <span className="text-[10px] font-mono text-red-300 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/60">
                    Full Admin Access
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. admin-secret-key-99"
                  value={adminKey}
                  onChange={(e) => {
                    setAdminKey(e.target.value);
                    setRegError('');
                  }}
                  className="w-full bg-black/60 border border-zinc-800 focus:border-red-500 text-xs sm:text-sm text-red-200 placeholder:text-zinc-600 rounded-xl px-3.5 py-2 outline-none font-mono tracking-wider transition-colors"
                />
              </div>

              {/* HR Key */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-rose-400" />
                    HR Passkey
                  </span>
                  <span className="text-[10px] font-mono text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60">
                    HR & Personnel Access
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. hr-staff-key-88"
                  value={hrKey}
                  onChange={(e) => {
                    setHrKey(e.target.value);
                    setRegError('');
                  }}
                  className="w-full bg-black/60 border border-zinc-800 focus:border-rose-500 text-xs sm:text-sm text-rose-200 placeholder:text-zinc-600 rounded-xl px-3.5 py-2 outline-none font-mono tracking-wider transition-colors"
                />
              </div>

              {/* Employee Key */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    Employee Passkey
                  </span>
                  <span className="text-[10px] font-mono text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700">
                    General Employee Access
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. employee-key-77"
                  value={employeeKey}
                  onChange={(e) => {
                    setEmployeeKey(e.target.value);
                    setRegError('');
                  }}
                  className="w-full bg-black/60 border border-zinc-800 focus:border-zinc-500 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 rounded-xl px-3.5 py-2 outline-none font-mono tracking-wider transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isRegistering || !regName.trim() || !adminKey.trim() || !hrKey.trim() || !employeeKey.trim()}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/40 cursor-pointer"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Registering Tiered Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace & Lock Keys</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
