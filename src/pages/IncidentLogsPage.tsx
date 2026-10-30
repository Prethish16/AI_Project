import React, { useState, useEffect } from 'react';
import { stateStore } from '../storage/stateStore';
import { missionStore } from '../storage/missionStore';
import { sectorMemoryRegistry } from '../simulation/sectorMemory';
import { MissionReport, SectorMemory } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table';
import {
  FileText,
  Brain,
  History,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Eye,
  Rocket,
  Trash2,
} from 'lucide-react';

interface IncidentLogsPageProps {
  onRedeployToSector?: (sectorName: string) => void;
}

export const IncidentLogsPage: React.FC<IncidentLogsPageProps> = ({
  onRedeployToSector,
}) => {
  const [reports, setReports] = useState<MissionReport[]>([]);
  const [retainedSectors, setRetainedSectors] = useState<SectorMemory[]>([]);
  const [inspectReport, setInspectReport] = useState<MissionReport | null>(null);
  const [selectedMissionKey, setSelectedMissionKey] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setReports(stateStore.getReports());
      setRetainedSectors(sectorMemoryRegistry.getAllRetainedSectors());
    };
    update();
    const unsub = stateStore.subscribe(update);
    return () => unsub();
  }, []);

  const savedMissions = missionStore.getAll();
  const reportMissionLookup = new Map<string, { id: string; name: string; sectorName: string }>();
  savedMissions.forEach((mission) => {
    mission.reports.forEach((report) => {
      reportMissionLookup.set(report.id, {
        id: mission.id,
        name: mission.name,
        sectorName: mission.sectorName,
      });
    });
  });

  const groupedReports = reports.reduce((groups, report) => {
    const savedMission = reportMissionLookup.get(report.id);
    const missionId = report.missionId || savedMission?.id;
    const key = missionId || 'unassigned';
    const group = groups.get(key) || {
      key,
      name: missionId
        ? report.missionName || savedMission?.name || report.sectorName
        : 'Unassigned Incident Logs',
      sectorName: missionId
        ? savedMission?.sectorName || report.sectorName
        : 'Reports without a mission workspace',
      reports: [] as MissionReport[],
      isUnassigned: !missionId,
    };
    group.reports.push(report);
    groups.set(key, group);
    return groups;
  }, new Map<string, {
    key: string;
    name: string;
    sectorName: string;
    reports: MissionReport[];
    isUnassigned: boolean;
  }>());

  const missionGroups = Array.from(groupedReports.values()).sort((a, b) => {
    if (a.isUnassigned) return 1;
    if (b.isUnassigned) return -1;
    return 0;
  });

  const activeMissionKey = selectedMissionKey && missionGroups.some((group) => group.key === selectedMissionKey)
    ? selectedMissionKey
    : missionGroups[0]?.key || null;
  const visibleReports = activeMissionKey
    ? missionGroups.find((group) => group.key === activeMissionKey)?.reports || []
    : [];

  const getOutcomeBadge = (outcome: MissionReport['outcome']) => {
    switch (outcome) {
      case 'SUCCESS_EXTRACTED':
        return (
          <Badge variant="teal" dot>
            SURVIVOR EXTRACTED
          </Badge>
        );
      case 'UNIT_DESTROYED':
        return (
          <Badge variant="coral" dot>
            UNIT CASUALTY
          </Badge>
        );
      case 'NO_SURVIVOR_FOUND':
        return (
          <Badge variant="slate" dot>
            NO SURVIVOR FOUND
          </Badge>
        );
      default:
        return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  const handleClearSector = (sector: string) => {
    sectorMemoryRegistry.clearSectorMemory(sector);
    setRetainedSectors(sectorMemoryRegistry.getAllRetainedSectors());
  };

  return (
    <div className="space-y-6">
      {/* Sector Memory Active Registry Section */}
      <Card className="border border-amber-500/30 glass-panel-amber">
        <CardHeader className="bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-amber-400" />
            <div>
              <CardTitle className="text-amber-300">ACTIVE SECTOR MEMORY REGISTRY</CardTitle>
              <p className="font-mono-hud text-xs text-slate-400 mt-0.5">
                Retained threat layouts from fallen units. Redeployments inherit proven intelligence.
              </p>
            </div>
          </div>
          <Badge variant="amber">{retainedSectors.length} Sectors Retained</Badge>
        </CardHeader>

        <CardContent className="p-5">
          {retainedSectors.length === 0 ? (
            <div className="p-6 rounded-lg bg-slate-950/40 border border-white/5 text-center font-mono-hud text-xs text-slate-400">
              No active sector memories currently retained. When a robot unit is destroyed in a mission,
              the exact hazard layout and all proven safe cells are automatically stored here for the next unit.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {retainedSectors.map((mem) => (
                <div
                  key={mem.sectorName}
                  className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-amber-300 text-base">
                      {mem.sectorName}
                    </span>
                    <Badge variant="coral">Casualty: {mem.failedByUnitId}</Badge>
                  </div>

                  <div className="space-y-1.5 font-mono-hud text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Breach Point:</span>
                      <span className="text-red-400 font-bold">
                        Hazard at ({mem.casualtyPosition[0]}, {mem.casualtyPosition[1]})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Inherited Safe Cells:</span>
                      <span className="text-teal-400 font-bold">{mem.provenSafeKeys.length} cells</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Retained At:</span>
                      <span className="text-slate-400">
                        {new Date(mem.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleClearSector(mem.sectorName)}
                      className="text-xs font-mono-hud text-slate-400 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Purge Memory</span>
                    </button>

                    {onRedeployToSector && (
                      <Button
                        variant="amber"
                        size="sm"
                        icon={<Rocket className="w-3.5 h-3.5" />}
                        onClick={() => onRedeployToSector(mem.sectorName)}
                      >
                        Redeploy to {mem.sectorName}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Mission Incident Log Table */}
      <Card className="border border-white/10 shadow-2xl">
        <CardHeader className="bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <CardTitle className="text-slate-100">MISSION INCIDENT & EXTRACTION ARCHIVES</CardTitle>
              <p className="font-mono-hud text-xs text-slate-400 mt-0.5">
                Permanent records stored in browser storage. Filter, audit, and replay reasoning traces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{missionGroups.length} Missions · {reports.length} Reports</Badge>
            {reports.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => stateStore.clearReports()}
              >
                Clear Log
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {missionGroups.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {missionGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setSelectedMissionKey(group.key)}
                  className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                    group.key === activeMissionKey
                      ? 'border-amber-400/60 bg-amber-950/30'
                      : 'border-white/10 bg-slate-950/50 hover:border-cyan-400/40'
                  }`}
                >
                  <div className="font-display font-bold text-amber-200">{group.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{group.sectorName}</div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono-hud">
                    <span className="text-slate-400">{group.reports.length} bot report{group.reports.length === 1 ? '' : 's'}</span>
                    <span className={group.isUnassigned ? 'text-slate-400' : 'text-cyan-300'}>
                      {group.isUnassigned ? 'Review reports' : 'View mission'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeMissionKey && (
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="font-display font-bold text-slate-100">
                  {missionGroups.find((group) => group.key === activeMissionKey)?.name}
                </div>
                <div className="text-xs text-slate-400">
                  Bot deployments and reasoning traces for this mission
                </div>
              </div>
              <Badge variant="teal">{visibleReports.length} Reports</Badge>
            </div>
          )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Target Sector</TableHead>
                <TableHead>Assigned Unit</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Explored</TableHead>
                <TableHead>Memory Used</TableHead>
                <TableHead className="text-right">Inspection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500 italic">
                    No missions completed yet. Deploy a RescueBot from Mission Control to populate the incident logs.
                  </TableCell>
                </TableRow>
              ) : (
                visibleReports.map((rep) => (
                  <TableRow key={rep.id} className="hover:bg-white/[0.04]">
                    <TableCell className="text-slate-400 text-xs">
                      {new Date(rep.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-bold text-amber-300">{rep.sectorName}</TableCell>
                    <TableCell className="text-cyan-300 font-semibold">{rep.unitId}</TableCell>
                    <TableCell>{getOutcomeBadge(rep.outcome)}</TableCell>
                    <TableCell className="font-bold text-slate-200">{rep.totalSteps}</TableCell>
                    <TableCell className="text-slate-400">
                      {rep.cellsExploredCount} / {rep.gridSize * rep.gridSize}
                    </TableCell>
                    <TableCell>
                      {rep.inheritedMemoryUsed ? (
                        <span className="text-teal-400 font-semibold">Yes (Inherited)</span>
                      ) : (
                        <span className="text-slate-500">Standard</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="slate"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => setInspectReport(rep)}
                      >
                        Review Trace
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      </Card>

      {/* Inspect Mission Reasoning Modal */}
      {inspectReport && (
        <Modal
          isOpen={!!inspectReport}
          onClose={() => setInspectReport(null)}
          title={`INCIDENT REPORT: ${inspectReport.sectorName}`}
          subtitle={`Unit: ${inspectReport.unitId} (${inspectReport.unitCallsign}) | Steps: ${inspectReport.totalSteps}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#171b17] border border-stone-500/20 font-mono-hud text-xs">
              <div>
                <span className="text-slate-500 mr-2">Status:</span>
                {getOutcomeBadge(inspectReport.outcome)}
              </div>
              <div>
                <span className="text-slate-500 mr-2">Timestamp:</span>
                <span className="text-slate-300">{new Date(inspectReport.timestamp).toLocaleString()}</span>
              </div>
              {inspectReport.fatalCoordinate && (
                <div className="text-red-400 font-bold">
                  Breach at ({inspectReport.fatalCoordinate[0]},{inspectReport.fatalCoordinate[1]})
                </div>
              )}
            </div>

            <div>
              <h4 className="font-display font-bold text-sm text-stone-100 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                COMPLETE REASONING TRACE LOG ({inspectReport.reasoningLog.length} STEPS):
              </h4>

              <div className="max-h-[28rem] overflow-y-auto space-y-2 p-3 rounded-lg bg-[#151915] border border-stone-500/25 font-mono-hud text-xs">
                {inspectReport.reasoningLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded bg-[#252a24] border border-stone-400/15 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-400 font-bold">
                        STEP {log.step} @({log.position[0]},{log.position[1]})
                      </span>
                      <span className="text-stone-400">{log.type}</span>
                    </div>
                    <div className="text-stone-100 font-sans text-xs leading-relaxed">{log.message}</div>
                    {log.details && (
                      <div className="text-[11px] text-stone-300 italic font-mono-hud leading-relaxed">
                        ↳ {log.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button variant="slate" size="sm" onClick={() => setInspectReport(null)}>
                Close Trace
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
