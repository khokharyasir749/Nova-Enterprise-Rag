import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AVAILABLE_ROLES } from '../constants';
import { uploadDocument } from '../services/api';
import {
  UploadCloud,
  CheckCircle2,
  Building,
  Shield,
  Loader2,
  FileCheck,
  FileText
} from 'lucide-react';

export default function UploadTab() {
  const { tenantId: activeTenant, addToast } = useAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const [targetTenant, setTargetTenant] = useState(activeTenant);
  const [selectedRoles, setSelectedRoles] = useState(['admin']);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUploaded, setLastUploaded] = useState(null);

  // Sync targetTenant when activeTenant changes, if not customized yet
  React.useEffect(() => {
    setTargetTenant(activeTenant);
  }, [activeTenant]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.txt')) {
      addToast('Only .pdf and .txt files are supported.', 'error');
      return;
    }
    setSelectedFile(file);
    addToast(`Selected file: ${file.name}`, 'info');
  };

  const toggleRoleSelection = (role) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) {
          addToast('At least one allowed role must be selected for ingestion.', 'warning');
          return prev;
        }
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast('Please select a file to ingest.', 'warning');
      return;
    }
    if (!targetTenant.trim()) {
      addToast('Target Tenant ID cannot be empty.', 'warning');
      return;
    }
    if (selectedRoles.length === 0) {
      addToast('Select at least one allowed role.', 'warning');
      return;
    }

    setUploading(true);
    try {
      const response = await uploadDocument(
        selectedFile,
        targetTenant.trim().toLowerCase(),
        selectedRoles
      );

      setLastUploaded(response.data);
      addToast(
        `Successfully ingested '${response.data.doc_name}' into ${response.data.total_chunks} chunks!`,
        'success'
      );
      setSelectedFile(null);
    } catch (error) {
      addToast(error.message || 'Document ingestion failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Helper to quickly load a sample mock text file
  const loadSampleDocument = (type) => {
    let filename = '';
    let content = '';
    let roles = [];

    if (type === 'admin') {
      filename = 'executive_financials_2026.txt';
      roles = ['admin'];
      content = `CONFIDENTIAL EXECUTIVE MEMORANDUM
Tenant: ${targetTenant}
Authorized Roles: [admin]

Financial Projections & Strategic Acquisition:
In fiscal year 2026, Company A plans to allocate $20M toward expansion into
cloud infrastructure. A strategic buyout of DataPulse Systems is slated for Q3.
Executive bonuses will be distributed based on EBITDA exceeding 22%.
This document contains proprietary financial guidance and is restricted strictly to administrators.`;
    } else {
      filename = 'employee_handbook_standard.txt';
      roles = ['admin', 'hr', 'employee'];
      content = `COMPANY EMPLOYEE POLICY HANDBOOK
Tenant: ${targetTenant}
Authorized Roles: [admin, hr, employee]

General Workplace Guidelines:
Core working hours are 9:00 AM to 5:00 PM local time.
Employees receive 22 days of paid annual leave plus federal holidays.
Requests for leaves longer than 3 days should be filed via the HR portal.
Remote work is supported with prior team lead notification.`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });
    setSelectedFile(file);
    setSelectedRoles(roles);
    addToast(`Loaded sample document '${filename}'`, 'info');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Upload Form Card */}
      <div className="bg-[#09090b]/90 rounded-[28px] border border-zinc-800 shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-zinc-800 gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white">Document Ingestion & RBAC Tagging</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Upload PDF or plain text files tagged with strict tenant isolation and role permissions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadSampleDocument('admin')}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
              title="Load demo admin document"
            >
              Demo Admin Doc
            </button>
            <button
              onClick={() => loadSampleDocument('general')}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
              title="Load demo staff document"
            >
              Demo Staff Doc
            </button>
          </div>
        </div>

        <form onSubmit={handleUpload} className="mt-5 space-y-5">
          
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
              isDragging
                ? 'border-red-500 bg-red-950/30'
                : selectedFile
                ? 'border-red-800/60 bg-red-950/15'
                : 'border-zinc-800 hover:border-zinc-700 bg-black/60'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-400">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-zinc-100">{selectedFile.name}</div>
                <div className="text-xs text-zinc-400 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'text/plain'}
                </div>
                <div className="text-[11px] text-zinc-500 pt-1">
                  Click or drag another file to replace
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs sm:text-sm font-medium text-zinc-200">
                  Drag & drop your <span className="text-red-300 font-semibold font-mono">.pdf</span> or{' '}
                  <span className="text-red-300 font-semibold font-mono">.txt</span> file here
                </div>
                <p className="text-[11px] text-zinc-500">or browse from your local disk</p>
              </div>
            )}
          </div>

          {/* Metadata Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Target Tenant ID */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-red-400" />
                Target Tenant ID
              </label>
              <input
                type="text"
                value={targetTenant}
                onChange={(e) => setTargetTenant(e.target.value)}
                placeholder="e.g. company_a"
                className="w-full bg-black/60 border border-zinc-800 focus:border-red-500 focus:ring-1 focus:ring-red-500/40 text-xs sm:text-sm text-zinc-200 rounded-xl px-3.5 py-2.5 outline-none font-mono transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Vectors will be isolated and searchable only by this tenant.
              </p>
            </div>

            {/* Allowed Roles Multi-Select */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-red-400" />
                Permitted Roles on Document
              </label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {AVAILABLE_ROLES.map((role) => {
                  const isChecked = selectedRoles.includes(role);
                  return (
                    <div
                      key={role}
                      onClick={() => toggleRoleSelection(role)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-red-950/60 border-red-800 text-red-200 shadow-sm shadow-red-950/30'
                          : 'bg-black/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded bg-black border-zinc-700 text-red-600 focus:ring-0 pointer-events-none accent-red-600"
                      />
                      <span className="uppercase">{role}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Users holding any of these roles can access chunks from this doc.
              </p>
            </div>

          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-40 disabled:hover:from-red-600 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/40 cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Parsing, Chunking, & Writing to Qdrant...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Ingest Document</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Ingestion Success Card */}
      {lastUploaded && (
        <div className="bg-[#09090b]/90 rounded-2xl border border-zinc-800 p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Ingestion Successful & Indexed
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-mono text-[11px]">
                  {lastUploaded.total_chunks} Chunks
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Document successfully partitioned, embedded (384-d), and committed to collection <span className="font-mono text-zinc-200">enterprise_tenant_chunks</span>.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-zinc-800 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-sans">Filename</span>
                  <span className="text-zinc-200 truncate block">{lastUploaded.doc_name}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-sans">Tenant</span>
                  <span className="text-zinc-200 block">{lastUploaded.tenant_id}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-sans">Permitted Roles</span>
                  <span className="text-zinc-200 block">[{lastUploaded.allowed_roles.join(', ')}]</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

