import React, { useState, useEffect, useRef } from 'react';
import {
  SimulationState,
  generateSolvableEnvironment,
  createSimulationState,
  executeSimulationStep,
  DEFAULT_GRID_SIZE,
  MIN_GRID_SIZE,
  MAX_GRID_SIZE,
  MIN_HAZARD_COUNT,
  MAX_HAZARD_COUNT,
} from '../simulation/logic';
import { sectorMemoryRegistry } from '../simulation/sectorMemory';
import { missionStore } from '../storage/missionStore';
import { stateStore } from '../storage/stateStore';
import { RobotUnit, MissionReport, SectorMemory, GroundTruth, MissionWorkspace, UserRole } from '../types';
import { TacticalGrid } from '../components/grid/TacticalGrid';
import { ReasoningLog } from '../components/hud/ReasoningLog';
import { TelemetryPanel } from '../components/hud/TelemetryPanel';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Slider } from '../components/ui/Slider';
import { Modal } from '../components/ui/Modal';
import {
  Play,
  Pause,
  StepForward,
  FastForward,
  RotateCcw,
  Rocket,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Plus,
  FolderOpen,
} from 'lucide-react';

interface MissionControlPageProps {
  initialSector?: string;
  initialRobotId?: string;
  userRole: UserRole;
}

