import React, { useState, useEffect, useRef } from 'react';
import { ReasoningLogEntry, LogEntryType } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Terminal, ArrowDown, Filter, Copy, Check } from 'lucide-react';

interface ReasoningLogProps {
  entries: ReasoningLogEntry[];
}

export const ReasoningLog: React.FC<ReasoningLogProps> = ({ entries }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new deductions arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const filteredEntries = entries.filter((entry) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'DEDUCTIONS') {
      return entry.type === 'DEDUCTION_SAFE' || entry.type === 'DEDUCTION_HAZARD';
    }
    if (filterType === 'RISK') return entry.type === 'RISK_ASSESSMENT';
    if (filterType === 'CRITICAL') {
      return (
        entry.type === 'CASUALTY' ||
        entry.type === 'SURVIVOR_FOUND' ||
        entry.type === 'EXTRACTION'
      );
    }
    return true;
  });

  const getEntryBadge = (type: LogEntryType) => {
    switch (type) {
      case 'DEDUCTION_SAFE':
        return <Badge variant="teal">SAFE DEDUCTION</Badge>;
      case 'DEDUCTION_HAZARD':
        return <Badge variant="coral">HAZARD CONFIRMED</Badge>;
      case 'RISK_ASSESSMENT':
        return <Badge variant="amber">CALCULATED RISK</Badge>;
      case 'SURVIVOR_FOUND':
        return <Badge variant="gold">SURVIVOR DETECTED</Badge>;
      case 'CASUALTY':
        return <Badge variant="coral">UNIT CASUALTY</Badge>;
      case 'EXTRACTION':
        return <Badge variant="teal">EXTRACTION PATH</Badge>;
      case 'BACKTRACK':
        return <Badge variant="slate">BACKTRACK</Badge>;
      case 'ABORT':
        return <Badge variant="amber">SCAN EXHAUSTED</Badge>;
      default:
        return <Badge variant="outline">OBSERVATION</Badge>;
    }
  };

  const copyLogText = () => {
    const text = entries
      .map(
        (e) =>
          `[STEP ${e.step}] (${e.position[0]},${e.position[1]}) [${e.type}] ${e.message} ${
            e.details ? `| Details: ${e.details}` : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="flex flex-col h-full border border-white/10">
      <CardHeader className="bg-slate-900/80 pb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-amber-400" />
          <CardTitle className="text-slate-100">AI PROPOSITIONAL REASONING LOG</CardTitle>
          <span className="text-xs font-mono-hud text-slate-400">
            ({entries.length} entries)
          </span>
        </div>

        <div className="flex items-center gap-2">

        </div>
      </CardHeader>

      {/* Filter Chips Bar */}
      <div className="px-5 py-2.5 bg-slate-950/60 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs font-mono-hud">
        <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="text-slate-500 text-[11px] uppercase mr-1">Filter:</span>
        {[
          { id: 'ALL', label: 'All Events' },
          { id: 'DEDUCTIONS', label: 'Logic Deductions' },
          { id: 'RISK', label: 'Calculated Risks' },
          { id: 'CRITICAL', label: 'Critical / Extractions' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterType === f.id
                ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <CardContent className="p-0 flex-1 min-h-[300px] max-h-[460px] flex flex-col">
        <div
          ref={logContainerRef}
          className="flex-1 p-4 overflow-y-auto space-y-2.5 font-mono-hud text-xs"
        >
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-500 italic">
              No matching reasoning steps found.
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg bg-slate-950/70 border border-white/5 hover:border-slate-700/60 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400/90 font-bold">
                      STEP {entry.step.toString().padStart(2, '0')}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      @({entry.position[0]},{entry.position[1]})
                    </span>
                    {getEntryBadge(entry.type)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-slate-200 leading-relaxed font-sans text-xs md:text-[13px]">
                  {entry.message}
                </div>

                {entry.details && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[11px] text-slate-400 italic font-mono-hud">
                    ↳ {entry.details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
