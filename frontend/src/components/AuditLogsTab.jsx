import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAuditLogs } from '../services/api';
import {
  RefreshCw,
  Filter,
  Clock,
  Search,
  CheckCircle,
  XCircle,
  Sparkles
} from 'lucide-react';

export default function AuditLogsTab() {
  const { tenantId: activeTenant, registeredCompanies, addToast } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tenantFilter, setTenantFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchAuditLogs({
        tenant_id: tenantFilter === 'all' ? undefined : tenantFilter,
        limit: 100,
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      if (!silent) {
        addToast(error.message || 'Failed to fetch audit records.', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tenantFilter, addToast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadLogs(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  // Filter logs by search input
  const filteredLogs = logs.filter((log) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      log.user_id.toLowerCase().includes(term) ||
      log.query.toLowerCase().includes(term) ||
      log.tenant_id.toLowerCase().includes(term) ||
      (log.retrieved_documents && log.retrieved_documents.some((d) => d.toLowerCase().includes(term)))
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Control & Filter Bar */}
      <div className="bg-[#0B0F17] rounded-[24px] border border-white/5 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tenant Filter */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-3.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="audit-tenant-filter" className="text-slate-400">Tenant:</label>
            <select
              id="audit-tenant-filter"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="bg-transparent text-slate-100 font-medium outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B0F17]">All Tenants</option>
              {registeredCompanies?.map((c) => (
                <option key={c.tenant_id} value={c.tenant_id} className="bg-[#0B0F17]">{c.name} ({c.tenant_id})</option>
              ))}
              {activeTenant && !registeredCompanies?.some(c => c.tenant_id === activeTenant) && (
                <option value={activeTenant} className="bg-[#0B0F17]">{activeTenant}</option>
              )}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, query, doc..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-500/50 text-xs text-slate-200 rounded-full pl-9 pr-4 py-1.5 outline-none placeholder:text-neutral-500 transition-colors"
            />
          </div>
        </div>

        {/* Refresh Actions & Auto-refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400 select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-600 relative"></div>
            <span>Auto-refresh</span>
          </label>

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadLogs(false)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition-colors cursor-pointer"
            title="Refresh logs now"
          >
            <RefreshCw className={`w-3 h-3 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Total Badge */}
          <div className="text-xs font-mono px-3 py-1 rounded-full bg-white/[0.04] text-neutral-300 border border-white/10">
            {filteredLogs.length} Records
          </div>

        </div>

      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0B0F17] rounded-[24px] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 uppercase font-semibold text-slate-400 tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Tenant</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4 max-w-xs">Query</th>
                <th className="py-2.5 px-4">Accessed Documents</th>
                <th className="py-2.5 px-4">Audit ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <Clock className="w-6 h-6 text-slate-600" />
                      <p className="text-xs text-slate-400">No audit records found matching your filters.</p>
                      <p className="text-[11px] text-slate-600">
                        Query the RAG system to generate security audit log entries.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isGranted = log.access_status === 'GRANTED';
                  const isConv = log.access_status === 'CONVERSATIONAL';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-800/40 transition-colors font-mono"
                    >
                      {/* Status */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                            isGranted
                              ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-800/40'
                              : isConv
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-rose-950/30 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {isGranted ? (
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                          ) : isConv ? (
                            <Sparkles className="w-3 h-3 text-slate-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-400" />
                          )}
                          <span>{log.access_status}</span>
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                        {log.timestamp ? log.timestamp.replace('T', ' ').slice(0, 19) : 'N/A'}
                      </td>

                      {/* User */}
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                        {log.user_id}
                      </td>

                      {/* Tenant */}
                      <td className="py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                          {log.tenant_id}
                        </span>
                      </td>

                      {/* Roles */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {log.user_roles?.map((r, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[10px] uppercase font-semibold border border-slate-700/60"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Query */}
                      <td className="py-2.5 px-4 font-sans text-slate-200 max-w-xs truncate" title={log.query}>
                        "{log.query}"
                      </td>

                      {/* Documents */}
                      <td className="py-2.5 px-4">
                        {log.retrieved_documents && log.retrieved_documents.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.retrieved_documents.map((d, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px]"
                                title={d}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic font-sans text-[11px]">
                            [None - Blocked]
                          </span>
                        )}
                      </td>

                      {/* Audit ID */}
                      <td className="py-2.5 px-4 text-[10px] text-slate-500 font-mono" title={log.id}>
                        {log.id.slice(0, 8)}...
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
