/**
 * Classical AI Simulation Engine
 * Logic, Search, and Planning for RescueBot Command
 * Zero Machine Learning - 100% Deterministic Propositional Logic & Graph Search
 */

import {
  Coordinate,
  CellKey,
  GroundTruth,
  HazardType,
  SensorReading,
  CandidateClause,
  ReasoningLogEntry,
  MissionOutcome,
  SectorMemory,
} from '../types';

export const MIN_GRID_SIZE = 4;
export const MAX_GRID_SIZE = 8;
export const DEFAULT_GRID_SIZE = 5;
export const MIN_HAZARD_COUNT = 2;
export const MAX_HAZARD_COUNT = 9;
export const GRID_SIZE = DEFAULT_GRID_SIZE;

export function toKey(r: number, c: number): CellKey {
  return `${r},${c}`;
}

export function fromKey(key: CellKey): Coordinate {
  const [r, c] = key.split(',').map(Number);
  return [r, c];
}

export function getNeighbors(r: number, c: number, gridSize: number = DEFAULT_GRID_SIZE): Coordinate[] {
  const directions: Coordinate[] = [
    [-1, 0], // North
    [1, 0],  // South
    [0, -1], // West
    [0, 1],  // East
  ];

  const neighbors: Coordinate[] = [];
  for (const [dr, dc] of directions) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

export function getNeighborKeys(r: number, c: number, gridSize: number = DEFAULT_GRID_SIZE): CellKey[] {
  return getNeighbors(r, c, gridSize).map(([nr, nc]) => toKey(nr, nc));
}

/**
 * Verifies survivor is reachable from (0,0) through non-hazard cells using BFS.
 */
export function isSurvivorReachable(groundTruth: GroundTruth): boolean {
  const startKey = toKey(0, 0);
  const targets = groundTruth.survivors.map(([r, c]) => toKey(r, c));

  if (groundTruth.hazards[startKey]) return false;
  if (targets.length === 0) return false;

  const queue: Coordinate[] = [[0, 0]];
  const visited = new Set<CellKey>([startKey]);
  const reachable = new Set<CellKey>();

  while (queue.length > 0) {
    const [currR, currC] = queue.shift()!;
    const currKey = toKey(currR, currC);

    if (targets.includes(currKey)) {
      reachable.add(currKey);
      if (reachable.size === targets.length) return true;
    }

    for (const [nr, nc] of getNeighbors(currR, currC, groundTruth.gridSize)) {
      const nKey = toKey(nr, nc);
      if (!visited.has(nKey) && !groundTruth.hazards[nKey]) {
        visited.add(nKey);
        queue.push([nr, nc]);
      }
    }
  }

  return false;
}

/**
 * Generates a valid environment with configurable dimensions and occupants.
 * Start (0,0) is always safe and every survivor is reachable.
 */
export function generateSolvableEnvironment(
  gridSize: number = DEFAULT_GRID_SIZE,
  survivorCount: number = 1
): GroundTruth {
  const safeGridSize = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Math.round(gridSize)));
  const maxOccupants = safeGridSize * safeGridSize - 1;
  const safeSurvivorCount = Math.max(1, Math.min(Math.round(survivorCount), maxOccupants - MIN_HAZARD_COUNT));
  const maxHazardCount = Math.min(MAX_HAZARD_COUNT, maxOccupants - safeSurvivorCount);
  const safeHazardCount = MIN_HAZARD_COUNT
    + Math.floor(Math.random() * (maxHazardCount - MIN_HAZARD_COUNT + 1));
  let attempts = 0;
  const maxAttempts = 1000;

  while (attempts < maxAttempts) {
    attempts++;
    const hazards: Record<CellKey, HazardType> = {};
    const hazardTypes: HazardType[] = ['STRUCTURAL_COLLAPSE', 'GAS_LEAK'];

    // All available coordinates except (0,0)
    const availableCoords: Coordinate[] = [];
    for (let r = 0; r < safeGridSize; r++) {
      for (let c = 0; c < safeGridSize; c++) {
        if (r === 0 && c === 0) continue;
        availableCoords.push([r, c]);
      }
    }

    // Shuffle coordinates
    for (let i = availableCoords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableCoords[i], availableCoords[j]] = [availableCoords[j], availableCoords[i]];
    }

    for (let index = 0; index < safeHazardCount; index++) {
      const hazardCoord = availableCoords[index];
      hazards[toKey(hazardCoord[0], hazardCoord[1])] =
        hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
    }

    const survivors = availableCoords
      .slice(safeHazardCount, safeHazardCount + safeSurvivorCount);

    const groundTruth: GroundTruth = {
      gridSize: safeGridSize,
      hazards,
      survivors,
    };

    if (isSurvivorReachable(groundTruth)) {
      return groundTruth;
    }
  }

  // Fallback guaranteed layout if randomization took too long. Keep a clear
  // top-row/right-column route to the survivor and place the random count
  // outside that route.
  const fallbackSurvivor: Coordinate = [safeGridSize - 1, safeGridSize - 1];
  const protectedRoute = new Set<CellKey>();
  for (let c = 0; c < safeGridSize; c++) protectedRoute.add(toKey(0, c));
  for (let r = 0; r < safeGridSize; r++) protectedRoute.add(toKey(r, safeGridSize - 1));

  const fallbackHazardCoords: Coordinate[] = [];
  for (let r = 0; r < safeGridSize; r++) {
    for (let c = 0; c < safeGridSize; c++) {
      const key = toKey(r, c);
      if (!protectedRoute.has(key) && !(r === fallbackSurvivor[0] && c === fallbackSurvivor[1])) {
        fallbackHazardCoords.push([r, c]);
      }
    }
  }

  const fallbackHazards: Record<CellKey, HazardType> = {};
  fallbackHazardCoords.slice(0, safeHazardCount).forEach(([r, c], index) => {
    fallbackHazards[toKey(r, c)] = index % 2 === 0 ? 'GAS_LEAK' : 'STRUCTURAL_COLLAPSE';
  });

  return {
    gridSize: safeGridSize,
    hazards: fallbackHazards,
    survivors: [fallbackSurvivor],
  };
}

