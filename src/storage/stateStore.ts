/**
 * Persistent State Store
 * Manages Fleet Roster, Mission Incident Logs, and Operator Authentication
 */

import { RobotUnit, MissionReport, UserProfile, UserRole } from '../types';

const FLEET_STORAGE_KEY = 'rescuebot_fleet_roster_v1';
const INCIDENTS_STORAGE_KEY = 'rescuebot_mission_reports_v1';
const USER_STORAGE_KEY = 'rescuebot_user_session_v1';

const INITIAL_FLEET: RobotUnit[] = [
  {
    id: 'RB-101',
    callsign: 'Apex Rover',
    team: 'Tactical Recon Unit Alpha',
    status: 'STANDBY',
    missionsCompleted: 14,
    registeredAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'RB-102',
    callsign: 'Sentinel Titan',
    team: 'Urban Hazard Search Team',
    status: 'STANDBY',
    missionsCompleted: 9,
    registeredAt: '2026-03-04T10:15:00Z',
  },
  {
    id: 'RB-103',
    callsign: 'Vanguard Echo',
    team: 'Collapsed Structure Rapid Division',
    status: 'STANDBY',
    missionsCompleted: 21,
    registeredAt: '2026-03-10T14:30:00Z',
  },
  {
    id: 'RB-104',
    callsign: 'Shadow Nomad',
    team: 'Gas Infiltration Specialist',
    status: 'STANDBY',
    missionsCompleted: 6,
    registeredAt: '2026-03-18T11:00:00Z',
  },
  {
    id: 'RB-105',
    callsign: 'Aegis Core',
    team: 'Autonomous First Response Brigade',
    status: 'STANDBY',
    missionsCompleted: 3,
    registeredAt: '2026-03-25T09:45:00Z',
  },
];

const DEFAULT_USER: UserProfile = {
  id: 'usr-default',
  username: 'operator.alex',
  callsign: 'Specter-Lead',
  role: 'RESPONDER',
  team: 'Tactical Recon Unit Alpha',
  badgeNumber: 'RC-9942',
};

class StateStore {
  private fleet: RobotUnit[] = [];
  private reports: MissionReport[] = [];
  private currentUser: UserProfile = DEFAULT_USER;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initStore();
  }

  private initStore(): void {
    if (typeof window === 'undefined') {
      this.fleet = [...INITIAL_FLEET];
      return;
    }

    try {
      const fleetData = localStorage.getItem(FLEET_STORAGE_KEY);
      this.fleet = fleetData ? JSON.parse(fleetData) : [...INITIAL_FLEET];

      const reportData = localStorage.getItem(INCIDENTS_STORAGE_KEY);
      this.reports = reportData ? JSON.parse(reportData) : [];

      // A browser refresh cannot resume an in-memory deployment. Recover any
      // orphaned deployed units so the roster does not report phantom missions.
      let recoveredOrphanedDeployments = false;
      this.fleet = this.fleet.map((unit) => {
        if (unit.status === 'DEPLOYED') {
          recoveredOrphanedDeployments = true;
          return { ...unit, status: 'STANDBY' as const };
        }
        return unit;
      });

      // Repair mission totals created before casualty missions were counted.
      const completedByUnit = new Map<string, number>();
      this.reports.forEach((report) => {
        if (report.outcome !== 'IN_PROGRESS' && report.outcome !== 'NOT_STARTED') {
          completedByUnit.set(report.unitId, (completedByUnit.get(report.unitId) || 0) + 1);
        }
      });
      this.fleet = this.fleet.map((unit) => ({
        ...unit,
        missionsCompleted: Math.max(unit.missionsCompleted, completedByUnit.get(unit.id) || 0),
      }));
      if (recoveredOrphanedDeployments) {
        localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(this.fleet));
      }

      const userData = localStorage.getItem(USER_STORAGE_KEY);
      this.currentUser = userData ? JSON.parse(userData) : DEFAULT_USER;
    } catch {
      this.fleet = [...INITIAL_FLEET];
      this.reports = [];
      this.currentUser = DEFAULT_USER;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // --- Fleet Operations ---

  public getFleet(): RobotUnit[] {
    return [...this.fleet];
  }

  public getUnitById(id: string): RobotUnit | undefined {
    return this.fleet.find((u) => u.id === id);
  }

  public registerUnit(id: string, callsign: string, team: string): boolean {
    const cleanId = id.trim().toUpperCase();
    if (this.fleet.some((u) => u.id === cleanId)) {
      return false; // ID already taken
    }

    const newUnit: RobotUnit = {
      id: cleanId,
      callsign: callsign.trim() || `RescueBot ${cleanId}`,
      team: team.trim() || 'General Emergency Fleet',
      status: 'STANDBY',
      missionsCompleted: 0,
      registeredAt: new Date().toISOString(),
    };

    this.fleet.unshift(newUnit);
    this.saveFleet();
    return true;
  }

  public updateUnitStatus(id: string, status: RobotUnit['status'], sector?: string): void {
    const unit = this.fleet.find((u) => u.id === id);
    if (unit) {
      const previousStatus = unit.status;
      unit.status = status;
      if (sector) unit.lastMissionSector = sector;
      if (previousStatus === 'DEPLOYED' && (status === 'STANDBY' || status === 'DESTROYED')) {
        unit.missionsCompleted++;
      }
      this.saveFleet();
    }
  }

  public repairUnit(id: string): void {
    const unit = this.fleet.find((u) => u.id === id);
    if (unit && unit.status === 'DESTROYED') {
      unit.status = 'STANDBY';
      this.saveFleet();
    }
  }

  public decommissionUnit(id: string): void {
    this.fleet = this.fleet.filter((u) => u.id !== id);
    this.saveFleet();
  }

  private saveFleet(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(this.fleet));
      } catch {
        // fallback
      }
    }
    this.notify();
  }

  // --- Mission Reports Operations ---

  public getReports(): MissionReport[] {
    return [...this.reports];
  }

  public addReport(report: MissionReport): void {
    this.reports.unshift(report);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(this.reports));
      } catch {
        // fallback
      }
    }
    this.notify();
  }

  public clearReports(): void {
    this.reports = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(INCIDENTS_STORAGE_KEY);
      } catch {
        // fallback
      }
    }
    this.notify();
  }

  // --- User & Auth Operations ---

  public getCurrentUser(): UserProfile {
    return { ...this.currentUser };
  }

  public loginResponder(username: string, callsign: string, team: string): void {
    this.currentUser = {
      id: `usr-${Date.now()}`,
      username: username.trim() || 'responder.one',
      callsign: callsign.trim() || 'Rescue-1',
      role: 'RESPONDER',
      team: team.trim() || 'Search and Rescue Sector A',
      badgeNumber: `RC-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    this.saveUser();
  }

  public loginAdmin(adminCode: string): boolean {
    const validCodes = ['COMMAND-AI-SECURE', 'ADMIN2026', 'RESCUEBOT-CMD'];
    if (validCodes.includes(adminCode.trim().toUpperCase())) {
      this.currentUser = {
        id: 'adm-command-01',
        username: 'commander.vance',
        callsign: 'COMMAND-PRIME',
        role: 'COMMAND_ADMIN',
        team: 'Disaster Simulation Command Central',
        badgeNumber: 'CMD-001',
      };
      this.saveUser();
      return true;
    }
    return false;
  }

  public logout(): void {
    this.currentUser = DEFAULT_USER;
    this.saveUser();
  }

  private saveUser(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.currentUser));
      } catch {
        // fallback
      }
    }
    this.notify();
  }
}

export const stateStore = new StateStore();
