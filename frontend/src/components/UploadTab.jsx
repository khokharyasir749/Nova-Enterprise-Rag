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
      <div className="bg-[#0B0F17] rounded-[28px] border border-white/5 shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-white/5 gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white">Document Ingestion & RBAC Tagging</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Upload PDF or plain text files tagged with strict tenant isolation and role permissions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadSampleDocument('admin')}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700/80 transition-colors"
              title="Load demo admin document"
            >
              Demo Admin Doc
            </button>
            <button
              onClick={() => loadSampleDocument('general')}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700/80 transition-colors"
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
            className={`relative border border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
              isDragging
                ? 'border-slate-500 bg-slate-800/40'
                : selectedFile
                ? 'border-emerald-700/60 bg-emerald-950/10'
                : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/60'
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
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-400">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-100">{selectedFile.name}</div>
                <div className="text-xs text-slate-400 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'text/plain'}
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Click or drag another file to replace
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700/80 text-slate-300">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-200">
                  Drag & drop your <span className="text-slate-100 font-semibold font-mono">.pdf</span> or{' '}
                  <span className="text-slate-100 font-semibold font-mono">.txt</span> file here
                </div>
                <p className="text-[11px] text-slate-400">or browse from your local disk</p>
              </div>
            )}
          </div>

          {/* Metadata Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Target Tenant ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Target Tenant ID
              </label>
              <input
                type="text"
                value={targetTenant}
                onChange={(e) => setTargetTenant(e.target.value)}
                placeholder="e.g. company_a"
                className="w-full bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs sm:text-sm text-slate-200 rounded-lg px-3.5 py-2 outline-none font-mono transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Vectors will be isolated and searchable only by this tenant.
              </p>
            </div>

            {/* Allowed Roles Multi-Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                Permitted Roles on Document
              </label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {AVAILABLE_ROLES.map((role) => {
                  const isChecked = selectedRoles.includes(role);
                  return (
                    <div
                      key={role}
                      onClick={() => toggleRoleSelection(role)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded bg-slate-900 border-slate-700 text-slate-600 focus:ring-0 pointer-events-none"
                      />
                      <span className="uppercase">{role}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Users holding any of these roles can access chunks from this doc.
              </p>
            </div>

          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs sm:text-sm transition-all shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
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
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">
                  Ingestion Successful & Indexed
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-mono text-[11px]">
                  {lastUploaded.total_chunks} Chunks
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Document successfully partitioned, embedded (384-d), and committed to collection <span className="font-mono text-slate-200">enterprise_tenant_chunks</span>.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">Filename</span>
                  <span className="text-slate-200 truncate block">{lastUploaded.doc_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">Tenant</span>
                  <span className="text-slate-200 block">{lastUploaded.tenant_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">Permitted Roles</span>
                  <span className="text-slate-200 block">[{lastUploaded.allowed_roles.join(', ')}]</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