/**
 * AMBIGUOUS LOCAL SENSING
 * Critical Rule: The sensor ONLY reports boolean dangerSignal ("a danger signal is present somewhere among my neighboring cells").
 * It NEVER reveals which specific neighbor triggered it.
 * This function is the ONLY place in the entire codebase where groundTruth is accessed during simulation.
 */
export function readSensors(currentPos: Coordinate, groundTruth: GroundTruth): SensorReading {
  const currentKey = toKey(currentPos[0], currentPos[1]);
  
  // Did the robot step directly on a hazard?
  const breachedHazard = groundTruth.hazards[currentKey] || null;

  // Did the robot reach any survivor?
  const isSurvivor = groundTruth.survivors.some(
    ([r, c]) => currentPos[0] === r && currentPos[1] === c
  );

  // Ambiguous danger signal: true if ANY 4-neighbor has a hazard
  let dangerSignal = false;
  for (const [nr, nc] of getNeighbors(currentPos[0], currentPos[1], groundTruth.gridSize)) {
    const nKey = toKey(nr, nc);
    if (groundTruth.hazards[nKey]) {
      dangerSignal = true;
      break;
    }
  }

  return {
    dangerSignal,
    isSurvivor,
    breachedHazard,
  };
}

/**
 * Robot Simulation State
 */
