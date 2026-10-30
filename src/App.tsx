/**
 * RescueBot Command - Autonomous Disaster Response Simulation Platform
 * Classical AI: Propositional Logic, Unit Propagation, DFS Backtracking, BFS Return
 */

import React, { useState, useEffect } from 'react';
import { stateStore } from './storage/stateStore';
import { UserProfile } from './types';
import { MissionControlPage } from './pages/MissionControlPage';
import { FleetCenterPage } from './pages/FleetCenterPage';
import { IncidentLogsPage } from './pages/IncidentLogsPage';
import { AILogicLabPage } from './pages/AILogicLabPage';
import { AuthPage } from './pages/AuthPage';
import { Badge } from './components/ui/Badge';
import {
  Compass,
  History,
  FlaskConical,
  UserCheck,
  Bot,
} from 'lucide-react';

export type AppPage = 'MISSION_CONTROL' | 'FLEET_CENTER' | 'INCIDENT_LOGS' | 'AI_LOGIC_LAB' | 'AUTH';

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('MISSION_CONTROL');
  const [user, setUser] = useState<UserProfile>(stateStore.getCurrentUser());

  // Cross-page navigation state
  const [targetSector, setTargetSector] = useState<string>('');
  const [targetRobotId, setTargetRobotId] = useState<string>('');

  useEffect(() => {
    const updateUser = () => {
      setUser(stateStore.getCurrentUser());
    };
    const unsub = stateStore.subscribe(updateUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user.role !== 'COMMAND_ADMIN' && currentPage === 'INCIDENT_LOGS') {
      setCurrentPage('MISSION_CONTROL');
    }
  }, [user.role, currentPage]);

  const handleRedeployToSector = (sectorName: string) => {
    setTargetSector(sectorName);
    setCurrentPage('MISSION_CONTROL');
  };

  const handleDeployUnitFromFleet = (unitId: string) => {
    setTargetRobotId(unitId);
    setCurrentPage('MISSION_CONTROL');
  };

  const navItems = [
    {
      id: 'MISSION_CONTROL' as AppPage,
      label: 'Mission Control',
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: 'FLEET_CENTER' as AppPage,
      label: 'Fleet Center',
      icon: <Bot className="w-4 h-4" />,
    },
    ...(user.role === 'COMMAND_ADMIN' ? [{
      id: 'INCIDENT_LOGS' as AppPage,
      label: 'Incident Logs',
      icon: <History className="w-4 h-4" />,
    }] : []),
    {
      id: 'AI_LOGIC_LAB' as AppPage,
      label: 'AI Logic Lab',
      icon: <FlaskConical className="w-4 h-4" />,
    },
    {
      id: 'AUTH' as AppPage,
      label: 'Operator Access',
      icon: <UserCheck className="w-4 h-4" />,
    },
  ];

  return (
    <div className="command-shell min-h-screen tactical-bg text-slate-100 flex flex-col font-sans">
      {/* Top Tactical Command HUD Navigation Bar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/10 shadow-lg">
        <div className="workspace-shell py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Callout */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-stone-500/20 to-emerald-900/30 border border-amber-500/30 shadow-[0_4px_14px_rgba(0,0,0,0.2)]">
              <Bot className="w-6 h-6 text-amber-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping-subtle" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg md:text-xl tracking-wider text-slate-100">
                  RESCUEBOT
                </span>
                <span className="font-display font-bold text-lg md:text-xl tracking-wider text-amber-400">
                  COMMAND
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px] font-mono-hud text-slate-400">
                <span>CLASSICAL AI TACTICAL PLATFORM</span>
                <span>•</span>
                <span className="text-teal-400">PROPOSITIONAL LOGIC</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/5">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono-hud text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer select-none ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-amber-400' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Operator Status */}
          <div className="flex items-center gap-2.5">
            {/* Operator Session Pill */}
            <button
              onClick={() => setCurrentPage('AUTH')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700/60 hover:border-amber-500/40 transition-colors cursor-pointer text-xs font-mono-hud"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  user.role === 'COMMAND_ADMIN' ? 'bg-red-400' : 'bg-teal-400'
                }`}
              />
              <span className="text-slate-300 hidden sm:inline">{user.callsign}</span>
              <Badge
                variant={user.role === 'COMMAND_ADMIN' ? 'coral' : 'teal'}
                className="text-[9px] py-0 px-1.5"
              >
                {user.role === 'COMMAND_ADMIN' ? 'ADMIN' : 'RESP'}
              </Badge>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden px-4 py-2 bg-slate-950/90 border-t border-white/5 flex items-center justify-between gap-1 overflow-x-auto text-xs font-mono-hud">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Page Workspace */}
      <main className="flex-1 workspace-shell py-8 page-intro">
        {currentPage === 'MISSION_CONTROL' && (
          <MissionControlPage
            initialSector={targetSector}
            initialRobotId={targetRobotId}
            userRole={user.role}
          />
        )}

        {currentPage === 'FLEET_CENTER' && (
          <FleetCenterPage
            onDeployUnit={handleDeployUnitFromFleet}
            onNavigateToAuth={() => setCurrentPage('AUTH')}
          />
        )}

        {currentPage === 'INCIDENT_LOGS' && (
          <IncidentLogsPage onRedeployToSector={handleRedeployToSector} />
        )}

        {currentPage === 'AI_LOGIC_LAB' && <AILogicLabPage />}

        {currentPage === 'AUTH' && (
          <AuthPage onAuthSuccess={() => setCurrentPage('MISSION_CONTROL')} />
        )}
      </main>

      {/* Tactical Status Footer */}
      <footer className="glass-panel border-t border-white/10 py-3 mt-auto">
        <div className="workspace-shell flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono-hud text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>AI INFERENCE ENGINE ACTIVE</span>
            <span>•</span>
            <span>ZERO MACHINE LEARNING / 100% PROPOSITIONAL LOGIC</span>
          </div>

          <div className="flex items-center gap-4">
            <span>4×8 CONFIGURABLE PERIMETER</span>
            <span>•</span>
            <span>UNIT PROPAGATION SOLVER</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
