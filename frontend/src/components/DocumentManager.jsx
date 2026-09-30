import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDocuments, updateDocumentRoles, deleteDocument } from '../services/api';
import { AVAILABLE_ROLES } from '../constants';
import {
  FileText,
  Shield,
  Trash2,
  Edit3,
  RefreshCw,
  Loader2,
  AlertTriangle,
  X,
  Check,
  Layers,
  Calendar,
  Lock
} from 'lucide-react';

export default function DocumentManager({ tenantId, refreshTrigger }) {
  const { userRoles, addToast } = useAuth();
  const isAdmin = userRoles.map((r) => r.toLowerCase()).includes('admin');

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Edit Permissions Modal State
  const [editingDoc, setEditingDoc] = useState(null);
  const [editRoles, setEditRoles] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirm Modal State
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocs = useCallback(async () => {
    if (!tenantId || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDocuments(tenantId);
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
      addToast('Error loading documents from Qdrant', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenantId, isAdmin, addToast]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs, refreshTrigger]);

  // Open Edit Modal
  const handleOpenEdit = (doc) => {
    setEditingDoc(doc);
    setEditRoles([...doc.allowed_roles.map((r) => r.toLowerCase())]);
  };

  const handleToggleEditRole = (role) => {
    setEditRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) {
          addToast('At least one role must have access to the document.', 'warning');
          return prev;
        }
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleSaveRoles = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;
    if (editRoles.length === 0) {
      addToast('Please select at least one role.', 'warning');
      return;
    }

    setIsUpdating(true);
    try {
      await updateDocumentRoles({
        tenant_id: tenantId,
        doc_name: editingDoc.doc_name,
        allowed_roles: editRoles,
      });
      addToast(`Updated permissions for '${editingDoc.doc_name}'`, 'success');
      setEditingDoc(null);
      await loadDocs();
    } catch (err) {
      addToast(err.message || 'Failed to update roles', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    try {
      await deleteDocument({
        tenant_id: tenantId,
        doc_name: deletingDoc.doc_name,
      });
      addToast(`Purged '${deletingDoc.doc_name}' from vector store`, 'success');
      setDeletingDoc(null);
      await loadDocs();
    } catch (err) {
      addToast(err.message || 'Failed to delete document', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Non-admin banner
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-[#0B0F17] border border-white/10 rounded-[28px] p-8 text-center shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Administrative Access Required</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Document RBAC management is restricted to administrators. Switch to <strong className="text-white uppercase font-mono">ADMIN</strong> clearance to inspect and manage workspace documents.
          </p>
        </div>
      </div>
    );
  }

  const getRoleBadgeClass = (role) => {
    const r = role.toLowerCase();
    switch (r) {
      case 'admin':
        return 'bg-purple-950/40 text-purple-300 border-purple-800/40';
      case 'hr':
        return 'bg-sky-950/40 text-sky-300 border-sky-800/40';
      case 'employee':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-[#0B0F17] border border-white/5 rounded-[28px] overflow-hidden shadow-2xl">
        {/* Table Header / Action Bar */}
        <div className="p-5 sm:p-7 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0B0F17]">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Uploaded Documents</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/[0.04] text-neutral-300 border border-white/10">
                {documents.length} {documents.length === 1 ? 'file' : 'files'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-950/50 text-rose-300 border border-rose-800/40">
                ADMIN ONLY
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Active workspace: <span className="font-mono text-white font-medium">{tenantId}</span>. Inspect chunk partitions, edit live RBAC clearance, or purge vector records.
            </p>
          </div>

          <button
            onClick={loadDocs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-all self-end sm:self-auto cursor-pointer"
            title="Refresh document list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Content Area */}
        {loading && documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span>Scanning Qdrant collection for ingested documents...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-rose-400">{error}</p>
            <button
              onClick={loadDocs}
              className="text-xs font-semibold text-slate-300 underline hover:text-white"
            >
              Try Again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-xs sm:text-sm font-medium text-slate-300">
              No Documents Ingested Yet
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              This workspace has no vector documents indexed. Upload a .pdf or .txt document above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Current Allowed Roles</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {documents.map((doc) => (
                  <tr
                    key={doc.doc_name}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Document Name & Upload Date */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/80 text-slate-300 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate max-w-xs sm:max-w-md">
                          <span className="font-medium text-slate-100 block truncate" title={doc.doc_name}>
                            {doc.doc_name}
                          </span>
                          {doc.uploaded_at && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Chunks */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px]">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {doc.chunk_count} {doc.chunk_count === 1 ? 'chunk' : 'chunks'}
                      </span>
                    </td>

                    {/* Roles Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {doc.allowed_roles.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border font-mono ${getRoleBadgeClass(
                              role
                            )}`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-medium transition-all"
                          title="Edit permissions"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Edit Permissions</span>
                        </button>
                        <button
                          onClick={() => setDeletingDoc(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-medium transition-all"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* Edit RBAC Permissions Modal */}
      {/* ============================================================== */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit RBAC Permissions</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[260px]">
                    {editingDoc.doc_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoles} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Allowed Roles
                </label>
                <div className="space-y-2">
                  {AVAILABLE_ROLES.map((role) => {
                    const isChecked = editRoles.includes(role);
                    return (
                      <div
                        key={role}
                        onClick={() => handleToggleEditRole(role)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-slate-800/90 border-slate-600 text-white shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="rounded bg-slate-900 border-slate-700 text-slate-600 focus:ring-0 cursor-pointer pointer-events-none"
                          />
                          <div>
                            <span className="font-semibold uppercase tracking-wider text-xs block text-slate-100">
                              {role}
                            </span>
                            <span className="text-[11px] text-slate-400 font-sans">
                              {role === 'admin' && 'Executive & administrative level access'}
                              {role === 'hr' && 'Human resources & personnel documents'}
                              {role === 'employee' && 'General company-wide knowledge & handbooks'}
                            </span>
                          </div>
                        </div>
                        {isChecked && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300 block mb-0.5">Vector Update:</span>
                Saving will instantly update the payload on all <span className="text-slate-200 font-mono font-medium">{editingDoc.chunk_count}</span> chunks in collection <span className="text-slate-200 font-mono">enterprise_tenant_chunks</span> and record an audit log event.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Permissions</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Delete Confirmation Modal */}
      {/* ============================================================== */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-rose-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Delete Document</h3>
              </div>
              <button
                onClick={() => setDeletingDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                Are you sure you want to delete <span className="font-semibold text-white font-mono">{deletingDoc.doc_name}</span>?
              </p>
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs">
                This will permanently remove all <span className="font-bold">{deletingDoc.chunk_count}</span> vector chunks for workspace <span className="font-mono font-bold">{tenantId}</span> from Qdrant. This action cannot be reversed.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingDoc(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Deleting Chunks...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
