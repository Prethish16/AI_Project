/**
 * RescueBot Command - Core Data Types
 * Classical AI Simulation Platform
 */

export type Coordinate = [number, number];
export type CellKey = string; // format: "r,c"

export type HazardType = 'STRUCTURAL_COLLAPSE' | 'GAS_LEAK';

export interface GroundTruth {
  gridSize: number;
  hazards: Record<CellKey, HazardType>;
  survivors: Coordinate[];
}

export interface SensorReading {
  dangerSignal: boolean; // Ambiguous: danger is present among 4-neighbors, but NOT which neighbor
  isSurvivor: boolean;
  breachedHazard: HazardType | null; // Fatal: robot stepped directly on a hazard
}

export type CellStatus = 
  | 'UNEXPLORED'
  | 'PROVEN_SAFE'
  | 'CANDIDATE_SUSPICIOUS'
  | 'CONFIRMED_HAZARD';

export type LogEntryType = 
  | 'OBSERVATION'
  | 'DEDUCTION_SAFE'
  | 'DEDUCTION_HAZARD'
  | 'RISK_ASSESSMENT'
  | 'BACKTRACK'
  | 'SURVIVOR_FOUND'
  | 'EXTRACTION'
  | 'CASUALTY'
  | 'ABORT';

export interface ReasoningLogEntry {
  id: string;
  step: number;
  timestamp: number;
  position: Coordinate;
  type: LogEntryType;
  message: string;
  details?: string;
  activeClausesCount?: number;
}

export type MissionOutcome = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUCCESS_EXTRACTED'
  | 'NO_SURVIVOR_FOUND'
  | 'UNIT_DESTROYED';

export type RobotStatus = 'STANDBY' | 'DEPLOYED' | 'DESTROYED' | 'MAINTENANCE';

export interface RobotUnit {
  id: string;
  callsign: string;
  team: string;
  status: RobotStatus;
  missionsCompleted: number;
  lastMissionSector?: string;
  registeredAt: string;
}

export interface CandidateClause {
  id: string;
  origin: Coordinate;
  candidates: Set<CellKey>;
}

export interface SectorMemory {
  sectorName: string;
  groundTruth: GroundTruth;
  provenSafeKeys: string[];
  confirmedHazardKeys: Record<string, HazardType>;
  locatedSurvivorKeys: string[];
  failedByUnitId: string;
  timestamp: string;
  casualtyPosition: Coordinate;
}

export interface MissionReport {
  id: string;
  timestamp: string;
  missionId?: string;
  missionName?: string;
  sectorName: string;
  unitId: string;
  unitCallsign: string;
  outcome: MissionOutcome;
  totalSteps: number;
  cellsExploredCount: number;
  survivorRescued: boolean;
  survivorsFound: number;
  survivorCount: number;
  gridSize: number;
  hazardCount: number;
  hazardEncountered?: HazardType;
  fatalCoordinate?: Coordinate;
  inheritedMemoryUsed: boolean;
  reasoningLog: ReasoningLogEntry[];
}

export type MissionWorkspaceStatus = 'PLANNING' | MissionOutcome;

export interface MissionDeployment {
  id: string;
  unitId: string;
  unitCallsign: string;
  startedAt: string;
  completedAt?: string;
  outcome: MissionOutcome;
  reportId?: string;
}

export interface MissionWorkspace {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  sectorName: string;
  gridSize: number;
  hazardCount: number;
  survivorCount: number;
  groundTruth: GroundTruth;
  status: MissionWorkspaceStatus;
  deployments: MissionDeployment[];
  reports: MissionReport[];
}

export type UserRole = 'RESPONDER' | 'COMMAND_ADMIN';

export interface UserProfile {
  id: string;
  username: string;
  callsign: string;
  role: UserRole;
  team: string;
  badgeNumber: string;
}

export interface BatchTestResult {
  totalRuns: number;
  successfulExtractions: number;
  unitsDestroyed: number;
  noSurvivorOutcomes: number;
  falseHazardAccusations: number;
  timedOutRuns: number;
  solvabilityViolations: number;
  avgSteps: number;
  executionTimeMs: number;
}
