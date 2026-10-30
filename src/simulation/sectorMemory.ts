/**
 * Sector Memory Management
 * Literal Memory Inheritance for RescueBot Command
 * 
 * If a unit is destroyed in a sector, redeploying another unit to that same named sector
 * reuses the identical ground-truth hazard/survivor layout and inherits everything
 * the lost unit had already proven (safe cells, ruled-out candidates, fatal coordinates).
 * 
 * If a mission succeeds or ends with no survivor found, the sector memory is cleared
 * so future deployments generate a fresh layout.
 */

import { SectorMemory, GroundTruth, Coordinate, HazardType } from '../types';
import { DEFAULT_GRID_SIZE } from './logic';

const SECTOR_MEMORY_STORAGE_KEY = 'rescuebot_sector_memory_v1';

class SectorMemoryRegistry {
  private memoryMap: Map<string, SectorMemory> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private normalizeKey(sectorName: string): string {
    return sectorName.trim().toUpperCase();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem(SECTOR_MEMORY_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as Record<string, SectorMemory>;
        Object.entries(parsed).forEach(([key, val]) => {
          const legacyGroundTruth = val.groundTruth as GroundTruth & { survivor?: Coordinate };
          const groundTruth: GroundTruth = {
            gridSize: legacyGroundTruth.gridSize || DEFAULT_GRID_SIZE,
            hazards: legacyGroundTruth.hazards,
            survivors: legacyGroundTruth.survivors || (legacyGroundTruth.survivor ? [legacyGroundTruth.survivor] : []),
          };
          const locatedSurvivorKeys = Array.isArray(val.locatedSurvivorKeys)
            ? val.locatedSurvivorKeys
            : [];
          this.memoryMap.set(key, val);
          this.memoryMap.set(key, { ...val, groundTruth, locatedSurvivorKeys });
        });
      }
    } catch {
      // Storage access error or non-browser fallback
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, SectorMemory> = {};
      this.memoryMap.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(SECTOR_MEMORY_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Fallback
    }
  }

  /**
   * Records a fallen unit's intelligence for the specified sector.
   */
  public recordSectorCasualty(
    sectorName: string,
    groundTruth: GroundTruth,
    provenSafeKeys: string[],
    confirmedHazardKeys: Record<string, HazardType>,
    locatedSurvivorKeys: string[],
    failedByUnitId: string,
    casualtyPosition: Coordinate
  ): SectorMemory {
    const key = this.normalizeKey(sectorName);
    const memory: SectorMemory = {
      sectorName,
      groundTruth,
      provenSafeKeys,
      confirmedHazardKeys,
      locatedSurvivorKeys,
      failedByUnitId,
      timestamp: new Date().toISOString(),
      casualtyPosition,
    };

    this.memoryMap.set(key, memory);
    this.saveToStorage();
    return memory;
  }

  /**
   * Retrieves inherited intelligence if available for the sector.
   */
  public getSectorMemory(sectorName: string): SectorMemory | null {
    const key = this.normalizeKey(sectorName);
    return this.memoryMap.get(key) || null;
  }

  /**
   * Clears memory when a sector has been successfully cleared or safely aborted.
   */
  public clearSectorMemory(sectorName: string): void {
    const key = this.normalizeKey(sectorName);
    if (this.memoryMap.has(key)) {
      this.memoryMap.delete(key);
      this.saveToStorage();
    }
  }

  /**
   * Lists all currently retained sectors.
   */
  public getAllRetainedSectors(): SectorMemory[] {
    return Array.from(this.memoryMap.values());
  }
}

export const sectorMemoryRegistry = new SectorMemoryRegistry();
