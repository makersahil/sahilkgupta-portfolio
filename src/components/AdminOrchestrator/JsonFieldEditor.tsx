import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Braces, CheckCircle2, Wand2 } from 'lucide-react';

interface JsonFieldEditorProps {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  description?: string;
  rows?: number;
  disabled?: boolean;
}

export const JsonFieldEditor: React.FC<JsonFieldEditorProps> = ({ label, value, onChange, description, rows = 12, disabled = false }) => {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setText(JSON.stringify(value ?? {}, null, 2)); setError(null); }, [value]);
  const size = useMemo(() => new TextEncoder().encode(text).length, [text]);

  const parse = (next: string) => {
    setText(next);
    try {
      const parsed = JSON.parse(next) as unknown;
      setError(null);
      onChange(parsed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid JSON');
    }
  };

  const format = () => {
    try {
      const parsed = JSON.parse(text) as unknown;
      const formatted = JSON.stringify(parsed, null, 2);
      setText(formatted);
      setError(null);
      onChange(parsed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid JSON');
    }
  };

  return <label className="block space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/70"><Braces className="h-3.5 w-3.5 text-[#00d4ff]" />{label}</span>
      <div className="flex items-center gap-2 text-[9px] text-white/35">
        <span>{size.toLocaleString()} bytes</span>
        <button type="button" disabled={disabled} onClick={format} className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 hover:border-[#00d4ff]/40 hover:text-[#00d4ff] disabled:opacity-40"><Wand2 className="h-3 w-3" />Format</button>
      </div>
    </div>
    {description && <p className="text-[10px] leading-relaxed text-white/35">{description}</p>}
    <textarea disabled={disabled} rows={rows} value={text} onChange={(event) => parse(event.target.value)} spellCheck={false} className="w-full rounded-xl border border-white/10 bg-black/70 p-3 font-mono text-xs leading-relaxed text-white outline-none focus:border-[#00d4ff]/50 disabled:opacity-50" />
    <div className={`flex items-center gap-2 text-[10px] ${error ? 'text-red-300' : 'text-[#00ff41]/70'}`}>
      {error ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {error ?? 'Valid JSON. No expression or executable evaluation is performed.'}
    </div>
  </label>;
};
