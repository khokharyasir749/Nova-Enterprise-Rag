import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import OverviewDashboard from './components/OverviewDashboard';
import ChatTab from './components/ChatTab';
import UploadTab from './components/UploadTab';
import DocumentManager from './components/DocumentManager';
import AuditLogsTab from './components/AuditLogsTab';
import LockGateway from './components/LockGateway';
import ToastContainer from './components/Toast';
import { ArrowLeft } from 'lucide-react';

function Dashboard() {
  const [activeView, setActiveView] = useState('overview');
  const { tenantId, isAuthenticated } = useAuth();

  // If workspace is locked, require secret access code verification or registration
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-[#ECEEF2] text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900">
        <LockGateway />
        <ToastContainer />
      </div>
    );
  }

  const viewTitles = {
    overview: 'Overview',
    query: 'Ask Nova',
    upload: 'Upload Document',
    manage_docs: 'Uploaded Documents',
    audit: 'Compliance Audit Trail',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#ECEEF2] text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900 relative overflow-x-hidden">
      {/* Subtle ambient lighting & dot-matrix overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px] opacity-50 z-0" />
      <div className="fixed -top-32 left-1/3 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[170px] pointer-events-none z-0" />
      <div className="fixed top-1/2 -right-32 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar activeView={activeView} onSelectView={setActiveView} />

        {/* Main Dedicated Full-Screen Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 py-8 space-y-6">
        
        {/* Subtle Breadcrumb / Back Navigation Bar for Module Views */}
        {activeView !== 'overview' && (
          <div className="flex items-center justify-between pb-4 border-b border-slate-300/60">
            <button
              type="button"
              onClick={() => setActiveView('overview')}
              className="inline-flex items-center gap-2 text-xs font-mono text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transform group-hover:-translate-x-1 transition-transform" />
              <span>← Back to Overview</span>
            </button>
            
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="hidden sm:inline text-slate-400">Workspace /</span>
              <span className="text-emerald-800 font-medium bg-emerald-50/80 px-3 py-1 rounded-full border border-emerald-200/80 shadow-xs">
                {viewTitles[activeView] || activeView}
              </span>
            </div>
          </div>
        )}

        {/* Dedicated Viewport */}
        <div className="w-full">
          {activeView === 'overview' && (
            <OverviewDashboard onNavigate={setActiveView} />
          )}
          {activeView === 'query' && <ChatTab />}
          {activeView === 'upload' && <UploadTab />}
          {activeView === 'manage_docs' && <DocumentManager tenantId={tenantId} />}
          {activeView === 'audit' && <AuditLogsTab />}
        </div>
      </main>

      <ToastContainer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
