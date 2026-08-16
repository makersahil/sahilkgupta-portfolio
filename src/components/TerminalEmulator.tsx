import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from 'lucide-react';

import { usePortfolio } from '../context/PortfolioContext.js';
import { api } from '../lib/api.js';
import type { UnifiedCliContext } from '../types.js';

interface TerminalLine {
  id: string;
  prompt?: string;
  command?: string;
  output: string;
  type: 'input' | 'output' | 'system' | 'error';
  timestamp: string;
}

const now = () => new Date().toLocaleTimeString();

function welcome(context: UnifiedCliContext, note?: string): string {
  const target = context.target ? ` • ${context.target.kind.toLowerCase()}: ${context.target.label}` : '';
  return [
    'Unified Infrastructure CLI v1',
    `Context: ${context.contextId}${target}`,
    `Mode: ${context.executionMode} • session scenario mutations: ${context.mutable ? 'enabled' : 'unavailable'} • external command execution disabled`,
    note ?? context.note,
    "Type 'help' for commands or 'ctx list' to switch Labs.",
  ].join('\n');
}

function presetCommands(context: UnifiedCliContext | null): string[] {
  if (!context || context.domain === 'PORTFOLIO') return ['ctx list', 'help'];
  if (context.domain === 'NETWORKING') return ['inspect', 'show health', 'show topology', 'show routes', 'scenario list', 'evidence'];
  if (context.domain === 'LINUX') return ['inspect', 'show health', 'show services', 'show selinux', 'show storage', 'scenario list', 'evidence'];
  return ['inspect', 'show health', 'show pipelines', 'show terraform', 'show kubernetes', 'scenario list', 'evidence'];
}

