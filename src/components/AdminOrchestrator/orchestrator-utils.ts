export function statusClasses(status: string): string {
  if (['PUBLISHED', 'READY', 'COMPLETED', 'PASS'].includes(status)) return 'border-[#00ff41]/30 bg-[#00ff41]/10 text-[#00ff41]';
  if (['ARCHIVED', 'ERROR', 'FAIL'].includes(status)) return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (['DRAFT', 'PLANNED', 'WARNING', 'WARN'].includes(status)) return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  return 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]';
}

export function downloadJson(value: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

export function jsonText(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}