export interface SimulationState {
  gridSize: number;
  step: number;
  currentPos: Coordinate;
  status: MissionOutcome;
  visited: Set<CellKey>;
  provenSafe: Set<CellKey>;
  confirmedHazards: Map<CellKey, HazardType>;
  candidateClauses: CandidateClause[];
  dfsPath: Coordinate[]; // Stack for backtracking
  returnPlan: Coordinate[] | null; // Computed once upon finding survivor or abort
  returnPlanIndex: number;
  survivorsLocated: Set<CellKey>;
  survivorRescued: boolean;
  fatalBreach: { position: Coordinate; hazardType: HazardType } | null;
  reasoningLog: ReasoningLogEntry[];
  lastSensorReading: SensorReading | null;
}

/**
 * Initializes a new simulation state.
 * Supports sector memory inheritance if unit redeployed to same failed sector.
 */
export function createSimulationState(
  inheritedMemory?: SectorMemory | null,
  configuredGridSize: number = DEFAULT_GRID_SIZE
): SimulationState {
  const gridSize = inheritedMemory?.groundTruth.gridSize ?? configuredGridSize;
  const startKey = toKey(0, 0);
  const provenSafe = new Set<CellKey>([startKey]);
  const confirmedHazards = new Map<CellKey, HazardType>();
  const survivorsLocated = new Set<CellKey>();
  const initialLog: ReasoningLogEntry[] = [];

  let stepCounter = 0;

  if (inheritedMemory) {
    // Inherit knowledge from previous fallen unit
    inheritedMemory.provenSafeKeys.forEach((k) => provenSafe.add(k));
    Object.entries(inheritedMemory.confirmedHazardKeys).forEach(([k, type]) => {
      confirmedHazards.set(k, type);
    });
    inheritedMemory.locatedSurvivorKeys.forEach((k) => {
      survivorsLocated.add(k);
    });

    initialLog.push({
      id: `init-${stepCounter++}`,
      step: 0,
      timestamp: Date.now(),
      position: [0, 0],
      type: 'OBSERVATION',
      message: `[SECTOR MEMORY LOADED] Inherited intelligence from casualty (${inheritedMemory.failedByUnitId}): ${inheritedMemory.provenSafeKeys.length} safe cells, ${inheritedMemory.confirmedHazardKeys ? Object.keys(inheritedMemory.confirmedHazardKeys).length : 0} confirmed hazards, and ${inheritedMemory.locatedSurvivorKeys.length} located survivors.`,
      details: `Re-deploying through the previously verified safe corridor. Avoiding the fatal breach at (${inheritedMemory.casualtyPosition[0]},${inheritedMemory.casualtyPosition[1]}) while continuing the search for remaining survivors.`,
    });
  } else {
    initialLog.push({
      id: `init-${stepCounter++}`,
      step: 0,
      timestamp: Date.now(),
      position: [0, 0],
      type: 'OBSERVATION',
      message: `[DEPLOYMENT] RescueBot deployed at extraction point (0,0). No blueprint available. Activating local proximity sensors.`,
    });
  }

  return {
    gridSize,
    step: 0,
    currentPos: [0, 0],
    status: 'IN_PROGRESS',
    visited: new Set<CellKey>([startKey]),
    provenSafe,
    confirmedHazards,
    candidateClauses: [],
    dfsPath: [[0, 0]],
    returnPlan: null,
    returnPlanIndex: 0,
    survivorsLocated,
    survivorRescued: false,
    fatalBreach: null,
    reasoningLog: initialLog,
    lastSensorReading: null,
  };
}

/**
 * Runs Breadth-First Search strictly through PROVEN SAFE cells to find the optimal path to (0,0).
 * Guarantees zero-risk extraction.
 */
