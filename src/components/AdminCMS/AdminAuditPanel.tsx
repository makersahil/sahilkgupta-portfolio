import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { AdminAuditLog } from '../../types.js';

interface Props {
  logs: AdminAuditLog[];
  loading: boolean;
  onRefresh: () => void;
}

export const AdminAuditPanel: React.FC<Props> = ({ logs, loading, onRefresh }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-white font-semibold">Persisted Admin Audit Log</div>
        <div className="text-white/40 text-[10px] mt-1">Only real PostgreSQL audit events are shown. No synthetic fallback records or generated timestamps.</div>
      </div>
      <button onClick={onRefresh} className="px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-white/70"><RefreshCw className="w-3.5 h-3.5 inline mr-1" />Refresh</button>
    </div>
    <div className="rounded-xl bg-black border border-white/10 overflow-hidden divide-y divide-white/10">
      {loading ? <div className="p-8 text-center text-white/40">Loading persisted audit records…</div> : null}
      {!loading && logs.length === 0 ? <div className="p-8 text-center text-white/40">No persisted Admin audit events yet.</div> : null}
      {!loading && logs.map((log) => (
        <div key={log.id} className="p-4 grid md:grid-cols-[180px_1fr_190px] gap-3 items-start">
          <div>
            <div className="text-[#00d4ff] font-mono text-[10px]">{log.action}</div>
            <div className="text-white/40 text-[10px] mt-1">{log.entityType}{log.entityId ? ` / ${log.entityId}` : ''}</div>
          </div>
          <div>
            <div className="text-white text-[11px]">{log.actorUser?.displayName ?? 'Deleted/unknown actor'}</div>
            <div className="text-white/40 text-[10px] mt-1">{log.actorUser?.email ?? 'actor unavailable'}{log.actorUser?.role ? ` · ${log.actorUser.role}` : ''}</div>
            {log.metadata ? <pre className="mt-2 text-[9px] text-white/35 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">{JSON.stringify(log.metadata, null, 2)}</pre> : null}
          </div>
          <div className="text-[10px] text-white/40 md:text-right">{new Date(log.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </div>
  </div>
);