export const MissionControlPage: React.FC<MissionControlPageProps> = ({
  initialSector,
  initialRobotId,
  userRole,
}) => {
  const isCommandAdmin = userRole === 'COMMAND_ADMIN';
  // Setup State
  const [missionName, setMissionName] = useState<string>('');
  const [sectorName, setSectorName] = useState<string>(initialSector || 'SECTOR-ALPHA');
  const [fleet, setFleet] = useState<RobotUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [activeMemory, setActiveMemory] = useState<SectorMemory | null>(null);
  const [gridSize, setGridSize] = useState<number>(DEFAULT_GRID_SIZE);
  const [survivorCount, setSurvivorCount] = useState<number>(1);
  const [missions, setMissions] = useState<MissionWorkspace[]>(() => (
    isCommandAdmin ? missionStore.getAll() : []
  ));
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [freshMissionRequested, setFreshMissionRequested] = useState<boolean>(false);
  const [missionDeploymentId, setMissionDeploymentId] = useState<string | null>(null);
  const [showMissionSetup, setShowMissionSetup] = useState<boolean>(
    Boolean(initialSector || initialRobotId)
  );

  // Active Simulation State
  const [isMissionActive, setIsMissionActive] = useState<boolean>(false);
  const [groundTruth, setGroundTruth] = useState<GroundTruth | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [activeUnit, setActiveUnit] = useState<RobotUnit | null>(null);

  // Playback Controls
  const [autoRunning, setAutoRunning] = useState<boolean>(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState<number>(300);
  const [commandPeek, setCommandPeek] = useState<boolean>(false);

  // Outcome Summary Modal
  const [showOutcomeModal, setShowOutcomeModal] = useState<boolean>(false);

  // Auto-run interval timer ref
  const timerRef = useRef<number | null>(null);

  // Load Fleet & Sector Memory on Mount
  useEffect(() => {
    const updateData = () => {
      const units = stateStore.getFleet();
      setFleet(units);

      // Default to initialRobotId or first standby unit
      const standbyUnits = units.filter((u) => u.status === 'STANDBY');
      if (initialRobotId && units.some((u) => u.id === initialRobotId && u.status === 'STANDBY')) {
        setSelectedUnitId(initialRobotId);
      } else if (standbyUnits.length > 0 && !selectedUnitId) {
        setSelectedUnitId(standbyUnits[0].id);
      }
    };

    updateData();
    const unsubscribe = stateStore.subscribe(updateData);
    return () => unsubscribe();
  }, [initialRobotId]);

  useEffect(() => {
    if (!isCommandAdmin) {
      setMissions([]);
      setSelectedMissionId(null);
      setActiveMissionId(null);
    } else {
      setMissions(missionStore.getAll());
    }
  }, [isCommandAdmin]);

  // Check sector memory whenever sectorName changes
  useEffect(() => {
    if (sectorName.trim()) {
      const mem = sectorMemoryRegistry.getSectorMemory(sectorName);
      setActiveMemory(mem);
    } else {
      setActiveMemory(null);
    }
  }, [sectorName]);

  // Auto-run step effect
  useEffect(() => {
    if (autoRunning && isMissionActive && simulationState?.status === 'IN_PROGRESS') {
      timerRef.current = window.setTimeout(() => {
        handleStepForward();
      }, playbackSpeedMs);
    } else if (simulationState && simulationState.status !== 'IN_PROGRESS') {
      setAutoRunning(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoRunning, simulationState, playbackSpeedMs, isMissionActive]);

  // Handle Mission Deployment
  const handleDeployMission = () => {
    if (!selectedUnitId) return;

    const unit = stateStore.getUnitById(selectedUnitId);
    if (!unit || unit.status !== 'STANDBY') return;

    // 1. Determine environment layout:
    // If sector memory exists from a prior fallen unit, reuse EXACT ground truth!
    let env: GroundTruth;
    let mission = selectedMissionId ? missionStore.getById(selectedMissionId) : null;
    const storedMemory = sectorMemoryRegistry.getSectorMemory(sectorName);
    const existingMemory = !freshMissionRequested && storedMemory &&
      storedMemory.groundTruth.gridSize === gridSize &&
      storedMemory.groundTruth.survivors.length === survivorCount
      ? storedMemory
      : null;

    if (mission) {
      env = mission.groundTruth;
      setActiveMemory(existingMemory);
    } else if (existingMemory) {
      env = existingMemory.groundTruth;
      setActiveMemory(existingMemory);
    } else {
      env = generateSolvableEnvironment(gridSize, survivorCount);
      setActiveMemory(null);
    }

    if (!mission) {
      mission = missionStore.create(missionName.trim() || `Mission ${new Date().toLocaleDateString()}`, sectorName, env);
      setSelectedMissionId(mission.id);
      setMissions(missionStore.getAll());
    }
    setFreshMissionRequested(false);
    setActiveMissionId(mission.id);

    // 2. Initialize robot simulation state with inherited memory if available
    const initialState = createSimulationState(existingMemory, env.gridSize);

    setGroundTruth(env);
    setSimulationState(initialState);
    setActiveUnit(unit);
    setIsMissionActive(true);
    setShowMissionSetup(false);
    setAutoRunning(false);
    const deploymentId = `deployment-${Date.now()}`;
    setMissionDeploymentId(deploymentId);
    missionStore.addDeployment(mission.id, {
      id: deploymentId,
      unitId: unit.id,
      unitCallsign: unit.callsign,
      startedAt: new Date().toISOString(),
      outcome: 'IN_PROGRESS',
    });
    setMissions(missionStore.getAll());

    // Update unit status in roster
    stateStore.updateUnitStatus(unit.id, 'DEPLOYED', sectorName);
  };

  // Handle Atomic Step Forward
  const handleStepForward = () => {
    if (!simulationState || !groundTruth || simulationState.status !== 'IN_PROGRESS') return;

    const nextState = executeSimulationStep(simulationState, groundTruth);
    setSimulationState(nextState);

    // Check for mission conclusion
    if (nextState.status !== 'IN_PROGRESS') {
      setAutoRunning(false);
      handleMissionConcluded(nextState);
    }
  };

  // Fast forward to end of simulation
  const handleFastFinish = () => {
    if (!simulationState || !groundTruth || simulationState.status !== 'IN_PROGRESS') return;

    let curr = simulationState;
    let guard = 0;
    while (curr.status === 'IN_PROGRESS' && guard < 250) {
      curr = executeSimulationStep(curr, groundTruth);
      guard++;
    }

    setSimulationState(curr);
    setAutoRunning(false);
    handleMissionConcluded(curr);
  };

  // Handle Mission Conclusion (Record Incident, Sector Memory, Unit Roster)
  const handleMissionConcluded = (finalState: SimulationState) => {
    if (!activeUnit || !groundTruth) return;

    const isSuccess = finalState.status === 'SUCCESS_EXTRACTED';
    const isDestroyed = finalState.status === 'UNIT_DESTROYED';
    const isNoSurvivor = finalState.status === 'NO_SURVIVOR_FOUND';

    // 1. Update Unit Status in Roster
    if (isDestroyed) {
      stateStore.updateUnitStatus(activeUnit.id, 'DESTROYED', sectorName);
    } else {
      stateStore.updateUnitStatus(activeUnit.id, 'STANDBY', sectorName);
    }

    // 2. Manage Sector Memory:
    // Core Promise: If destroyed, save sector memory so next deployment reuses layout & inherits intelligence!
    // If success or no survivor, clear sector memory so next deployment generates fresh layout!
    if (isDestroyed && finalState.fatalBreach) {
      const confirmedObj: Record<string, any> = {};
      finalState.confirmedHazards.forEach((val, key) => {
        confirmedObj[key] = val;
      });

      sectorMemoryRegistry.recordSectorCasualty(
        sectorName,
        groundTruth,
        Array.from(finalState.provenSafe),
        confirmedObj,
        Array.from(finalState.survivorsLocated),
        activeUnit.id,
        finalState.fatalBreach.position
      );
    } else if (isSuccess || isNoSurvivor) {
      sectorMemoryRegistry.clearSectorMemory(sectorName);
    }

    // 3. Persist Mission Report
    const report: MissionReport = {
      id: `rep-${Date.now()}`,
      timestamp: new Date().toISOString(),
      missionId: activeMissionId || undefined,
      missionName: missionName || undefined,
      sectorName,
      unitId: activeUnit.id,
      unitCallsign: activeUnit.callsign,
      outcome: finalState.status,
      totalSteps: finalState.step,
      cellsExploredCount: finalState.visited.size,
      survivorRescued: finalState.survivorRescued,
      hazardEncountered: finalState.fatalBreach?.hazardType,
      fatalCoordinate: finalState.fatalBreach?.position,
      inheritedMemoryUsed: !!activeMemory,
      survivorsFound: finalState.survivorsLocated.size,
      survivorCount: groundTruth.survivors.length,
      gridSize: groundTruth.gridSize,
      hazardCount: Object.keys(groundTruth.hazards).length,
      reasoningLog: finalState.reasoningLog,
    };

    stateStore.addReport(report);
    if (activeMissionId && missionDeploymentId) {
      missionStore.completeDeployment(activeMissionId, missionDeploymentId, finalState.status, report);
      setMissions(missionStore.getAll());
    }
    setShowOutcomeModal(true);
  };

  const handleNewMission = () => {
    if (isMissionActive) return;
    setSelectedMissionId(null);
    setActiveMissionId(null);
    setFreshMissionRequested(true);
    setMissionDeploymentId(null);
    setActiveMemory(null);
    setGroundTruth(null);
    setSimulationState(null);
    setActiveUnit(null);
    setIsMissionActive(false);
    setShowOutcomeModal(false);
    setSectorName(initialSector || 'SECTOR-ALPHA');
    setMissionName('');
    setGridSize(DEFAULT_GRID_SIZE);
    setSurvivorCount(1);
    setShowMissionSetup(true);
  };

  const handleSelectMission = (mission: MissionWorkspace) => {
    if (isMissionActive || !isCommandAdmin) return;
    setSelectedMissionId(mission.id);
    setMissionName(mission.name);
    setSectorName(mission.sectorName);
    setGridSize(mission.gridSize);
    setSurvivorCount(mission.survivorCount);
    setActiveMemory(sectorMemoryRegistry.getSectorMemory(mission.sectorName));
    setFreshMissionRequested(false);
    setShowMissionSetup(true);
  };

  const selectedMission = selectedMissionId ? missionStore.getById(selectedMissionId) : null;

  // Reset / Abort Mission
  const handleResetMission = () => {
    if (activeUnit && isMissionActive && simulationState?.status === 'IN_PROGRESS') {
      stateStore.updateUnitStatus(activeUnit.id, 'STANDBY');
    }
    setAutoRunning(false);
    setIsMissionActive(false);
    setSimulationState(null);
    setGroundTruth(null);
    setActiveUnit(null);
    setShowOutcomeModal(false);
    setShowMissionSetup(true);
  };

  const standbyUnits = fleet.filter((u) => u.status === 'STANDBY');
  const deployedUnits = fleet.filter((u) => u.status === 'DEPLOYED').length;
  const destroyedUnits = fleet.filter((u) => u.status === 'DESTROYED').length;

  return (
    <div className="space-y-7">
      {!isMissionActive && (
        <>
        <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-5 items-stretch">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-900/95 via-slate-950/90 to-cyan-950/30 p-6 sm:p-8 shadow-2xl">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="teal" dot>Command network online</Badge>
                <span className="font-mono-hud text-[11px] uppercase tracking-widest text-slate-500">
                  Live response orchestration
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white">
                Plan the mission.<br />
                <span className="text-amber-400">Protect the perimeter.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-slate-300">
                Dispatch an autonomous unit into a configurable disaster zone. Every move is explained
                through local sensing, propositional logic, risk scoring, and safe extraction planning.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-mono-hud text-slate-400">
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">01 / Local sensors</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">02 / Logic deductions</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">03 / Zero-risk return</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 sm:p-5 border-teal-500/25 bg-teal-950/20">
              <div className="text-[11px] font-mono-hud uppercase tracking-wider text-teal-400">Ready units</div>
              <div className="mt-2 font-display text-3xl font-bold text-teal-200">{standbyUnits.length}</div>
              <div className="mt-1 text-xs text-slate-400">Available to dispatch</div>
            </Card>
            <Card className="p-4 sm:p-5 border-amber-500/25 bg-amber-950/20">
              <div className="text-[11px] font-mono-hud uppercase tracking-wider text-amber-400">In field</div>
              <div className="mt-2 font-display text-3xl font-bold text-amber-200">{deployedUnits}</div>
              <div className="mt-1 text-xs text-slate-400">Active deployments</div>
            </Card>
            <Card className="p-4 sm:p-5 border-red-500/25 bg-red-950/20">
              <div className="text-[11px] font-mono-hud uppercase tracking-wider text-red-400">Casualties</div>
              <div className="mt-2 font-display text-3xl font-bold text-red-200">{destroyedUnits}</div>
              <div className="mt-1 text-xs text-slate-400">Awaiting recommission</div>
            </Card>
            <Card className="p-4 sm:p-5 border-cyan-500/25 bg-cyan-950/20">
              <div className="text-[11px] font-mono-hud uppercase tracking-wider text-cyan-400">Grid</div>
              <div className="mt-2 font-display text-3xl font-bold text-cyan-200">{gridSize}×{gridSize}</div>
              <div className="mt-1 text-xs text-slate-400">
                {MIN_HAZARD_COUNT}–{MAX_HAZARD_COUNT} random hazards · {survivorCount} survivor{survivorCount === 1 ? '' : 's'}
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-100">
                {isCommandAdmin ? 'MISSION WORKSPACES' : 'NEW MISSION'}
              </h2>
              <p className="text-xs text-slate-400">
                {isCommandAdmin
                  ? 'Each mission keeps its sector, configuration, layout, and deployment history.'
                  : 'Create and deploy a new autonomous rescue mission.'}
              </p>
            </div>
            <Button variant="amber" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleNewMission}>
              New Mission
            </Button>
          </div>
          {isCommandAdmin && missions.length === 0 ? (
            <Card className="p-5 border border-dashed border-slate-700 text-sm text-slate-400">
              No saved missions yet. Configure a mission below and deploy a RescueBot to create one.
            </Card>
          ) : isCommandAdmin ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {missions.map((mission) => (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => handleSelectMission(mission)}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    selectedMissionId === mission.id
                      ? 'border-amber-400/60 bg-amber-950/30'
                      : 'border-white/10 bg-slate-950/50 hover:border-cyan-400/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display font-bold text-amber-200">{mission.name}</div>
                      <div className="text-xs text-slate-300 mt-0.5">{mission.sectorName}</div>
                      <div className="text-[11px] text-slate-500 font-mono-hud mt-1">
                        {mission.gridSize}×{mission.gridSize} · {mission.hazardCount} hazards · {mission.survivorCount} survivors
                      </div>
                    </div>
                    <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono-hud">
                    <span className="text-slate-400">{mission.deployments.length} deployment{mission.deployments.length === 1 ? '' : 's'}</span>
                    <span className={mission.status === 'UNIT_DESTROYED' ? 'text-red-300' : mission.status === 'SUCCESS_EXTRACTED' ? 'text-teal-300' : 'text-amber-300'}>
                      {mission.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          {isCommandAdmin && selectedMission && (
            <Card className="border border-cyan-500/30 bg-cyan-950/10">
              <CardHeader className="bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-cyan-300">MISSION INFORMATION: {selectedMission.name}</CardTitle>
                  <p className="mt-1 text-xs text-slate-400">
                    Sector: {selectedMission.sectorName}. Its layout and configuration are preserved for redeployment.
                  </p>
                </div>
                <Badge variant={selectedMission.status === 'UNIT_DESTROYED' ? 'coral' : selectedMission.status === 'SUCCESS_EXTRACTED' ? 'teal' : 'amber'}>
                  {selectedMission.status.replaceAll('_', ' ')}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono-hud">
                  <div className="rounded-lg bg-slate-950/70 border border-white/5 p-3">
                    <div className="text-slate-500">GRID</div>
                    <div className="mt-1 text-cyan-200 font-bold">{selectedMission.gridSize}×{selectedMission.gridSize}</div>
                  </div>
                  <div className="rounded-lg bg-slate-950/70 border border-white/5 p-3">
                    <div className="text-slate-500">HAZARDS</div>
                    <div className="mt-1 text-red-200 font-bold">{selectedMission.hazardCount}</div>
                  </div>
                  <div className="rounded-lg bg-slate-950/70 border border-white/5 p-3">
                    <div className="text-slate-500">SURVIVORS</div>
                    <div className="mt-1 text-yellow-200 font-bold">{selectedMission.survivorCount}</div>
                  </div>
                  <div className="rounded-lg bg-slate-950/70 border border-white/5 p-3">
                    <div className="text-slate-500">DEPLOYMENTS</div>
                    <div className="mt-1 text-amber-200 font-bold">{selectedMission.deployments.length}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono-hud uppercase tracking-wider text-slate-500 mb-2">Deployment history</div>
                  {selectedMission.deployments.length === 0 ? (
                    <p className="text-xs text-slate-400">No deployment has been started for this mission yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedMission.deployments.map((deployment) => (
                        <div key={deployment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-950/70 border border-white/5 p-3 text-xs">
                          <span className="text-slate-200 font-semibold">{deployment.unitId} · {deployment.unitCallsign}</span>
                          <span className="text-slate-400">{deployment.outcome.replaceAll('_', ' ')}</span>
                          <span className="text-slate-500">{new Date(deployment.startedAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="slate"
                    size="sm"
                    onClick={() => {
                      setSelectedMissionId(null);
                      setShowMissionSetup(false);
                    }}
                  >
                    Close Information
                  </Button>
                  <Button
                    variant="amber"
                    size="sm"
                    icon={<Rocket className="w-4 h-4" />}
                    onClick={() => {
                      setShowMissionSetup(true);
                      window.requestAnimationFrame(() => {
                        document.getElementById('mission-deployment-setup')?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      });
                    }}
                  >
                    Redeploy Another Bot
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
        </>
      )}

      {/* Sector Memory Inheritance Banner */}
      {activeMemory && (
        <Alert
          variant="warning"
          title={`INHERITED SECTOR MEMORY DETECTED: ${activeMemory.sectorName}`}
          className="border-amber-500/50 bg-amber-950/40"
          action={
            <Badge variant="amber" dot>
              Memory Active
            </Badge>
          }
        >
          A previous unit (<span className="font-bold text-amber-300">{activeMemory.failedByUnitId}</span>) was destroyed at coordinate{' '}
          <span className="font-bold text-red-300">
            ({activeMemory.casualtyPosition[0]},{activeMemory.casualtyPosition[1]})
          </span>. 
          Deploying here will <strong className="text-amber-200">reuse the exact layout</strong> and pre-populate{' '}
          <strong className="text-teal-300">{activeMemory.provenSafeKeys.length} proven-safe sectors</strong>. 
          The replacement unit will visibly steer clear of the fatal hazard!
        </Alert>
      )}


      {/* Deployment Bar (When not active) */}
      {!isMissionActive && showMissionSetup && (
        <Card id="mission-deployment-setup" className="border border-white/10 shadow-xl" glow>
          <CardHeader className="bg-slate-900/80">
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-amber-400" />
              DEPLOY AUTONOMOUS RESCUE MISSION
            </CardTitle>
            <Badge variant="slate">Mission Setup Protocol</Badge>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1.15fr_1.25fr_0.7fr_0.7fr_0.7fr_auto] gap-5 items-end">
              <div>
                <label className="block text-xs font-mono-hud font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Mission Name
                </label>
                <Input
                  value={missionName}
                  onChange={(e) => setMissionName(e.target.value)}
                  disabled={!!selectedMissionId}
                  placeholder="e.g. North Wing Rescue"
                />
              </div>
              <div>
                <label className="block text-xs font-mono-hud font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Target Sector Designation
                </label>
                <Input
                  value={sectorName}
                  onChange={(e) => setSectorName(e.target.value)}
                  disabled={!!selectedMissionId}
                  placeholder="e.g. SECTOR-ALPHA, ZONE-9"
                  className="font-bold uppercase tracking-wider"
                />
                <div className="mt-2 flex items-center gap-2 text-[11px] font-mono-hud text-slate-500">
                  <span>Quick Sectors:</span>
                  {['SECTOR-ALPHA', 'SECTOR-BETA', 'SECTOR-GAMMA'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSectorName(s)}
                      className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      {s.replace('SECTOR-', '')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono-hud font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Standby Unit ({standbyUnits.length} Available)
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full bg-slate-950/80 text-slate-100 font-mono-hud text-xs md:text-sm px-3.5 py-2.5 rounded-md border border-slate-700/60 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {standbyUnits.length === 0 ? (
                    <option value="">No standby units available (all deployed/destroyed)</option>
                  ) : (
                    standbyUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.id} - {u.callsign} ({u.team})
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1.5 text-[11px] font-mono-hud text-slate-500">
                  Unit will navigate with local sensors and propositional logic only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono-hud font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Grid Size
                </label>
                <select
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  disabled={!!selectedMissionId}
                  className="w-full bg-slate-950/80 text-slate-100 font-mono-hud text-sm px-3.5 py-2.5 rounded-md border border-slate-700/60 focus:border-amber-400 focus:outline-none"
                >
                  {Array.from({ length: MAX_GRID_SIZE - MIN_GRID_SIZE + 1 }, (_, index) => {
                    const size = MIN_GRID_SIZE + index;
                    return <option key={size} value={size}>{size}×{size}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono-hud font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Survivors
                </label>
                <select
                  value={survivorCount}
                  onChange={(e) => setSurvivorCount(Number(e.target.value))}
                  disabled={!!selectedMissionId}
                  className="w-full bg-slate-950/80 text-slate-100 font-mono-hud text-sm px-3.5 py-2.5 rounded-md border border-slate-700/60 focus:border-amber-400 focus:outline-none"
                >
                  {Array.from({ length: 5 }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>

              <div>
                <Button
                  variant="amber"
                  size="lg"
                  className="w-full h-[44px]"
                  icon={<Rocket className="w-4 h-4" />}
                  onClick={handleDeployMission}
                  disabled={standbyUnits.length === 0 || !selectedUnitId || !sectorName.trim() || (!selectedMissionId && !missionName.trim())}
                >
                  DEPLOY RESCUEBOT
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Mission Control Layout: 3 Columns (Hero Grid, Log Stream, Telemetry) */}
      {isMissionActive && simulationState && groundTruth && activeUnit && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Hero Column: Configurable tactical building scan */}
          <div className="lg:col-span-5 space-y-4">
            <TacticalGrid
              simulationState={simulationState}
              groundTruth={groundTruth}
              commandPeek={commandPeek}
              onToggleCommandPeek={() => setCommandPeek(!commandPeek)}
            />

            <Card className="border border-amber-500/30 glass-panel-amber">
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="teal" dot>MISSION ACTIVE</Badge>
                    <div>
                      <div className="font-display font-bold text-amber-200">{missionName || 'Active mission'}</div>
                      <div className="font-mono-hud text-[11px] text-slate-400">
                        {sectorName} · {activeUnit.id} · {activeUnit.callsign}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono-hud text-[11px] uppercase tracking-wider text-slate-500">
                    Mission controls
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    variant="slate"
                    size="sm"
                    className="w-full"
                    icon={<StepForward className="w-4 h-4 text-cyan-400" />}
                    onClick={handleStepForward}
                    disabled={simulationState.status !== 'IN_PROGRESS' || autoRunning}
                  >
                    Step Forward
                  </Button>
                  <Button
                    variant={autoRunning ? 'coral' : 'amber'}
                    size="sm"
                    className="w-full"
                    icon={autoRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    onClick={() => setAutoRunning(!autoRunning)}
                    disabled={simulationState.status !== 'IN_PROGRESS'}
                  >
                    {autoRunning ? 'Pause Stream' : 'Auto-Run'}
                  </Button>
                  <Button
                    variant="slate"
                    size="sm"
                    className="w-full"
                    icon={<FastForward className="w-4 h-4 text-amber-400" />}
                    onClick={handleFastFinish}
                    disabled={simulationState.status !== 'IN_PROGRESS'}
                  >
                    Fast Finish
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    icon={<RotateCcw className="w-4 h-4 text-slate-400" />}
                    onClick={handleResetMission}
                  >
                    Abort & Return
                  </Button>
                </div>

                <Slider
                  min="50"
                  max="1000"
                  step="50"
                  value={playbackSpeedMs}
                  onChange={(e) => setPlaybackSpeedMs(Number(e.target.value))}
                  valueDisplay={`${playbackSpeedMs}ms`}
                  label="Auto-run stream delay"
                />
              </div>
            </Card>
          </div>

          {/* Middle Column: Live AI Propositional Reasoning Log */}
          <div className="lg:col-span-4 h-full">
            <ReasoningLog entries={simulationState.reasoningLog} />
          </div>

          {/* Right Column: Sensor Telemetry & Propositional Clauses HUD */}
          <div className="lg:col-span-3 space-y-4">
            <TelemetryPanel
              simulationState={simulationState}
              sectorName={sectorName}
              unitCallsign={activeUnit.callsign}
            />
          </div>
        </div>
      )}

      {/* Mission Outcome Summary Modal */}
      {simulationState && (
        <Modal
          isOpen={showOutcomeModal}
          onClose={() => setShowOutcomeModal(false)}
          title="MISSION DEBRIEF & INCIDENT REPORT"
          subtitle={`${missionName || 'Mission'} | Sector: ${sectorName} | Unit: ${activeUnit?.id}`}
        >
          <div className="space-y-5">
            {simulationState.status === 'SUCCESS_EXTRACTED' && (
              <div className="p-4 rounded-xl bg-teal-950/60 border border-teal-500/60 text-teal-100 flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-display font-bold text-base text-teal-300">
                    SURVIVOR SUCCESSFULLY EXTRACTED
                  </h4>
                  <p className="font-sans text-xs text-teal-200 mt-1">
                    The autonomous robot successfully located the survivor, computed an optimal zero-risk
                    return route via BFS over proven safe cells, and returned safely to extraction base (0,0).
                  </p>
                </div>
              </div>
            )}

            {simulationState.status === 'UNIT_DESTROYED' && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/60 text-red-100 flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-display font-bold text-base text-red-300">
                    UNIT CASUALTY REPORTED (REAL RISK OCCURRED)
                  </h4>
                  <p className="font-sans text-xs text-red-200 mt-1">
                    The unit took a calculated risk and breached an undetected{' '}
                    <strong className="text-red-300">
                      {simulationState.fatalBreach?.hazardType.replace('_', ' ')}
                    </strong>{' '}
                    at ({simulationState.fatalBreach?.position[0]},{simulationState.fatalBreach?.position[1]}).
                    The unit status has been transitioned to <span className="underline font-bold">DESTROYED</span>.
                  </p>
                  <p className="font-mono-hud text-[11px] text-amber-300 mt-2">
                    ⚡ Sector memory has been saved! The next unit deployed to "{sectorName}" will inherit this layout and avoid this breach point.
                  </p>
                </div>
              </div>
            )}

            {simulationState.status === 'NO_SURVIVOR_FOUND' && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 flex items-start gap-3">
                <HelpCircle className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-display font-bold text-base text-cyan-300">
                    EXHAUSTIVE SEARCH CONCLUDED (NO SURVIVOR FOUND)
                  </h4>
                  <p className="font-sans text-xs text-slate-300 mt-1">
                    All reachable safe and risk-viable perimeters were systematically explored. The unit
                    safely withdrew via BFS without casualty, concluding that no survivor was reachable in this zone.
                  </p>
                </div>
              </div>
            )}

            {/* Mission Stats Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center font-mono-hud text-xs">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-white/5">
                <div className="text-slate-500 text-[10px] uppercase">Total Steps</div>
                <div className="text-base font-bold text-slate-200">{simulationState.step}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-white/5">
                <div className="text-slate-500 text-[10px] uppercase">Cells Explored</div>
                <div className="text-base font-bold text-cyan-300">
                  {simulationState.visited.size} / {simulationState.gridSize * simulationState.gridSize}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-white/5">
                <div className="text-slate-500 text-[10px] uppercase">Hazards Confirmed</div>
                <div className="text-base font-bold text-amber-300">
                  {simulationState.confirmedHazards.size} / {groundTruth?.hazards ? Object.keys(groundTruth.hazards).length : 0}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                variant="slate"
                size="sm"
                onClick={() => setShowOutcomeModal(false)}
              >
                Close & Review Grid
              </Button>
              <Button
                variant="amber"
                size="sm"
                onClick={handleResetMission}
              >
                Return to Deploy Console
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
