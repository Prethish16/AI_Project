import React from 'react';
import { SimulationState } from '../../simulation/logic';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Radio, AlertTriangle, ShieldCheck, HeartPulse, Cpu, Layers } from 'lucide-react';

interface TelemetryPanelProps {
  simulationState: SimulationState;
  sectorName: string;
  unitCallsign: string;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  simulationState,
  sectorName,
  unitCallsign,
}) => {
  const {
    currentPos,
    provenSafe,
    confirmedHazards,
    candidateClauses,
    lastSensorReading,
    status,
    survivorsLocated,
    gridSize,
  } = simulationState;

  const totalCells = gridSize * gridSize;
  const safePercentage = Math.round((provenSafe.size / totalCells) * 100);

  return (
    <div className="space-y-4">
      {/* Sensor Array Status Card */}
      <Card className="border border-white/10">
        <CardHeader className="bg-slate-900/80 pb-2.5">
          <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            LOCAL SENSOR TELEMETRY (HUD)
          </CardTitle>
          <Badge variant="outline">{unitCallsign}</Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-3 font-mono-hud text-xs">
          {/* Ambiguous Proximity Hazard Sensor */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle
                className={`w-5 h-5 ${
                  lastSensorReading?.dangerSignal ? 'text-amber-400 animate-bounce-short' : 'text-slate-600'
                }`}
              />
              <div>
                <div className="font-bold text-slate-200">PROXIMITY DANGER SIGNAL</div>
                <div className="text-[11px] text-slate-400">
                  {lastSensorReading?.dangerSignal
                    ? 'Ambiguous hazard presence detected in 4-neighbors'
                    : 'Clean perimeter; no neighboring hazards'}
                </div>
              </div>
            </div>

            <Badge variant={lastSensorReading?.dangerSignal ? 'amber' : 'teal'} dot>
              {lastSensorReading?.dangerSignal ? 'DANGER SIGNAL' : 'PERIMETER CLEAR'}
            </Badge>
          </div>

          {/* Survivor Acoustic Sensor */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <HeartPulse
                className={`w-5 h-5 ${
                  survivorsLocated.size > 0 ? 'text-yellow-400 animate-pulse' : 'text-slate-600'
                }`}
              />
              <div>
                <div className="font-bold text-slate-200">LIFE-SIGN ACOUSTIC SENSOR</div>
                <div className="text-[11px] text-slate-400">
                  {survivorsLocated.size > 0
                    ? `${survivorsLocated.size} survivor${survivorsLocated.size === 1 ? '' : 's'} secured`
                    : 'Acoustic scanning in progress...'}
                </div>
              </div>
            </div>

            <Badge variant={survivorsLocated.size > 0 ? 'gold' : 'slate'} dot={survivorsLocated.size > 0}>
              {survivorsLocated.size > 0 ? 'SURVIVORS LOCATED' : 'SEARCHING'}
            </Badge>
          </div>

          {/* Current Coordinates & Mission State */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-center">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
              <div className="text-[10px] text-slate-500 uppercase">Current Position</div>
              <div className="text-base font-bold text-cyan-300">
                ({currentPos[0]}, {currentPos[1]})
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
              <div className="text-[10px] text-slate-500 uppercase">Sector Designation</div>
              <div className="text-sm font-bold text-amber-300 truncate">{sectorName}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logical Knowledge Base Progress */}
      <Card className="border border-white/10">
        <CardHeader className="bg-slate-900/80 pb-2.5">
          <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            PROPOSITIONAL KNOWLEDGE BASE
          </CardTitle>
          <span className="text-[11px] font-mono-hud text-slate-400">
            {provenSafe.size} Safe / {confirmedHazards.size} Hazard
          </span>
        </CardHeader>

        <CardContent className="p-4 space-y-3 font-mono-hud text-xs">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Grid Safe Coverage</span>
              <span className="text-teal-400 font-bold">{safePercentage}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${safePercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded bg-teal-950/30 border border-teal-500/30">
              <div className="text-[10px] text-teal-400 uppercase">Proven Safe</div>
              <div className="text-sm font-bold text-teal-200">{provenSafe.size} / {totalCells}</div>
            </div>

            <div className="p-2 rounded bg-red-950/30 border border-red-500/30">
              <div className="text-[10px] text-red-400 uppercase">Hazards Confirmed</div>
              <div className="text-sm font-bold text-red-200">{confirmedHazards.size}</div>
            </div>

            <div className="p-2 rounded bg-amber-950/30 border border-amber-500/30">
              <div className="text-[10px] text-amber-400 uppercase">Active Clauses</div>
              <div className="text-sm font-bold text-amber-200">{candidateClauses.length}</div>
            </div>
          </div>

          {/* Active Clauses HUD */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 mb-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>ACTIVE DISJUNCTIVE CLAUSES ({candidateClauses.length}):</span>
            </div>

            {candidateClauses.length === 0 ? (
              <div className="p-2.5 rounded bg-slate-950/40 border border-white/5 text-[11px] text-slate-500 italic text-center">
                No unresolved danger clauses are currently active.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {candidateClauses.map((clause, idx) => {
                  const candidateArr = Array.from(clause.candidates);
                  return (
                    <div
                      key={clause.id}
                      className="p-2 rounded bg-slate-950/80 border border-amber-500/30 flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="text-amber-400 font-bold shrink-0">C#{idx + 1}:</span>
                      <span className="text-slate-300 truncate">
                        {candidateArr.map((c) => `(${c})`).join(' ∨ ')}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        @{clause.origin[0]},{clause.origin[1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
