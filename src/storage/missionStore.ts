import { GroundTruth, MissionDeployment, MissionOutcome, MissionWorkspace, MissionWorkspaceStatus } from '../types';

const MISSIONS_STORAGE_KEY = 'rescuebot_mission_workspaces_v1';

class MissionStore {
  private missions: MissionWorkspace[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(MISSIONS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as Array<Partial<MissionWorkspace>> : [];
      this.missions = parsed.map((mission, index) => ({
        ...mission,
        name: mission.name?.trim() || `Mission ${index + 1}`,
      } as MissionWorkspace));
    } catch {
      this.missions = [];
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(this.missions));
  }

  public getAll(): MissionWorkspace[] {
    return this.missions.map((mission) => ({
      ...mission,
      deployments: [...mission.deployments],
      reports: [...mission.reports],
    }));
  }

  public getById(id: string): MissionWorkspace | null {
    return this.missions.find((mission) => mission.id === id) || null;
  }

  public create(
    name: string,
    sectorName: string,
    groundTruth: GroundTruth,
    status: MissionWorkspaceStatus = 'PLANNING'
  ): MissionWorkspace {
    const now = new Date().toISOString();
    const mission: MissionWorkspace = {
      id: `mission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
      name: name.trim(),
      sectorName,
      gridSize: groundTruth.gridSize,
      hazardCount: Object.keys(groundTruth.hazards).length,
      survivorCount: groundTruth.survivors.length,
      groundTruth,
      status,
      deployments: [],
      reports: [],
    };
    this.missions.unshift(mission);
    this.save();
    return mission;
  }

  public update(
    id: string,
    changes: Partial<Pick<MissionWorkspace, 'status' | 'groundTruth' | 'sectorName' | 'name'>>
  ): MissionWorkspace | null {
    const mission = this.missions.find((item) => item.id === id);
    if (!mission) return null;
    Object.assign(mission, changes, { updatedAt: new Date().toISOString() });
    if (changes.groundTruth) {
      mission.gridSize = changes.groundTruth.gridSize;
      mission.hazardCount = Object.keys(changes.groundTruth.hazards).length;
      mission.survivorCount = changes.groundTruth.survivors.length;
    }
    this.save();
    return mission;
  }

  public addDeployment(id: string, deployment: MissionDeployment): MissionWorkspace | null {
    const mission = this.missions.find((item) => item.id === id);
    if (!mission) return null;
    mission.deployments.push(deployment);
    mission.status = 'IN_PROGRESS';
    mission.updatedAt = new Date().toISOString();
    this.save();
    return mission;
  }

  public completeDeployment(
    id: string,
    deploymentId: string,
    outcome: MissionOutcome,
    report: MissionWorkspace['reports'][number]
  ): MissionWorkspace | null {
    const mission = this.missions.find((item) => item.id === id);
    if (!mission) return null;
    const deployment = mission.deployments.find((item) => item.id === deploymentId);
    if (deployment) {
      deployment.outcome = outcome;
      deployment.completedAt = new Date().toISOString();
      deployment.reportId = report.id;
    }
    mission.reports.unshift(report);
    mission.status = outcome;
    mission.updatedAt = new Date().toISOString();
    this.save();
    return mission;
  }
}

export const missionStore = new MissionStore();
