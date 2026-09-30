import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  User,
  Check,
  Edit3,
  RefreshCw,
  LogOut,
  ChevronDown,
  Sparkles,
  UploadCloud,
  FileText,
  Settings,
  X,
  Building2,
  Image as ImageIcon,
  Upload,
  Trash2,
} from 'lucide-react';

export default function Navbar({ activeView = 'overview', onSelectView }) {
  const {
    tenantId,
    companyName,
    tenantName,
    workspaceName,
    logoUrl,
    logoutWorkspace,
    updateWorkspaceSettings,
    activeRole,
    userId,
    setUserId,
    backendHealth,
    refreshHealth,
    addToast,
  } = useAuth();

  const displayBrand = companyName || tenantName || workspaceName || 'TenantRAG';

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [customUserVal, setCustomUserVal] = useState(userId);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Workspace Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [formCompanyName, setFormCompanyName] = useState(displayBrand);
  const [formLogoUrl, setFormLogoUrl] = useState(logoUrl || '');
  const [previewError, setPreviewError] = useState(false);

  const profileRef = useRef(null);
  const docsDropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLogoLoadError(false);
  }, [logoUrl]);

  // Synchronize form values whenever modal opens or external auth context changes
  const handleOpenSettings = () => {
    setFormCompanyName(companyName || tenantName || workspaceName || tenantId || '');
    setFormLogoUrl(logoUrl || '');
    setPreviewError(false);
    setIsProfileOpen(false);
    setIsSettingsOpen(true);
  };

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validExtensions.includes(file.type) && !file.name.match(/\.(png|jpg|jpeg|svg|webp)$/i)) {
      addToast('Please upload a valid image (.png, .jpg, .jpeg, .svg, .webp)', 'error');
      return;
    }

    // Validate size (max 3MB for base64 storage safety)
    if (file.size > 3 * 1024 * 1024) {
      addToast('Image size should be under 3MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setFormLogoUrl(reader.result);
        setPreviewError(false);
        addToast('Logo image loaded into preview', 'success');
      }
    };
    reader.onerror = () => {
      addToast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);

    // Reset input to allow selecting same file again if desired
    e.target.value = '';
  };

  const handleSaveSettings = (e) => {
    if (e) e.preventDefault();
    const cleanName = formCompanyName.trim();
    const cleanLogo = formLogoUrl.trim();

    updateWorkspaceSettings({
      companyName: cleanName || tenantId,
      logoUrl: cleanLogo,
    });
    setIsSettingsOpen(false);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (docsDropdownRef.current && !docsDropdownRef.current.contains(event.target)) {
        setIsDocsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserSave = () => {
    if (customUserVal.trim()) {
      setUserId(customUserVal.trim());
      setIsEditingUser(false);
      addToast(`User ID set to '${customUserVal.trim()}'`, 'info');
    }
  };

  const isHealthy = backendHealth.status === 'healthy' && backendHealth.qdrant === 'connected';
  const isBackendUp = backendHealth.status !== 'offline';

  const userInitials = (userId || 'U').slice(0, 2).toUpperCase();
  const isDocsActive = activeView === 'upload' || activeView === 'manage_docs';

  return (
    <header className="sticky top-0 z-50 bg-[#F8F9FA]/90 backdrop-blur-xl border-b border-slate-300/60 px-6 sm:px-8 py-3.5 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left Side: Brand + Left-Aligned Navigation Links */}
        <div className="flex items-center gap-6 sm:gap-8 lg:gap-10">
          {/* Clean Company Workspace Brand (Dynamic Logo with Gradient Fallback) */}
          <div 
            onClick={() => onSelectView('overview')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            {logoUrl && !logoLoadError ? (
              <img 
                src={logoUrl} 
                alt={displayBrand} 
                onError={() => setLogoLoadError(true)}
                className="w-9 h-9 rounded-xl object-contain border border-slate-200 p-0.5 bg-slate-50 shadow-xs shrink-0 group-hover:scale-105 transition-transform" 
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform shrink-0">
                {displayBrand.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 block leading-tight group-hover:text-emerald-700 transition-colors">
                {displayBrand}
              </span>
              <span className="text-[10px] tracking-wider uppercase font-mono text-slate-400 block font-medium">
                Enterprise Portal
              </span>
            </div>
          </div>

          {/* Left-Aligned Text Navigation Links + Documents Dropdown */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {/* Overview Link */}
            <button
              type="button"
              onClick={() => onSelectView('overview')}
              className={`relative py-1 text-sm font-medium transition-colors cursor-pointer ${
                activeView === 'overview' ? 'text-emerald-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Overview</span>
              {activeView === 'overview' && (
                <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              )}
            </button>

            {/* Documents Dropdown Menu */}
            <div className="relative" ref={docsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsDocsOpen((prev) => !prev)}
                className={`relative py-1 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isDocsActive ? 'text-emerald-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-expanded={isDocsOpen}
              >
                <span>Documents</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDocsOpen ? 'rotate-180' : ''}`} />
                {isDocsActive && (
                  <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                )}
              </button>

              {/* Documents Dropdown Popover */}
              {isDocsOpen && (
                <div className="absolute left-0 mt-3 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-[60] animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('upload');
                      setIsDocsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left ${
                      activeView === 'upload'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
                      <UploadCloud className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Upload Document</div>
                      <div className="text-[10px] text-slate-500 font-normal">File upload & RBAC tagging</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('manage_docs');
                      setIsDocsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left ${
                      activeView === 'manage_docs'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Uploaded Documents</div>
                      <div className="text-[10px] text-slate-500 font-normal">Chunk records & permissions</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Audit Trail Link */}
            <button
              type="button"
              onClick={() => onSelectView('audit')}
              className={`relative py-1 text-sm font-medium transition-colors cursor-pointer ${
                activeView === 'audit' ? 'text-emerald-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Audit Trail</span>
              {activeView === 'audit' && (
                <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              )}
            </button>
          </nav>
        </div>

        {/* Right Section: Pill Action + Profile Controls */}
        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          
          {/* Center-Right Pill Action: "✨ Ask Nova" (Custom Royal/Electric Blue Branding) */}
          <button
            type="button"
            onClick={() => onSelectView('query')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer shadow-xs ${
              activeView === 'query'
                ? 'bg-blue-600 border border-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-blue-50/80 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 animate-pulse ${activeView === 'query' ? 'text-white' : 'text-blue-600'}`} />
            <span>Ask Nova</span>
          </button>

          {/* Server Health Subtle Ping Dot */}
          <div
            onClick={refreshHealth}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 border border-slate-200 hover:border-slate-300 hover:bg-slate-200/60 transition-colors cursor-pointer text-xs"
            title={isHealthy ? 'Vector Engine & API Online' : isBackendUp ? 'API Online / DB Degraded' : 'Offline'}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isHealthy ? 'bg-emerald-400' : isBackendUp ? 'bg-amber-400' : 'bg-rose-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isHealthy ? 'bg-emerald-500' : isBackendUp ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
            </span>
            <span className="text-[10px] font-mono text-slate-500 hidden lg:inline font-medium">
              {isHealthy ? 'ONLINE' : 'STATUS'}
            </span>
          </div>

          {/* Right Profile Avatar & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-slate-100/80 border border-slate-200 hover:border-slate-300 hover:bg-slate-200/60 transition-all cursor-pointer shadow-xs"
              aria-expanded={isProfileOpen}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-800 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                {userInitials}
              </div>
              <span className="text-xs font-mono text-slate-700 font-medium max-w-[80px] truncate hidden sm:inline">
                {userId}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 z-[60] animate-in fade-in zoom-in-95 duration-150">
                
                {/* User ID Header & Inline Edit */}
                <div className="pb-3 border-b border-slate-100">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1 font-semibold">
                    Authenticated User
                  </div>
                  {isEditingUser ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={customUserVal}
                        onChange={(e) => setCustomUserVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUserSave()}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-mono outline-none focus:border-emerald-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleUserSave}
                        className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 font-mono">{userId}</span>
                      <button
                        type="button"
                        onClick={() => setIsEditingUser(true)}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Role Pill */}
                <div className="py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Security Clearance</span>
                  <span
                    className={`font-semibold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[10px] border ${
                      activeRole?.toLowerCase() === 'admin'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : activeRole?.toLowerCase() === 'hr'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {activeRole}
                  </span>
                </div>

                {/* Workspace ID */}
                <div className="py-2.5 border-b border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Workspace</span>
                  <span className="font-mono text-slate-800 font-medium">{tenantId}</span>
                </div>

                {/* Admin-Only Workspace Settings Button */}
                {activeRole?.toLowerCase() === 'admin' && (
                  <div className="py-2.5 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={handleOpenSettings}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-xs font-medium text-emerald-800 transition-all cursor-pointer shadow-xs group"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-emerald-600 group-hover:rotate-45 transition-transform duration-300" />
                        <span className="font-semibold">Workspace Settings</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300/60 font-semibold">
                        Admin
                      </span>
                    </button>
                  </div>
                )}

                {/* Mobile Navigation Links inside dropdown */}
                <div className="md:hidden py-2.5 border-b border-slate-100 space-y-1">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1 font-semibold">
                    Navigation
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('overview');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left py-1 text-xs text-slate-700 hover:text-emerald-700 font-medium cursor-pointer"
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('upload');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left py-1 text-xs text-slate-700 hover:text-emerald-700 font-medium cursor-pointer"
                  >
                    Upload Document
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('manage_docs');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left py-1 text-xs text-slate-700 hover:text-emerald-700 font-medium cursor-pointer"
                  >
                    Uploaded Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('audit');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left py-1 text-xs text-slate-700 hover:text-emerald-700 font-medium cursor-pointer"
                  >
                    Audit Trail
                  </button>
                </div>

                {/* Logout / Switch Company */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      logoutWorkspace();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs font-medium text-slate-700 hover:text-rose-700 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Switch Company / Logout</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>

      {/* Workspace Settings Modal (Admin Only - Rendered into body via Portal) */}
      {isSettingsOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div 
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl text-left animate-in zoom-in-95 duration-150 custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Lighting Gradients */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                    Workspace Settings
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize company branding, navigation logo, and portal title
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5 relative z-10">
              {/* Live Preview Card */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2 font-semibold">
                  Live Navbar Preview
                </label>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {formLogoUrl && !previewError ? (
                      <img
                        src={formLogoUrl}
                        alt="Preview"
                        onError={() => setPreviewError(true)}
                        className="w-9 h-9 rounded-xl object-contain border border-slate-200 p-0.5 bg-white shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-emerald-600/20 shrink-0">
                        {(formCompanyName || tenantId || 'T').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
                        {formCompanyName || tenantId || 'Workspace Name'}
                      </span>
                      <span className="text-[10px] tracking-wider uppercase font-mono text-slate-400 block font-medium">
                        Enterprise Portal
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium">
                    Real-time Preview
                  </span>
                </div>
                {previewError && formLogoUrl && (
                  <p className="text-[11px] text-amber-600 mt-1.5">
                    ⚠️ Image could not be loaded from this URL. Gradient initial fallback will be displayed.
                  </p>
                )}
              </div>

              {/* Company Name Field */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={formCompanyName}
                    onChange={(e) => setFormCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corporation, TechNova Labs"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Displayed on the top-left brand header and portal navigation.
                </p>
              </div>

              {/* Company Logo Field (Direct File Upload & URL Option) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Company Logo
                  </label>
                  {formLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormLogoUrl('');
                        setPreviewError(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />

                <div className="space-y-2">
                  {/* Direct File Upload Action */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 hover:border-emerald-300 text-xs font-semibold text-emerald-800 transition-all cursor-pointer shadow-xs group"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600 group-hover:-translate-y-0.5 transition-transform" />
                      <span>Upload Logo Image</span>
                      <span className="text-[10px] text-emerald-600/80 font-mono hidden sm:inline">(.png, .jpg, .svg, .webp)</span>
                    </button>
                  </div>

                  {/* Alternative URL input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={formLogoUrl.startsWith('data:image') ? '(Uploaded Image File)' : formLogoUrl}
                      onChange={(e) => {
                        setFormLogoUrl(e.target.value);
                        setPreviewError(false);
                      }}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all shadow-xs font-mono"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mt-1.5">
                  Upload an image from your computer or paste a direct URL. If removed, the colorful letter initial icon will be used.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