export const TerminalEmulator: React.FC = () => {
  const { isTerminalOpen, setIsTerminalOpen, activeCategory } = usePortfolio();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [context, setContext] = useState<UnifiedCliContext | null>(null);
  const [commandHints, setCommandHints] = useState<string[]>(['help', 'ctx list', 'inspect', 'show health', 'scenario list', 'evidence', 'clear']);
  const [lines, setLines] = useState<TerminalLine[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastBootstrapKey = useRef<string | null>(null);

  const prompt = context?.prompt ?? 'PORTFOLIO>';
  const presets = useMemo(() => presetCommands(context), [context]);

  useEffect(() => {
    if (!isTerminalOpen) {
      lastBootstrapKey.current = null;
      return;
    }

    const key = activeCategory?.slug ?? 'portfolio';
    if (lastBootstrapKey.current === key && context) return;
    lastBootstrapKey.current = key;

    let cancelled = false;
    setIsBusy(true);
    api.getCliBootstrap(activeCategory?.slug)
      .then((bootstrap) => {
        if (cancelled) return;
        setContext(bootstrap.context);
        setCommandHints(bootstrap.commandHints);
        setLines((previous) => [
          ...previous,
          {
            id: `bootstrap-${Date.now()}`,
            output: welcome(bootstrap.context, bootstrap.note),
            type: 'system',
            timestamp: now(),
          },
        ]);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unable to load CLI context';
        setLines((previous) => [
          ...previous,
          { id: `bootstrap-error-${Date.now()}`, output: `CLI bootstrap failed: ${message}`, type: 'error', timestamp: now() },
        ]);
      })
      .finally(() => {
        if (!cancelled) setIsBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isTerminalOpen, activeCategory?.slug]);

  useEffect(() => {
    if (!isTerminalOpen) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isTerminalOpen, lines, isBusy]);

  const handleCommand = async (commandOverride?: string) => {
    const raw = commandOverride ?? inputVal;
    const command = raw.trim();
    if (!command || isBusy) return;

    setHistory((previous) => [...previous, command]);
    setHistoryIdx(-1);
    setInputVal('');
    const commandPrompt = prompt;
    setLines((previous) => [
      ...previous,
      { id: `input-${Date.now()}`, prompt: commandPrompt, command, output: '', type: 'input', timestamp: now() },
    ]);

    setIsBusy(true);
    try {
      const response = await api.execCli(command, context?.contextId, activeCategory?.slug);
      setContext(response.context);
      if (response.clear) {
        setLines([]);
      } else {
        const responseLines: TerminalLine[] = [];
        if (response.contextChanged) {
          responseLines.push({
            id: `context-${Date.now()}`,
            output: `Context: ${response.context.contextId}\n${response.context.note}`,
            type: 'system',
            timestamp: now(),
          });
        }
        if (response.output) {
          responseLines.push({
            id: `output-${Date.now()}-${responseLines.length}`,
            output: response.output,
            type: response.exitCode === 0 ? 'output' : 'error',
            timestamp: now(),
          });
        }
        setLines((previous) => [...previous, ...responseLines]);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Backend request failed';
      setLines((previous) => [
        ...previous,
        { id: `error-${Date.now()}`, output: `CLI request failed: ${message}`, type: 'error', timestamp: now() },
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleCommand();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!history.length) return;
      const next = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(next);
      setInputVal(history[next] ?? '');
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIdx === -1) return;
      const next = historyIdx + 1;
      if (next >= history.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(next);
        setInputVal(history[next] ?? '');
      }
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const current = inputVal.trim().toLowerCase();
      if (!current) return;
      const match = commandHints.find((hint) => hint.toLowerCase().startsWith(current) && !hint.includes('<'));
      if (match) setInputVal(match);
    }
  };

  const transcript = () => lines.map((line) => {
    if (line.command) return `${line.prompt ?? prompt} ${line.command}`;
    return line.output;
  }).join('\n');

  const copyTranscript = async () => {
    await navigator.clipboard.writeText(transcript());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcript()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `portfolio-cli-${new Date().toISOString().replaceAll(':', '-')}.log`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (!isTerminalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className={`flex w-full flex-col overflow-hidden rounded-xl border border-white/15 bg-black font-mono shadow-[0_30px_90px_rgba(0,0,0,0.9)] ${
            isFullScreen ? 'h-[96vh] max-w-[98vw]' : 'h-[650px] max-w-5xl'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-[#111114] px-4 py-2.5 select-none">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsTerminalOpen(false)} className="h-3 w-3 rounded-full bg-[#ff4100]" title="Close CLI" />
                <button onClick={() => setIsFullScreen((value) => !value)} className="h-3 w-3 rounded-full bg-yellow-500/90" title="Toggle fullscreen" />
                <button onClick={() => setLines([])} className="h-3 w-3 rounded-full bg-[#00ff41]" title="Clear transcript" />
              </div>
              <div className="flex min-w-0 items-center gap-2 text-xs text-white/90">
                <TerminalIcon className="h-4 w-4 shrink-0 text-[#00ff41]" />
                <span className="truncate">Unified Recorded-State + Scenario CLI</span>
                <span className="hidden text-white/35 md:inline">{context?.contextId ?? 'loading context...'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => void copyTranscript()} className="rounded p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white" title="Copy transcript">
                {copied ? <Check className="h-3.5 w-3.5 text-[#00ff41]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button onClick={downloadTranscript} className="rounded p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white" title="Export transcript">
                <Download className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setLines([])} className="rounded p-1.5 text-white/40 transition hover:bg-white/10 hover:text-[#ff4100]" title="Clear transcript">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setIsFullScreen((value) => !value)} className="rounded p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white" title="Toggle fullscreen">
                {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => setIsTerminalOpen(false)} className="rounded p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white" title="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-[#16161a] px-3 py-2 text-xs no-scrollbar">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/35">Context shortcuts:</span>
            {presets.map((command) => (
              <button
                key={command}
                onClick={() => void handleCommand(command)}
                disabled={isBusy}
                className="shrink-0 rounded border border-white/10 bg-black px-2.5 py-1 text-[11px] text-[#00d4ff] transition hover:border-[#00d4ff]/40 hover:bg-[#00d4ff]/10 disabled:cursor-wait disabled:opacity-40"
              >
                {command}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-black p-4 text-xs text-[#00ff41] selection:bg-white/30 selection:text-white" onClick={() => inputRef.current?.focus()}>
            {lines.map((line) => (
              <div key={line.id} className="space-y-1">
                {line.command && (
                  <div className="flex items-start gap-2 text-white">
                    <span className="shrink-0 font-bold text-[#00d4ff]">{line.prompt ?? prompt}</span>
                    <span className="font-semibold">{line.command}</span>
                  </div>
                )}
                {line.output && (
                  <pre className={`overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed ${line.type === 'error' ? 'text-[#ff6b6b]' : line.type === 'system' ? 'text-white/60' : 'text-white/90'}`}>
                    {line.output}
                  </pre>
                )}
              </div>
            ))}

            <div className="flex items-start gap-2 pt-1 text-white">
              <span className="shrink-0 font-bold text-[#00d4ff]">{prompt}</span>
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(event) => setInputVal(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isBusy || !context}
                className="min-w-0 flex-1 border-none bg-transparent p-0 font-mono text-xs text-white outline-none placeholder:text-white/20 focus:ring-0 disabled:opacity-50"
                placeholder={isBusy ? 'Resolving Lab/session state...' : "Try 'help', 'scenario status', 'inspect', or 'show health'"}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#111114] px-4 py-2 text-[10px] text-white/40 sm:text-[11px]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00ff41]" />
              <span className="truncate">MODE: {context?.executionMode ?? 'RECORDED_STATE'} • shell/provider execution: disabled • session scenario mutations: {context?.mutable ? 'enabled' : 'unavailable'}</span>
            </div>
            <span className="shrink-0 text-[#00d4ff]">{context?.domain ?? 'PORTFOLIO'}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
