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
      <div className="bg-[#F8F9FA] rounded-[28px] border border-slate-300/60 shadow-md p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-200 gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">Document Ingestion & RBAC Tagging</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload PDF or plain text files tagged with strict tenant isolation and role permissions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadSampleDocument('admin')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Load demo admin document"
            >
              Demo Admin Doc
            </button>
            <button
              onClick={() => loadSampleDocument('general')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 border border-slate-200 transition-colors cursor-pointer"
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
                ? 'border-emerald-500 bg-emerald-50/60'
                : selectedFile
                ? 'border-emerald-400/80 bg-emerald-50/30'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60'
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
                <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 shadow-xs">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-900">{selectedFile.name}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'text/plain'}
                </div>
                <div className="text-[11px] text-slate-400 pt-1 font-medium">
                  Click or drag another file to replace
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-700">
                  Drag & drop your <span className="text-emerald-700 font-semibold font-mono">.pdf</span> or{' '}
                  <span className="text-emerald-700 font-semibold font-mono">.txt</span> file here
                </div>
                <p className="text-[11px] text-slate-400">or browse from your local disk</p>
              </div>
            )}
          </div>

          {/* Metadata Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Target Tenant ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                Target Tenant ID
              </label>
              <input
                type="text"
                value={targetTenant}
                onChange={(e) => setTargetTenant(e.target.value)}
                placeholder="e.g. company_a"
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 text-xs sm:text-sm text-slate-900 rounded-xl px-3.5 py-2.5 outline-none font-mono transition-colors shadow-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Vectors will be isolated and searchable only by this tenant.
              </p>
            </div>

            {/* Allowed Roles Multi-Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Permitted Roles on Document
              </label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {AVAILABLE_ROLES.map((role) => {
                  const isChecked = selectedRoles.includes(role);
                  return (
                    <div
                      key={role}
                      onClick={() => toggleRoleSelection(role)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none shadow-2xs ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-0 pointer-events-none accent-emerald-600"
                      />
                      <span className="uppercase">{role}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Users holding any of these roles can access chunks from this doc.
              </p>
            </div>

          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-emerald-700/20 cursor-pointer"
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
        <div className="bg-[#F8F9FA] rounded-2xl border border-emerald-200/80 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Ingestion Successful & Indexed
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-mono text-[11px] font-semibold">
                  {lastUploaded.total_chunks} Chunks
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Document successfully partitioned, embedded (384-d), and committed to collection <span className="font-mono text-slate-800 font-semibold">enterprise_tenant_chunks</span>.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-100 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Filename</span>
                  <span className="text-slate-800 truncate block font-medium">{lastUploaded.doc_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Tenant</span>
                  <span className="text-slate-800 block font-medium">{lastUploaded.tenant_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Permitted Roles</span>
                  <span className="text-slate-800 block font-medium">[{lastUploaded.allowed_roles.join(', ')}]</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