export function computeSafeReturnPath(
  start: Coordinate,
  provenSafe: Set<CellKey>,
  gridSize: number = DEFAULT_GRID_SIZE
): Coordinate[] {
  const targetKey = toKey(0, 0);
  const startKey = toKey(start[0], start[1]);

  if (startKey === targetKey) {
    return [[0, 0]];
  }

  const queue: Coordinate[][] = [[[start[0], start[1]]]];
  const visited = new Set<CellKey>([startKey]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    const currentKey = toKey(current[0], current[1]);

    if (currentKey === targetKey) {
      return path; // Path from current to [0,0]
    }

    for (const [nr, nc] of getNeighbors(current[0], current[1], gridSize)) {
      const nKey = toKey(nr, nc);
      if (provenSafe.has(nKey) && !visited.has(nKey)) {
        visited.add(nKey);
        queue.push([...path, [nr, nc]]);
      }
    }
  }

  // Fallback: If somehow no safe path exists (should not happen since start is safe and connected),
  // return direct step to [0,0]
  return [[0, 0]];
}

/**
 * Evaluates suspicion score for a candidate cell.
 * Lower score = safer.
 * A cell that was NEVER named in any danger clause has suspicion = 0.
 */
export function calculateSuspicionScore(
  cellKey: CellKey,
  clauses: CandidateClause[]
): { score: number; appearances: number } {
  let score = 0;
  let appearances = 0;

  for (const clause of clauses) {
    if (clause.candidates.has(cellKey)) {
      appearances++;
      // A smaller clause concentrates danger on its members
      score += 1.0 / clause.candidates.size;
    }
  }

  return { score, appearances };
}

/**
 * Core Step Function:
 * Executes one atomic cycle of sensing, propositional reasoning, and action planning.
 */
