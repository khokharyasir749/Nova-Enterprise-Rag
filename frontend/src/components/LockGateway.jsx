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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in my-8">
        
        {/* Gateway Header */}
        <div className="p-6 text-center border-b border-slate-800/80 bg-slate-950/60">
          <div className="inline-flex p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 text-slate-100 shadow-inner mb-3">
            <Lock className="w-6 h-6 text-slate-200" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Tenant Workspace Gateway
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Role-gated security barrier. Your active role is locked strictly by your role-specific passkey.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-2 border-b border-slate-800 bg-slate-950/30">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800/80">
            <button
              onClick={() => {
                setActiveMode('enter');
                setVerifyError('');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeMode === 'enter'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/70'
                  : 'text-slate-400 hover:text-slate-200'
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
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all relative ${
                activeMode === 'register'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/70'
                  : 'text-slate-400 hover:text-slate-200'
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
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span>Loading registered companies...</span>
            </div>
          ) : registeredCompanies.length === 0 ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
                <Building2 className="w-6 h-6 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">No Companies Registered Yet</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  There are currently no tenant workspaces. Please register your company first to configure tiered role passkeys.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('register');
                  setRegError('');
                }}
                className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs transition-all shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Company Now</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifySubmit} className="p-6 space-y-4">
              {verifyError && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{verifyError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Select Company Workspace
                </label>
                <select
                  value={selectedTenant}
                  onChange={(e) => {
                    setSelectedTenant(e.target.value);
                    setVerifyError('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs sm:text-sm text-slate-100 rounded-lg px-3.5 py-2.5 outline-none cursor-pointer font-sans"
                >
                  {registeredCompanies.map((c) => (
                    <option key={c.tenant_id} value={c.tenant_id} className="bg-slate-900 text-slate-100">
                      {c.name} ({c.tenant_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 rounded-lg px-3.5 py-2.5 outline-none font-mono tracking-wider transition-colors"
                  autoFocus
                />
                <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
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
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs sm:text-sm transition-all shadow-sm"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
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
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{regError}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Company / Organization Name
                </label>
                <button
                  type="button"
                  onClick={autoGenerateKeys}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                  title="Auto-fill example distinct passkeys"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 rounded-lg px-3.5 py-2.5 outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Optional Company Logo Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  Company Logo (Optional)
                </label>
                <label className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer">
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 rounded-lg px-3.5 py-2 outline-none transition-colors"
                />

                {logoPreview && (
                  <div className="flex items-center gap-3 p-2 bg-slate-950/80 border border-slate-800 rounded-lg">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-8 h-8 rounded-lg object-contain border border-white/10 p-0.5 bg-black/40 shrink-0"
                      onError={() => setLogoPreview('')}
                    />
                    <div className="overflow-hidden min-w-0 flex-1">
                      <p className="text-[11px] text-slate-200 font-medium truncate">
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
                      className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3 Tiered Passkey Inputs */}
            <div className="space-y-3 pt-1 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Define 3 Distinct Role Passkeys
              </span>

              {/* Admin Key */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    Admin Passkey
                  </span>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-600/60 text-xs sm:text-sm text-purple-200 placeholder:text-slate-600 rounded-lg px-3.5 py-2 outline-none font-mono tracking-wider transition-colors"
                />
              </div>

              {/* HR Key */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                    HR Passkey
                  </span>
                  <span className="text-[10px] font-mono text-sky-300 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/40">
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-600/60 text-xs sm:text-sm text-sky-200 placeholder:text-slate-600 rounded-lg px-3.5 py-2 outline-none font-mono tracking-wider transition-colors"
                />
              </div>

              {/* Employee Key */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Employee Passkey
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-600/60 text-xs sm:text-sm text-emerald-200 placeholder:text-slate-600 rounded-lg px-3.5 py-2 outline-none font-mono tracking-wider transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isRegistering || !regName.trim() || !adminKey.trim() || !hrKey.trim() || !employeeKey.trim()}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs sm:text-sm transition-all shadow-sm"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
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
