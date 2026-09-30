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
      <div className="bg-[#F8F9FA] rounded-[24px] border border-slate-300/60 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tenant Filter */}
          <div className="flex items-center gap-2 bg-white border border-slate-300/60 rounded-full px-3.5 py-1.5 text-xs text-slate-700 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <label htmlFor="audit-tenant-filter" className="text-slate-500 font-medium">Tenant:</label>
            <select
              id="audit-tenant-filter"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold outline-none cursor-pointer"
            >
              <option value="all" className="bg-white text-slate-900">All Tenants</option>
              {registeredCompanies?.map((c) => (
                <option key={c.tenant_id} value={c.tenant_id} className="bg-white text-slate-900">{c.name} ({c.tenant_id})</option>
              ))}
              {activeTenant && !registeredCompanies?.some(c => c.tenant_id === activeTenant) && (
                <option value={activeTenant} className="bg-white text-slate-900">{activeTenant}</option>
              )}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, query, doc..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 text-xs text-slate-900 rounded-full pl-9 pr-4 py-1.5 outline-none placeholder:text-slate-400 transition-colors font-mono shadow-xs"
            />
          </div>
        </div>

        {/* Refresh Actions & Auto-refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none font-medium">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 relative"></div>
            <span>Auto-refresh</span>
          </label>

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadLogs(false)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-300/70 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            title="Refresh logs now"
          >
            <RefreshCw className={`w-3 h-3 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Total Badge */}
          <div className="text-xs font-mono px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-300/60 font-medium">
            {filteredLogs.length} Records
          </div>

        </div>

      </div>

      {/* Audit Log Table */}
      <div className="bg-[#F8F9FA] rounded-[24px] border border-slate-300/60 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-600 tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 max-w-xs">Query</th>
                <th className="py-3 px-4">Accessed Documents</th>
                <th className="py-3 px-4">Audit ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <Clock className="w-6 h-6 text-slate-400" />
                      <p className="text-xs text-slate-600 font-semibold">No audit records found matching your filters.</p>
                      <p className="text-[11px] text-slate-400">
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
                      className="hover:bg-slate-50/70 transition-colors font-mono"
                    >
                      {/* Status */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                            isGranted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isConv
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isGranted ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : isConv ? (
                            <Sparkles className="w-3 h-3 text-blue-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{log.access_status}</span>
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 text-[11px] font-medium">
                        {log.timestamp ? log.timestamp.replace('T', ' ').slice(0, 19) : 'N/A'}
                      </td>

                      {/* User */}
                      <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                        {log.user_id}
                      </td>

                      {/* Tenant */}
                      <td className="py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                          {log.tenant_id}
                        </span>
                      </td>

                      {/* Roles */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {log.user_roles?.map((r, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] uppercase font-semibold border border-slate-200"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Query */}
                      <td className="py-2.5 px-4 font-sans text-slate-800 max-w-xs truncate" title={log.query}>
                        "{log.query}"
                      </td>

                      {/* Documents */}
                      <td className="py-2.5 px-4">
                        {log.retrieved_documents && log.retrieved_documents.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.retrieved_documents.map((d, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]"
                                title={d}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-sans text-[11px]">
                            [None - Blocked]
                          </span>
                        )}
                      </td>

                      {/* Audit ID */}
                      <td className="py-2.5 px-4 text-[10px] text-slate-400 font-mono font-medium" title={log.id}>
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
