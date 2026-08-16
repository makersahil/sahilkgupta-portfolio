import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export const RevisionConflictPanel: React.FC<{ visible: boolean; onReload: () => void }> = ({ visible, onReload }) => {
  if (!visible) return null;
  return <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100">
    <div className="flex gap-3"><AlertOctagon className="mt-0.5 h-5 w-5 shrink-0" /><div><div className="font-mono text-xs font-bold uppercase tracking-wider">Revision conflict</div><p className="mt-1 text-xs text-amber-100/70">This aggregate changed after it was loaded. Reload and review the latest persisted version before saving again. The Orchestrator never silently overwrites newer work.</p></div></div>
    <button type="button" onClick={onReload} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-200/20 px-3 py-2 font-mono text-[10px] font-bold uppercase hover:bg-amber-200/10"><RefreshCw className="h-3.5 w-3.5" />Reload</button>
  </div>;
};
