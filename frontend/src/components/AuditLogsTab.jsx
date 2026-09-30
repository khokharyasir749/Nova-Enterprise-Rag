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
      <div className="bg-[#09090b]/90 rounded-[24px] border border-zinc-800 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tenant Filter */}
          <div className="flex items-center gap-2 bg-black/60 border border-zinc-800 rounded-full px-3.5 py-1.5 text-xs text-zinc-300">
            <Filter className="w-3.5 h-3.5 text-red-400" />
            <label htmlFor="audit-tenant-filter" className="text-zinc-400">Tenant:</label>
            <select
              id="audit-tenant-filter"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="bg-transparent text-zinc-100 font-medium outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#09090b]">All Tenants</option>
              {registeredCompanies?.map((c) => (
                <option key={c.tenant_id} value={c.tenant_id} className="bg-[#09090b]">{c.name} ({c.tenant_id})</option>
              ))}
              {activeTenant && !registeredCompanies?.some(c => c.tenant_id === activeTenant) && (
                <option value={activeTenant} className="bg-[#09090b]">{activeTenant}</option>
              )}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, query, doc..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-black/60 border border-zinc-800 focus:border-red-500 focus:ring-1 focus:ring-red-500/40 text-xs text-zinc-200 rounded-full pl-9 pr-4 py-1.5 outline-none placeholder:text-zinc-500 transition-colors font-mono"
            />
          </div>
        </div>

        {/* Refresh Actions & Auto-refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-600 relative"></div>
            <span>Auto-refresh</span>
          </label>

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadLogs(false)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/10 text-zinc-200 border border-zinc-800 hover:border-red-900/40 hover:text-red-300 text-xs font-medium transition-colors cursor-pointer"
            title="Refresh logs now"
          >
            <RefreshCw className={`w-3 h-3 text-red-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Total Badge */}
          <div className="text-xs font-mono px-3 py-1 rounded-full bg-white/[0.04] text-zinc-300 border border-zinc-800">
            {filteredLogs.length} Records
          </div>

        </div>

      </div>

      {/* Audit Log Table */}
      <div className="bg-[#09090b]/90 rounded-[24px] border border-zinc-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/60 border-b border-zinc-800 uppercase font-semibold text-zinc-400 tracking-wider text-[10px]">
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
            <tbody className="divide-y divide-zinc-800/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <Clock className="w-6 h-6 text-zinc-600" />
                      <p className="text-xs text-zinc-400">No audit records found matching your filters.</p>
                      <p className="text-[11px] text-zinc-600">
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
                      className="hover:bg-zinc-900/40 transition-colors font-mono"
                    >
                      {/* Status */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                            isGranted
                              ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-800/40'
                              : isConv
                              ? 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                              : 'bg-red-950/30 text-red-400 border border-red-800/50'
                          }`}
                        >
                          {isGranted ? (
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                          ) : isConv ? (
                            <Sparkles className="w-3 h-3 text-zinc-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-400" />
                          )}
                          <span>{log.access_status}</span>
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-zinc-400 text-[11px]">
                        {log.timestamp ? log.timestamp.replace('T', ' ').slice(0, 19) : 'N/A'}
                      </td>

                      {/* User */}
                      <td className="py-2.5 px-4 font-sans font-medium text-zinc-200">
                        {log.user_id}
                      </td>

                      {/* Tenant */}
                      <td className="py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 text-[11px]">
                          {log.tenant_id}
                        </span>
                      </td>

                      {/* Roles */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {log.user_roles?.map((r, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[10px] uppercase font-semibold border border-zinc-800"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Query */}
                      <td className="py-2.5 px-4 font-sans text-zinc-200 max-w-xs truncate" title={log.query}>
                        "{log.query}"
                      </td>

                      {/* Documents */}
                      <td className="py-2.5 px-4">
                        {log.retrieved_documents && log.retrieved_documents.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.retrieved_documents.map((d, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-800 text-[10px]"
                                title={d}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic font-sans text-[11px]">
                            [None - Blocked]
                          </span>
                        )}
                      </td>

                      {/* Audit ID */}
                      <td className="py-2.5 px-4 text-[10px] text-zinc-500 font-mono" title={log.id}>
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
