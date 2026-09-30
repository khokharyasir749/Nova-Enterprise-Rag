import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  UploadCloud,
  ShieldAlert,
  ArrowRight,
  Shield,
  Building2,
  User,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  Database,
  ArrowUpRight,
} from 'lucide-react';

export default function OverviewDashboard({ onNavigate }) {
  const {
    tenantId,
    companyName,
    tenantName,
    workspaceName,
    logoUrl,
    activeRole,
    userId,
    backendHealth,
  } = useAuth();

  const isHealthy = backendHealth.status === 'healthy' && backendHealth.qdrant === 'connected';
  const displayBrand = companyName || tenantName || workspaceName || tenantId || 'Enterprise';

  const roleDescription = {
    admin: 'Full administrative clearance: Query documents, reconfigure role permissions, and purge vector records.',
    hr: 'Human resources clearance: Authorized to inspect personnel policy handbooks and confidential employee records.',
    employee: 'General employee clearance: Authorized for standard workplace policies and company operating guides.',
  }[activeRole?.toLowerCase()] || 'Standard authorized enterprise access.';

  const capabilities = [
    {
      id: 'query',
      title: 'Intelligent Knowledge Retrieval',
      category: 'Nova Vector Search',
      icon: MessageSquare,
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      description: 'Query company intelligence with strict hardware-accelerated 384-dimensional vector pre-filtering. Only documents cleared for your active security role are ever ingested by Nova to synthesize answers.',
      tags: ['Pre-LLM Isolation', 'Exact Citations', 'Zero Vector Leakage'],
      actionText: 'Launch Nova Console',
    },
    {
      id: 'manage_docs',
      title: 'Document & RBAC Indexing',
      category: 'Knowledge Ingestion & Clearance',
      icon: UploadCloud,
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      description: 'Ingest corporate PDF and plain text documents with live recursive chunking, automated embedding generation, and real-time multi-role permissions management in Qdrant.',
      tags: ['384-Dim Vectors', 'Dynamic Chunking', 'Live Role Overrides'],
      actionText: 'Manage Uploaded Documents',
    },
    {
      id: 'audit',
      title: 'Immutable Compliance Vault',
      category: 'Security & Audit Logs',
      icon: ShieldAlert,
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      description: 'Review permanent compliance audit trails. Every question, document retrieval, and security rejection is immutably recorded with exact timestamps and granted role clearances.',
      tags: ['Real-Time Audit', 'Access Rejection Proof', 'Exportable Records'],
      actionText: 'Inspect Compliance Logs',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Dark Luxury Cinematic Hero */}
      <div className="relative rounded-[32px] bg-[#0B0F17] border border-white/5 p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl">
        {/* Subtle cinematic ambient backlights */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-20 left-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          
          {/* Metadata Pill & Optional Custom Logo */}
          <div className="flex flex-wrap items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={displayBrand}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-contain border border-white/15 bg-white/[0.04] p-1.5 shadow-xl shadow-cyan-500/10 shrink-0"
              />
            )}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Workspace: {displayBrand}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400">ID: {tenantId}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-cyan-300 font-semibold uppercase">{activeRole} CLEARANCE</span>
            </div>
          </div>

          {/* Editorial Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08]">
            Enterprise Intelligence,
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-500">
              Built for Your Organization.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-sm sm:text-base lg:text-lg text-neutral-400 max-w-2xl leading-relaxed">
            Segregated vector intelligence and role-gated knowledge strictly under{' '}
            <strong className="text-neutral-100 font-semibold">{displayBrand}</strong>.
            All queries and document embeddings remain strictly quarantined to eliminate data leakage.
          </p>

          {/* Large Pill CTA */}
          <div className="pt-2">
            <button
              onClick={() => onNavigate('query')}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition-all duration-200 shadow-xl hover:shadow-cyan-500/10 hover:scale-[1.02] cursor-pointer group"
            >
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span>Launch Nova Assistant</span>
              <ArrowRight className="w-4 h-4 text-black transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>

      {/* Rounded Section Container: Wide Polished Capability Showcase Banners */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
            Enterprise Capabilities
          </span>
          <span className="text-xs text-neutral-500">
            Direct navigation across isolated modules
          </span>
        </div>

        <div className="space-y-4">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.id}
                onClick={() => onNavigate(cap.id)}
                className="group relative rounded-[28px] bg-[#0B0F17] hover:bg-[#0E1420] border border-white/5 hover:border-white/10 p-6 sm:p-8 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  
                  {/* Left: Icon, Category & Description */}
                  <div className="space-y-3 max-w-3xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl ${cap.iconBg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block">
                          {cap.category}
                        </span>
                        <h2 className="text-lg sm:text-xl font-semibold text-white group-hover:text-cyan-200 transition-colors">
                          {cap.title}
                        </h2>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed pl-0 lg:pl-14">
                      {cap.description}
                    </p>

                    {/* Feature tags */}
                    <div className="flex flex-wrap items-center gap-2 pl-0 lg:pl-14 pt-1">
                      {cap.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[11px] font-mono text-neutral-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div className="flex items-center lg:justify-end shrink-0 pl-0 lg:pl-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] group-hover:bg-white group-hover:text-black border border-white/10 text-xs font-semibold text-neutral-200 transition-all duration-200 shadow-sm">
                      <span>{cap.actionText}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rounded Section Container: Active Governance & System Specifications */}
      <div className="rounded-[32px] bg-[#0B0F17] border border-white/5 p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Active Governance & Session Parameters
            </h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            Immutable Audit Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Workspace Partition */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">
              Cryptographic Tenant
            </span>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-sm text-white font-mono truncate">
                {tenantId}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 pt-1 leading-relaxed">
              Strict vector partition: Zero cross-tenant document exposure.
            </p>
          </div>

          {/* Assigned Security Role */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">
              Security Role Clearance
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`font-semibold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full text-xs border ${
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
            <p className="text-[11px] text-neutral-400 pt-1 leading-relaxed line-clamp-2">
              {roleDescription}
            </p>
          </div>

          {/* User Session */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">
              Session User Identity
            </span>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-sm text-white font-mono truncate">
                {userId}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 pt-1 leading-relaxed">
              All queries and file activities are permanently audit-logged.
            </p>
          </div>

          {/* Vector Engine Health */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">
              Qdrant Vector Cluster
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-semibold text-sm text-white">
                {isHealthy ? 'Cluster Active' : 'Checking Cluster'}
              </span>
              <span className="text-[10px] font-mono text-neutral-400 ml-auto">
                384-DIM
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 pt-1 font-mono truncate">
              {backendHealth.embedding_model || 'all-MiniLM-L6-v2'}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
