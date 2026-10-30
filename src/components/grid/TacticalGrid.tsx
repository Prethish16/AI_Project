import React, { useState } from 'react';
import { Coordinate, GroundTruth, HazardType } from '../../types';
import {
  SimulationState,
  toKey,
} from '../../simulation/logic';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Eye, EyeOff, Bot, Check, ShieldAlert, Heart, Compass, Info } from 'lucide-react';

interface TacticalGridProps {
  simulationState: SimulationState;
  groundTruth: GroundTruth;
  commandPeek: boolean;
  onToggleCommandPeek: () => void;
  onSelectCell?: (coord: Coordinate) => void;
}

export const TacticalGrid: React.FC<TacticalGridProps> = ({
  simulationState,
  groundTruth,
  commandPeek,
  onToggleCommandPeek,
}) => {
  const [inspectedCoord, setInspectedCoord] = useState<Coordinate | null>(null);

  const {
    currentPos,
    visited,
    provenSafe,
    confirmedHazards,
    candidateClauses,
    dfsPath,
    survivorsLocated,
    gridSize,
  } = simulationState;

  // Build candidate suspicion count map
  const candidateCounts = new Map<string, number>();
  candidateClauses.forEach((cl) => {
    cl.candidates.forEach((candKey) => {
      candidateCounts.set(candKey, (candidateCounts.get(candKey) || 0) + 1);
    });
  });

  const getCellVisualData = (r: number, c: number) => {
    const key = toKey(r, c);
    const isCurrent = currentPos[0] === r && currentPos[1] === c;
    const isStart = r === 0 && c === 0;
    const isVisited = visited.has(key);
    const isSafe = provenSafe.has(key);
    const confirmedHazardType = confirmedHazards.get(key);
    const isSuspicious = !isSafe && !confirmedHazardType && (candidateCounts.get(key) || 0) > 0;
    const isSurvivorDiscovered = survivorsLocated.has(key);

    // Ground truth flags (for Command Peek only)
    const isRealHazard = groundTruth.hazards[key] as HazardType | undefined;
    const isRealSurvivor = groundTruth.survivors.some(([sr, sc]) => sr === r && sc === c);

    // Path trail check
    const pathIndex = dfsPath.findIndex((p) => p[0] === r && p[1] === c);
    const isInPath = pathIndex !== -1;

    return {
      key,
      isCurrent,
      isStart,
      isVisited,
      isSafe,
      confirmedHazardType,
      isSuspicious,
      suspiciousCount: candidateCounts.get(key) || 0,
      isSurvivorDiscovered,
      isRealHazard,
      isRealSurvivor,
      isInPath,
      pathIndex,
    };
  };

  const isLargeGrid = gridSize >= 7;
  const cellSizeClass = isLargeGrid
    ? 'w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14'
    : gridSize === 6
      ? 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16'
      : 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20';
  const gridGapClass = isLargeGrid ? 'gap-1 sm:gap-1.5' : 'gap-1.5 md:gap-2.5';

  return (
    <Card className="border border-white/10 shadow-2xl relative">
      <CardHeader className="bg-slate-900/80 pb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-amber-400">
            <Compass className="w-5 h-5 text-amber-400 animate-spin-slow" />
            LIVE TACTICAL BUILDING SCAN
          </CardTitle>
          <Badge variant="amber" dot>
            {gridSize}×{gridSize} Grid Sensor Array
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Command Peek Mode (Ground Truth Audit for Course Grading) */}
          <button
            onClick={onToggleCommandPeek}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-hud font-semibold transition-all cursor-pointer ${
              commandPeek
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle ground-truth visibility for grading evaluation (The robot logic remains blind to this!)"
          >
            {commandPeek ? <Eye className="w-3.5 h-3.5 text-red-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>COMMAND PEEK {commandPeek ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6 flex flex-col items-center">
        {/* Top Legend Bar */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-4 px-2 py-2 rounded-lg bg-slate-950/60 border border-white/5 text-[11px] font-mono-hud text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500/80 border border-teal-400" />
            <span>Proven Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80 border border-amber-400" />
            <span>Suspicious Candidate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/80 border border-red-400" />
            <span>Confirmed Hazard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 border border-yellow-300 shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
            <span>Survivor Beacon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-400/50" />
            <span>Robot Unit</span>
          </div>
        </div>

        {/* Configurable tactical grid */}
        <div className="relative max-w-full overflow-x-auto p-2 md:p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 shadow-[0_0_40px_rgba(6,182,212,0.06)]">
          <div
            className={`grid ${gridGapClass} mb-1.5 pl-6 min-w-max`}
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: gridSize }, (_, c) => (
              <div
                key={`col-${c}`}
                className="text-center font-mono-hud text-[11px] font-bold text-slate-500"
              >
                C{c}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          <div className="space-y-1.5 sm:space-y-2 md:space-y-2.5">
            {Array.from({ length: gridSize }, (_, r) => (
              <div key={`row-${r}`} className={`flex items-center ${isLargeGrid ? 'gap-1' : 'gap-1.5 md:gap-2'}`}>
                {/* Row Header Coordinate (0..4) */}
                <div className="w-4 text-right font-mono-hud text-[11px] font-bold text-slate-500 select-none">
                  R{r}
                </div>

                <div
                  className={`grid ${gridGapClass} min-w-max`}
                  style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: gridSize }, (_, c) => {
                    const data = getCellVisualData(r, c);

                    // Dynamic Styling based on logical deduction state
                    let cellBg = 'bg-slate-900/60 border-slate-800 text-slate-400';
                    let cellGlow = '';

                    if (data.confirmedHazardType) {
                      cellBg =
                        'bg-red-950/80 border-red-500/80 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.35)]';
                      cellGlow = 'ring-1 ring-red-400/40';
                    } else if (data.isSurvivorDiscovered) {
                      cellBg =
                        'bg-yellow-950/80 border-yellow-400 text-yellow-200 shadow-[0_0_25px_rgba(234,179,8,0.5)]';
                      cellGlow = 'ring-2 ring-yellow-400/60 animate-pulse';
                    } else if (data.isSafe) {
                      cellBg = data.isVisited
                        ? 'bg-teal-950/60 border-teal-500/70 text-teal-200 shadow-[0_0_14px_rgba(20,184,166,0.2)]'
                        : 'bg-teal-950/30 border-teal-500/40 text-teal-300';
                    } else if (data.isSuspicious) {
                      cellBg =
                        'bg-amber-950/50 border-amber-500/60 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]';
                    }

                    // Command peek overlay border for instructor review
                    if (commandPeek && data.isRealHazard && !data.confirmedHazardType) {
                      cellGlow += ' border-dashed border-red-400/80';
                    }

                    return (
                      <div
                        key={data.key}
                        onClick={() => setInspectedCoord([r, c])}
                        role="button"
                        tabIndex={0}
                        aria-label={`Cell (${r},${c}): ${data.confirmedHazardType || (data.isSafe ? 'Safe' : 'Unexplored')}`}
                        className={`relative ${cellSizeClass} rounded-lg border flex flex-col items-center justify-between ${isLargeGrid ? 'p-1' : 'p-1.5'} transition-all duration-200 cursor-pointer select-none hover:scale-[1.03] hover:z-10 ${cellBg} ${cellGlow}`}
                      >
                        {/* Cell Coordinates & Labels */}
                        <div className={`w-full flex items-center justify-between font-mono-hud font-semibold opacity-70 ${isLargeGrid ? 'text-[8px]' : 'text-[10px]'}`}>
                          <span>
                            {r},{c}
                          </span>
                          {data.isStart && (
                            <span className={`text-cyan-400 font-bold ${isLargeGrid ? 'text-[7px]' : 'text-[9px]'}`}>BASE</span>
                          )}
                          {data.suspiciousCount > 0 && !data.isSafe && !data.confirmedHazardType && (
                            <span className={`text-amber-400 font-bold ${isLargeGrid ? 'text-[8px]' : ''}`}>?{data.suspiciousCount}</span>
                          )}
                        </div>

                        {/* Cell Content Icons / States */}
                        <div className="flex-1 flex items-center justify-center relative">
                          {data.confirmedHazardType ? (
                            <div className="flex flex-col items-center animate-bounce-short">
                              <ShieldAlert className={`${isLargeGrid ? 'w-4 h-4' : 'w-5 h-5 sm:w-6 sm:h-6'} text-red-400`} />
                              <span className={`${isLargeGrid ? 'text-[7px]' : 'text-[9px]'} font-mono-hud font-bold text-red-300 uppercase tracking-tighter mt-0.5`}>
                                {data.confirmedHazardType === 'GAS_LEAK' ? 'GAS' : 'HAZARD'}
                              </span>
                            </div>
                          ) : data.isSurvivorDiscovered ? (
                            <div className="flex flex-col items-center">
                              <Heart className={`${isLargeGrid ? 'w-4 h-4' : 'w-6 h-6'} text-yellow-300 fill-yellow-400 animate-pulse`} />
                              <span className={`${isLargeGrid ? 'text-[7px]' : 'text-[9px]'} font-mono-hud font-bold text-yellow-300`}>
                                SURVIVOR
                              </span>
                            </div>
                          ) : data.isSafe ? (
                            <div className="flex items-center justify-center opacity-80">
                              <Check className={`${isLargeGrid ? 'w-3 h-3' : 'w-4 h-4'} text-teal-400`} />
                            </div>
                          ) : data.isSuspicious ? (
                            <div className={`${isLargeGrid ? 'text-[8px]' : 'text-[10px]'} font-mono-hud text-amber-400/90 font-bold tracking-tight`}>
                              SUSPECT
                            </div>
                          ) : null}

                          {/* Command Peek Indicator (Grading mode) */}
                          {commandPeek && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                              {data.isRealHazard && !data.confirmedHazardType && (
                                <span className="text-[11px] font-mono-hud font-bold text-red-400">
                                  [REAL HAZARD]
                                </span>
                              )}
                              {data.isRealSurvivor && !data.isSurvivorDiscovered && (
                                <span className="text-[11px] font-mono-hud font-bold text-yellow-400">
                                  [SURVIVOR]
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Robot Current Position Ring & Beacon */}
                        {data.isCurrent && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Outer pulsating radar ring */}
                            <span className={`absolute rounded-full bg-cyan-400/30 animate-pulse-ring ${isLargeGrid ? 'w-9 h-9' : 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16'}`} />
                            {/* Inner active robot badge */}
                            <div className={`relative z-20 flex items-center justify-center rounded-full bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_#06b6d4] ring-2 ring-white ${isLargeGrid ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9'}`}>
                              <Bot className={`${isLargeGrid ? 'w-4 h-4' : 'w-5 h-5'} animate-pulse`} />
                            </div>
                          </div>
                        )}

                        {/* Breadcrumb Path Trail */}
                        {data.isInPath && !data.isCurrent && (
                          <div className="absolute bottom-1 right-1">
                            <span className="w-2 h-2 rounded-full bg-teal-400/70 inline-block shadow-[0_0_4px_#14b8a6]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Cell Inspector Banner */}
        {inspectedCoord && (
          <div className="w-full mt-4 p-3 rounded-lg bg-slate-900/90 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-hud">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-amber-300">
                CELL ({inspectedCoord[0]},{inspectedCoord[1]}) INSPECTION:
              </span>
              <span className="text-slate-300">
                {simulationState.confirmedHazards.has(toKey(inspectedCoord[0], inspectedCoord[1]))
                  ? `Confirmed Hazard: ${simulationState.confirmedHazards.get(toKey(inspectedCoord[0], inspectedCoord[1]))}`
                  : simulationState.provenSafe.has(toKey(inspectedCoord[0], inspectedCoord[1]))
                  ? 'Proven Safe (Logical Deduction)'
                  : (candidateCounts.get(toKey(inspectedCoord[0], inspectedCoord[1])) || 0) > 0
                  ? `Implicated in ${candidateCounts.get(toKey(inspectedCoord[0], inspectedCoord[1]))} candidate danger clause(s)`
                  : 'Unexplored (No proximity signals recorded)'}
              </span>
            </div>
            {commandPeek && (
              <div className="text-red-300 font-bold">
                [GROUND TRUTH: {groundTruth.hazards[toKey(inspectedCoord[0], inspectedCoord[1])] || (groundTruth.survivors.some(([r, c]) => r === inspectedCoord[0] && c === inspectedCoord[1]) ? 'SURVIVOR' : 'EMPTY')}]
              </div>
            )}
            <button
              onClick={() => setInspectedCoord(null)}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
