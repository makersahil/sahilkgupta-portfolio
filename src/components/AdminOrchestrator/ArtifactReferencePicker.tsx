import React, { useRef, useState } from 'react';
import { Download, Eye, EyeOff, FileArchive, FileUp, ShieldCheck, Trash2 } from 'lucide-react';

import type { OrchestratorArtifactAdminRecord } from '../../types.js';

interface ArtifactReferencePickerProps {
  artifacts: OrchestratorArtifactAdminRecord[];
  disabled?: boolean;
  projectId?: string | null;
  labId?: string | null;
  onUpload: (file: File, options: { projectId?: string; labId?: string; isPublic?: boolean }) => Promise<unknown>;
  onVerify: (artifact: OrchestratorArtifactAdminRecord) => Promise<unknown>;
  onTogglePublic: (artifact: OrchestratorArtifactAdminRecord) => Promise<unknown>;
  onDelete: (artifact: OrchestratorArtifactAdminRecord) => Promise<unknown>;
}

function byteLabel(value: number | null): string {
  if (value === null) return 'unknown size';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

export const ArtifactReferencePicker: React.FC<ArtifactReferencePickerProps> = ({
  artifacts,
  disabled,
  projectId,
  labId,
  onUpload,
  onVerify,
  onTogglePublic,
  onDelete,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [makePublic, setMakePublic] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file, {
        ...(projectId ? { projectId } : {}),
        ...(labId ? { labId } : {}),
        isPublic: makePublic,
      });
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  return <section className="space-y-4 rounded-xl border border-white/10 bg-black/25 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]"><FileArchive className="h-4 w-4" />Artifact catalog</div>
        <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-white/40">Managed uploads are stored outside the public build using a server-calculated SHA-256. Existing EXTERNAL and S3_REFERENCE entries remain reference metadata only.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-[10px] text-white/50"><input type="checkbox" checked={makePublic} onChange={(event) => setMakePublic(event.target.checked)} disabled={disabled || uploading} />Public download</label>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
        <button type="button" disabled={disabled || uploading} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-[#00d4ff]/25 bg-[#00d4ff]/10 px-3 py-2 font-mono text-[9px] font-bold uppercase text-[#00d4ff] disabled:opacity-40"><FileUp className="h-3.5 w-3.5" />{uploading ? 'Storing…' : 'Upload managed bytes'}</button>
      </div>
    </div>

    <div className="space-y-2">
      {artifacts.length === 0 && <p className="text-xs text-white/35">No artifacts.</p>}
      {artifacts.map((artifact) => {
        const managed = artifact.storageProvider === 'LOCAL_MANAGED';
        return <div key={artifact.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-white">{artifact.originalName ?? artifact.fileName}</div>
            <div className="mt-1 font-mono text-[9px] text-white/35">{artifact.mimeType} · {artifact.storageProvider} · {byteLabel(artifact.sizeBytes)} · {managed ? 'MANAGED BYTES' : 'REFERENCE METADATA'}</div>
            <div className="mt-1 break-all text-[9px] text-white/25">inputs {artifact.referencedByInputs} · evidence {artifact.referencedByEvidence} · SHA-256 {managed && artifact.sha256 ? artifact.sha256 : artifact.sha256 ? 'recorded but not server-verified' : 'unknown'}</div>
          </div>
          <div className="flex gap-2">
            {managed && <a href={`/api/media/${artifact.id}/content`} target="_blank" rel="noreferrer" className="rounded border border-white/10 p-2 text-white/60 hover:text-[#00d4ff]" title="Download managed artifact"><Download className="h-3.5 w-3.5" /></a>}
            {managed && <button disabled={disabled} onClick={() => void onVerify(artifact)} className="rounded border border-emerald-400/20 p-2 text-emerald-300 disabled:opacity-40" title="Recalculate and verify SHA-256"><ShieldCheck className="h-3.5 w-3.5" /></button>}
            <button disabled={disabled} onClick={() => void onTogglePublic(artifact)} className="rounded border border-white/10 p-2 text-white/60 hover:text-[#00d4ff] disabled:opacity-40" title={artifact.isPublic ? 'Make private' : 'Make public'}>{artifact.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
            <button disabled={disabled || artifact.referencedByInputs + artifact.referencedByEvidence > 0} onClick={() => void onDelete(artifact)} className="rounded border border-red-500/20 p-2 text-red-300 disabled:opacity-30" title="Delete unreferenced artifact"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>;
      })}
    </div>
  </section>;
};