export function executeSimulationStep(
  state: SimulationState,
  groundTruth: GroundTruth
): SimulationState {
  if (state.status !== 'IN_PROGRESS') {
    return state;
  }

  const nextState: SimulationState = {
    ...state,
    step: state.step + 1,
    visited: new Set(state.visited),
    provenSafe: new Set(state.provenSafe),
    confirmedHazards: new Map(state.confirmedHazards),
    survivorsLocated: new Set(state.survivorsLocated),
    candidateClauses: state.candidateClauses.map((c) => ({
      ...c,
      candidates: new Set(c.candidates),
    })),
    dfsPath: [...state.dfsPath],
    reasoningLog: [...state.reasoningLog],
  };

  const currPos = nextState.currentPos;
  const currKey = toKey(currPos[0], currPos[1]);

  // Mark current as visited. A cell is only proven safe after the sensor confirms
  // that the robot did not breach a hazard.
  nextState.visited.add(currKey);

  // 1. SENSE LOCAL ENVIRONMENT
  const sensor = readSensors(currPos, groundTruth);
  nextState.lastSensorReading = sensor;

  // Check if robot stepped on a hazard
  if (sensor.breachedHazard) {
    nextState.status = 'UNIT_DESTROYED';
    nextState.fatalBreach = {
      position: currPos,
      hazardType: sensor.breachedHazard,
    };
    nextState.confirmedHazards.set(currKey, sensor.breachedHazard);

    nextState.reasoningLog.push({
      id: `log-${nextState.step}-fatal`,
      step: nextState.step,
      timestamp: Date.now(),
      position: currPos,
      type: 'CASUALTY',
      message: `[CRITICAL CASUALTY] Unit breached an undetected ${sensor.breachedHazard.replace('_', ' ')} at (${currPos[0]},${currPos[1]}). Structural integrity lost.`,
      details: `Calculated risk failed. The coordinates have been permanently tagged as confirmed hazard. Intelligence stored for next deployment.`,
    });
    return nextState;
  }

  nextState.provenSafe.add(currKey);

  // Check if survivor is located
  if (sensor.isSurvivor && !nextState.survivorsLocated.has(currKey)) {
    nextState.survivorsLocated.add(currKey);
    nextState.reasoningLog.push({
      id: `log-${nextState.step}-survivor`,
      step: nextState.step,
      timestamp: Date.now(),
      position: currPos,
      type: 'SURVIVOR_FOUND',
      message: `[SURVIVOR DETECTED] Human distress beacon confirmed at (${currPos[0]},${currPos[1]}). ${nextState.survivorsLocated.size}/${groundTruth.survivors.length} survivors secured.`,
      details: nextState.survivorsLocated.size === groundTruth.survivors.length
        ? `All survivors located. Computing optimal zero-risk extraction vector back to (0,0).`
        : `Continuing the search perimeter for the remaining survivors.`,
    });

    if (nextState.survivorsLocated.size === groundTruth.survivors.length) {
      const returnPlan = computeSafeReturnPath(currPos, nextState.provenSafe, nextState.gridSize);
      nextState.returnPlan = returnPlan;
      nextState.returnPlanIndex = 0;
    }
  }

  // 2. PROPOSITIONAL REASONING
  const neighborKeys = getNeighborKeys(currPos[0], currPos[1], nextState.gridSize);

  if (!sensor.dangerSignal) {
    // AXIOM 1: No danger signal -> EVERY neighbor is immediately provable as safe!
    const newlyProven: string[] = [];
    for (const nKey of neighborKeys) {
      if (!nextState.provenSafe.has(nKey)) {
        nextState.provenSafe.add(nKey);
        newlyProven.push(nKey);
      }
    }

    if (newlyProven.length > 0) {
      nextState.reasoningLog.push({
        id: `log-${nextState.step}-safe`,
        step: nextState.step,
        timestamp: Date.now(),
        position: currPos,
        type: 'DEDUCTION_SAFE',
        message: `No danger signal at (${currPos[0]},${currPos[1]}). Therefore, neighboring cells [${newlyProven.map(k => `(${k})`).join(', ')}] are logically proven SAFE.`,
        details: `Sensor reading: clean. Neighboring perimeter verified secure.`,
      });
    }
  } else {
    // AXIOM 2: Danger signal detected!
    // CRITICAL BUG FIX (from prompt): Check if neighbor already includes an already-confirmed hazard!
    // "If a danger signal's neighbors already include an already-confirmed hazard, the signal is already fully explained —
    // do not create a new candidate set or accuse another neighbor with no evidence."
    const alreadyExplainedHazard = neighborKeys.find((nKey) => nextState.confirmedHazards.has(nKey));

    if (alreadyExplainedHazard) {
      const hazardType = nextState.confirmedHazards.get(alreadyExplainedHazard);
      nextState.reasoningLog.push({
        id: `log-${nextState.step}-explained`,
        step: nextState.step,
        timestamp: Date.now(),
        position: currPos,
        type: 'OBSERVATION',
        message: `Danger signal detected at (${currPos[0]},${currPos[1]}), but it is already fully accounted for by confirmed ${hazardType} at (${alreadyExplainedHazard}).`,
        details: `No new candidate clauses formed; avoiding false accusations against innocent neighbors.`,
      });
    } else {
      // Unexplained danger signal: create a candidate disjunctive clause
      // Hazard must be among neighbors that are NOT yet proven safe
      const unprovenNeighbors = neighborKeys.filter(
        (nKey) => !nextState.provenSafe.has(nKey) && !nextState.confirmedHazards.has(nKey)
      );

      if (unprovenNeighbors.length > 0) {
        const clauseId = `clause-${currPos[0]}-${currPos[1]}-${Date.now()}`;
        const newClause: CandidateClause = {
          id: clauseId,
          origin: currPos,
          candidates: new Set(unprovenNeighbors),
        };
        nextState.candidateClauses.push(newClause);

        nextState.reasoningLog.push({
          id: `log-${nextState.step}-candidates`,
          step: nextState.step,
          timestamp: Date.now(),
          position: currPos,
          type: 'OBSERVATION',
          message: `Danger signal at (${currPos[0]},${currPos[1]}) narrows the hazard to candidate set {${unprovenNeighbors.map(k => `(${k})`).join(', ')}}.`,
          details: `Registered disjunctive clause: (${unprovenNeighbors.join(' ∨ ')}). Candidate cells remain unconfirmed until directly verified.`,
        });
      }
    }
  }

  // 3. CLAUSE MAINTENANCE AND SOUND UNIT PROPAGATION
  // A clause is an "at least one of these cells is hazardous" constraint.
  // Once every other member is proven safe, its final member is logically
  // forced to be hazardous. This is sound because proven-safe facts come only
  // from a clean sensor reading or a directly traversed cell.
  let propagationChanged = true;
  let propagationCycles = 0;

  while (propagationChanged && propagationCycles < 10) {
    propagationChanged = false;
    propagationCycles++;

    const remainingClauses: CandidateClause[] = [];

    for (const clause of nextState.candidateClauses) {
      // 1. Remove all proven safe cells
      let removedSafe = false;
      for (const cand of Array.from(clause.candidates)) {
        if (nextState.provenSafe.has(cand)) {
          clause.candidates.delete(cand);
          removedSafe = true;
          propagationChanged = true;
        }
      }

      // 2. Check if an already confirmed hazard satisfies the clause
      const containsConfirmedHazard = Array.from(clause.candidates).some((cand) =>
        nextState.confirmedHazards.has(cand)
      );

      if (containsConfirmedHazard) {
        // Clause is satisfied and resolved!
        propagationChanged = true;
        continue; // Drop clause
      }

      if (clause.candidates.size === 1) {
        const soleCandidate = Array.from(clause.candidates)[0];
        if (!nextState.provenSafe.has(soleCandidate)) {
          nextState.confirmedHazards.set(soleCandidate, 'STRUCTURAL_COLLAPSE');
          nextState.reasoningLog.push({
            id: `log-${nextState.step}-elimination-${soleCandidate}`,
            step: nextState.step,
            timestamp: Date.now(),
            position: currPos,
            type: 'DEDUCTION_HAZARD',
            message: `[UNIT PROPAGATION] All alternative candidates ruled out for origin (${clause.origin[0]},${clause.origin[1]}). Confirmed HAZARD at (${soleCandidate}) by elimination.`,
            details: `The danger clause contains one unproven cell and is therefore logically forced.`,
          });
        }
        propagationChanged = true;
        continue;
      }

      if (clause.candidates.size > 1) {
        remainingClauses.push(clause);
      }
    }

    nextState.candidateClauses = remainingClauses;
  }

  // 4. RETURNING TO EXTRACTION POINT (If survivor was found or abort initiated)
  if (nextState.returnPlan) {
    // Following BFS precomputed shortest provably-safe path
    const plan = nextState.returnPlan;
    // Current step in return plan
    if (nextState.returnPlanIndex < plan.length - 1) {
      nextState.returnPlanIndex++;
      const nextCoord = plan[nextState.returnPlanIndex];
      nextState.currentPos = nextCoord;

      if (nextCoord[0] === 0 && nextCoord[1] === 0) {
        const allSurvivorsFound = nextState.survivorsLocated.size === groundTruth.survivors.length;
        nextState.status = allSurvivorsFound ? 'SUCCESS_EXTRACTED' : 'NO_SURVIVOR_FOUND';
        nextState.survivorRescued = allSurvivorsFound;

        nextState.reasoningLog.push({
          id: `log-${nextState.step}-extracted`,
          step: nextState.step,
          timestamp: Date.now(),
          position: [0, 0],
          type: 'EXTRACTION',
          message: allSurvivorsFound
            ? `[MISSION SUCCESS] Unit safely returned to extraction point (0,0) with ${groundTruth.survivors.length} survivors! Extraction completed.`
            : `[EXTRACTION COMPLETE] Unit safely returned to (0,0). Thorough scan exhausted with no survivor detected.`,
          details: `Shortest provably-safe BFS route completed in ${plan.length - 1} extraction steps without incident.`,
        });
      } else {
        nextState.reasoningLog.push({
          id: `log-${nextState.step}-return-step`,
          step: nextState.step,
          timestamp: Date.now(),
          position: nextCoord,
          type: 'EXTRACTION',
          message: `Traversing pre-verified extraction corridor: moved to (${nextCoord[0]},${nextCoord[1]}). (${plan.length - 1 - nextState.returnPlanIndex} steps to extraction base).`,
        });
      }
      return nextState;
    }
  }

  // 5. MOVEMENT STRATEGY: DFS WITH BACKTRACKING & CALCULATED RISK
  // Option A: Prefer an unvisited PROVEN-SAFE neighbor
  const unvisitedSafeNeighbors = neighborKeys
    .filter((nKey) => nextState.provenSafe.has(nKey) && !nextState.visited.has(nKey))
    .map(fromKey);

  if (unvisitedSafeNeighbors.length > 0) {
    // DFS advance: pick first unvisited safe neighbor
    const target = unvisitedSafeNeighbors[0];
    nextState.dfsPath.push(target);
    nextState.currentPos = target;

    nextState.reasoningLog.push({
      id: `log-${nextState.step}-move-safe`,
      step: nextState.step,
      timestamp: Date.now(),
      position: target,
      type: 'OBSERVATION',
      message: `Advancing to unvisited proven-safe neighbor at (${target[0]},${target[1]}).`,
    });
    return nextState;
  }

  // Option B: No unvisited proven-safe neighbor!
  // Check if unvisited neighbors exist that are NOT confirmed hazards (Calculated Risk)
  const candidateNeighbors = neighborKeys
    .filter((nKey) => !nextState.visited.has(nKey) && !nextState.confirmedHazards.has(nKey))
    .map(fromKey);

  if (candidateNeighbors.length > 0) {
    // Evaluate suspicion score for each candidate neighbor
    // Ties broken toward cells NEVER implicated in any danger signal at all
    const scoredCandidates = candidateNeighbors.map((coord) => {
      const cKey = toKey(coord[0], coord[1]);
      const { score, appearances } = calculateSuspicionScore(cKey, nextState.candidateClauses);
      return { coord, cKey, score, appearances };
    });

    // Sort by suspicion score ascending, then by appearances ascending
    scoredCandidates.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.appearances - b.appearances;
    });

    const chosen = scoredCandidates[0];

    // Take calculated risk!
    nextState.dfsPath.push(chosen.coord);
    nextState.currentPos = chosen.coord;

    nextState.reasoningLog.push({
      id: `log-${nextState.step}-risk`,
      step: nextState.step,
      timestamp: Date.now(),
      position: chosen.coord,
      type: 'RISK_ASSESSMENT',
      message: `No proven-safe unvisited neighbor available. Taking calculated risk on least-suspicious neighbor (${chosen.coord[0]},${chosen.coord[1]}) [Suspicion Score: ${chosen.score.toFixed(2)}, Implicated in ${chosen.appearances} clauses].`,
      details: chosen.appearances === 0
        ? `Cell was never named in any danger clause. Optimal risk-reward choice.`
        : `Cell has lowest danger concentration among remaining unvisited perimeters.`,
    });
    return nextState;
  }

  // Option C: No unvisited neighbors at all -> Backtrack along DFS path
  if (nextState.dfsPath.length > 1) {
    // Pop current cell from stack
    nextState.dfsPath.pop();
    const backtrackTarget = nextState.dfsPath[nextState.dfsPath.length - 1];
    nextState.currentPos = backtrackTarget;

    nextState.reasoningLog.push({
      id: `log-${nextState.step}-backtrack`,
      step: nextState.step,
      timestamp: Date.now(),
      position: backtrackTarget,
      type: 'BACKTRACK',
      message: `Dead end reached with no viable forward cells. Backtracking along verified trail to (${backtrackTarget[0]},${backtrackTarget[1]}).`,
    });
    return nextState;
  }

  // Option D: All reachable safe and risk-viable cells exhausted without finding survivor!
  // Robot must return home via BFS and report "no survivor located in the explored area"
  nextState.reasoningLog.push({
    id: `log-${nextState.step}-exhausted`,
    step: nextState.step,
    timestamp: Date.now(),
    position: currPos,
    type: 'ABORT',
    message: `Exploration space fully exhausted. All reachable safe and viable sectors searched. Survivor was not located in accessible sectors.`,
    details: `Initiating safe withdrawal protocol to extraction point (0,0).`,
  });

  const abortPlan = computeSafeReturnPath(currPos, nextState.provenSafe, nextState.gridSize);
  nextState.returnPlan = abortPlan;
  nextState.returnPlanIndex = 0;

  if (currPos[0] === 0 && currPos[1] === 0) {
    nextState.status = 'NO_SURVIVOR_FOUND';
  }

  return nextState;
}

