import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';

export default function Navbar({ activeView = 'overview', onSelectView }) {
  const {
    tenantId,
    companyName,
    tenantName,
    workspaceName,
    logoUrl,
    logoutWorkspace,
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
  const profileRef = useRef(null);
  const docsDropdownRef = useRef(null);

  useEffect(() => {
    setLogoLoadError(false);
  }, [logoUrl]);

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
    <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10 px-6 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Clean Company Workspace Brand (Dynamic Logo with Gradient Fallback) */}
        <div 
          onClick={() => onSelectView('overview')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {logoUrl && !logoLoadError ? (
            <img 
              src={logoUrl} 
              alt={displayBrand} 
              onError={() => setLogoLoadError(true)}
              className="w-9 h-9 rounded-xl object-contain border border-white/10 p-0.5 bg-black/40 shadow-sm shrink-0 group-hover:scale-105 transition-transform" 
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0">
              {displayBrand.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <span className="font-bold text-base tracking-tight text-white block leading-tight group-hover:text-cyan-200 transition-colors">
              {displayBrand}
            </span>
            <span className="text-[10px] tracking-wider uppercase font-mono text-neutral-400 block">
              Enterprise Portal
            </span>
          </div>
        </div>

        {/* Center: Clean Text Navigation Links + Documents Dropdown */}
        <nav className="hidden md:flex items-center gap-8">
          {/* Overview Link */}
          <button
            type="button"
            onClick={() => onSelectView('overview')}
            className={`relative py-1 text-sm font-medium transition-colors cursor-pointer ${
              activeView === 'overview' ? 'text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Overview</span>
            {activeView === 'overview' && (
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full" />
            )}
          </button>

          {/* Documents Dropdown Menu */}
          <div className="relative" ref={docsDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDocsOpen((prev) => !prev)}
              className={`relative py-1 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDocsActive ? 'text-white' : 'text-neutral-400 hover:text-white'
              }`}
              aria-expanded={isDocsOpen}
            >
              <span>Documents</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDocsOpen ? 'rotate-180' : ''}`} />
              {isDocsActive && (
                <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full" />
              )}
            </button>

            {/* Documents Dropdown Popover */}
            {isDocsOpen && (
              <div className="absolute left-0 mt-3 w-60 rounded-xl bg-[#0B0F17]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    onSelectView('upload');
                    setIsDocsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    activeView === 'upload'
                      ? 'bg-white/10 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 shrink-0">
                    <UploadCloud className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Upload Document</div>
                    <div className="text-[10px] text-neutral-400 font-normal">File upload & RBAC tagging</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectView('manage_docs');
                    setIsDocsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    activeView === 'manage_docs'
                      ? 'bg-white/10 text-white'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-indigo-400 shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Uploaded Documents</div>
                    <div className="text-[10px] text-neutral-400 font-normal">Chunk records & permissions</div>
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
              activeView === 'audit' ? 'text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Audit Trail</span>
            {activeView === 'audit' && (
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full" />
            )}
          </button>
        </nav>

        {/* Right Section: Pill Action + Profile Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Center-Right Pill Action: "✨ Ask Nova" */}
          <button
            type="button"
            onClick={() => onSelectView('query')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer shadow-sm ${
              activeView === 'query'
                ? 'bg-cyan-950/80 border border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                : 'bg-slate-900/80 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Ask Nova</span>
          </button>

          {/* Server Health Subtle Ping Dot */}
          <div
            onClick={refreshHealth}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors cursor-pointer text-xs"
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
            <span className="text-[10px] font-mono text-neutral-400 hidden lg:inline">
              {isHealthy ? 'ONLINE' : 'STATUS'}
            </span>
          </div>

          {/* Right Profile Avatar & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer"
              aria-expanded={isProfileOpen}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                {userInitials}
              </div>
              <span className="text-xs font-mono text-neutral-300 max-w-[80px] truncate hidden sm:inline">
                {userId}
              </span>
              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-[#0B0F17] border border-white/10 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                
                {/* User ID Header & Inline Edit */}
                <div className="pb-3 border-b border-white/10">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 mb-1">
                    Authenticated User
                  </div>
                  {isEditingUser ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={customUserVal}
                        onChange={(e) => setCustomUserVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUserSave()}
                        className="flex-1 bg-black/60 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleUserSave}
                        className="p-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white font-mono">{userId}</span>
                      <button
                        type="button"
                        onClick={() => setIsEditingUser(true)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Role Pill */}
                <div className="py-3 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Security Clearance</span>
                  <span
                    className={`font-semibold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[10px] border ${
                      activeRole?.toLowerCase() === 'admin'
                        ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                        : activeRole?.toLowerCase() === 'hr'
                        ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    }`}
                  >
                    {activeRole}
                  </span>
                </div>

                {/* Workspace ID */}
                <div className="py-2.5 border-b border-white/10 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Workspace</span>
                  <span className="font-mono text-neutral-200">{tenantId}</span>
                </div>

                {/* Mobile Navigation Links inside dropdown */}
                <div className="md:hidden py-2.5 border-b border-white/10 space-y-1">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 mb-1">
                    Navigation
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('overview');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left py-1 text-xs text-neutral-300 hover:text-white"
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('upload');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left py-1 text-xs text-neutral-300 hover:text-white"
                  >
                    Upload Document
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('manage_docs');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left py-1 text-xs text-neutral-300 hover:text-white"
                  >
                    Uploaded Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectView('audit');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left py-1 text-xs text-neutral-300 hover:text-white"
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
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-rose-950/30 border border-white/5 hover:border-rose-900/40 text-xs font-medium text-neutral-300 hover:text-rose-300 transition-all cursor-pointer"
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
    </header>
  );
}