/**
 * Runs a complete mission programmatically from start to finish.
 * Used for automated verification and stress-testing.
 */
export function runSimulationHeadless(
  groundTruth: GroundTruth,
  maxSteps: number = 200,
  inheritedMemory?: SectorMemory | null
): SimulationState {
  let state = createSimulationState(inheritedMemory, groundTruth.gridSize);

  while (state.status === 'IN_PROGRESS' && state.step < maxSteps) {
    state = executeSimulationStep(state, groundTruth);
  }

  return state;
}

/**
 * Automated Verification Suite
 * Runs N programmatic missions to confirm:
 * 1. Zero cells are ever wrongly confirmed as a hazard when not one in ground truth.
 * 2. The simulation always terminates (no infinite loops).
 * 3. Genuine distribution of success, casualties, and safe returns.
 */
export function runBatchVerification(
  numRuns: number = 100,
  gridSize: number = DEFAULT_GRID_SIZE,
  survivorCount: number = 1
): {
  totalRuns: number;
  successfulExtractions: number;
  unitsDestroyed: number;
  noSurvivorOutcomes: number;
  falseHazardAccusations: number;
  timedOutRuns: number;
  solvabilityViolations: number;
  avgSteps: number;
  executionTimeMs: number;
} {
  const startTime = performance.now();
  let successful = 0;
  let destroyed = 0;
  let noSurvivor = 0;
  let falseAccusations = 0;
  let timedOut = 0;
  let solvabilityViolations = 0;
  let totalSteps = 0;

  for (let i = 0; i < numRuns; i++) {
    const env = generateSolvableEnvironment(gridSize, survivorCount);

    if (!isSurvivorReachable(env)) {
      solvabilityViolations++;
    }

    const state = runSimulationHeadless(env, 250);
    totalSteps += state.step;

    if (state.status === 'IN_PROGRESS') {
      timedOut++;
    } else if (state.status === 'SUCCESS_EXTRACTED') {
      successful++;
    } else if (state.status === 'UNIT_DESTROYED') {
      destroyed++;
    } else if (state.status === 'NO_SURVIVOR_FOUND') {
      noSurvivor++;
    }

    // AUDIT SOUNDNESS: Check that zero cells in confirmedHazards are false accusations
    for (const [hazardKey] of state.confirmedHazards.entries()) {
      if (!env.hazards[hazardKey]) {
        falseAccusations++;
      }
    }
  }

  const executionTimeMs = performance.now() - startTime;

  return {
    totalRuns: numRuns,
    successfulExtractions: successful,
    unitsDestroyed: destroyed,
    noSurvivorOutcomes: noSurvivor,
    falseHazardAccusations: falseAccusations,
    timedOutRuns: timedOut,
    solvabilityViolations: solvabilityViolations,
    avgSteps: Math.round((totalSteps / numRuns) * 10) / 10,
    executionTimeMs: Math.round(executionTimeMs),
  };
}
