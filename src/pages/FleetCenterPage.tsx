import React, { useState, useEffect } from 'react';
import { stateStore } from '../storage/stateStore';
import { RobotUnit, UserProfile } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
  Shield,
  Plus,
  Wrench,
  Trash2,
  Bot,
  AlertOctagon,
  Radio,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface FleetCenterPageProps {
  onDeployUnit?: (unitId: string) => void;
  onNavigateToAuth?: () => void;
}

export const FleetCenterPage: React.FC<FleetCenterPageProps> = ({
  onDeployUnit,
  onNavigateToAuth,
}) => {
  const [fleet, setFleet] = useState<RobotUnit[]>([]);
  const [user, setUser] = useState<UserProfile>(stateStore.getCurrentUser());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Register Unit Modal
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [newId, setNewId] = useState<string>('');
  const [newCallsign, setNewCallsign] = useState<string>('');
  const [newTeam, setNewTeam] = useState<string>('Search & Rescue Division 1');
  const [regError, setRegError] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setFleet(stateStore.getFleet());
      setUser(stateStore.getCurrentUser());
    };
    update();
    const unsub = stateStore.subscribe(update);
    return () => unsub();
  }, []);

  const totalUnits = fleet.length;
  const standbyUnits = fleet.filter((u) => u.status === 'STANDBY').length;
  const deployedUnits = fleet.filter((u) => u.status === 'DEPLOYED').length;
  const destroyedUnits = fleet.filter((u) => u.status === 'DESTROYED').length;
  const totalMissions = fleet.reduce((acc, u) => acc + u.missionsCompleted, 0);

  const filteredFleet = fleet.filter((u) => {
    if (filterStatus === 'ALL') return true;
    return u.status === filterStatus;
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!isAdmin) {
      setRegError('Command Officer credentials are required to commission a unit.');
      return;
    }

    if (!newId.trim()) {
      setRegError('Unit ID is required (e.g. RB-106)');
      return;
    }

    const success = stateStore.registerUnit(newId, newCallsign, newTeam);
    if (!success) {
      setRegError(`A unit with ID "${newId.toUpperCase()}" already exists in the fleet registry.`);
      return;
    }

    setShowRegisterModal(false);
    setNewId('');
    setNewCallsign('');
  };

  const getStatusBadge = (status: RobotUnit['status']) => {
    switch (status) {
      case 'STANDBY':
        return (
          <Badge variant="teal" dot>
            STANDBY (READY)
          </Badge>
        );
      case 'DEPLOYED':
        return (
          <Badge variant="amber" dot>
            DEPLOYED (IN FIELD)
          </Badge>
        );
      case 'DESTROYED':
        return (
          <Badge variant="coral" dot>
            DESTROYED (CASUALTY)
          </Badge>
        );
      default:
        return <Badge variant="slate">MAINTENANCE</Badge>;
    }
  };

  const isAdmin = user.role === 'COMMAND_ADMIN';

  return (
    <div className="space-y-6">
      {/* Admin Authorization Notice */}
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between gap-4 font-mono-hud text-xs">
          <div className="flex items-center gap-2.5 text-amber-300">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Operating in <strong>Responder View</strong>. Fleet maintenance and new unit commissioning
              require Command Officer credentials.
            </span>
          </div>
          <button
            onClick={onNavigateToAuth}
            className="px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold transition-all cursor-pointer whitespace-nowrap"
          >
            Authenticate as Command Admin
          </button>
        </div>
      )}

      {/* Fleet Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-white/10 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono-hud mb-2">
            <span>TOTAL ROSTER</span>
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl md:text-3xl font-display font-bold text-slate-100">
            {totalUnits}
          </div>
          <div className="text-[11px] font-mono-hud text-slate-500 mt-1">
            Autonomous rescue units
          </div>
        </Card>

        <Card className="border border-teal-500/30 p-4">
          <div className="flex items-center justify-between text-teal-400 text-xs font-mono-hud mb-2">
            <span>READY ON STANDBY</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl md:text-3xl font-display font-bold text-teal-300">
            {standbyUnits}
          </div>
          <div className="text-[11px] font-mono-hud text-teal-500/80 mt-1">
            Available for immediate dispatch
          </div>
        </Card>

        <Card className="border border-amber-500/30 p-4">
          <div className="flex items-center justify-between text-amber-400 text-xs font-mono-hud mb-2">
            <span>CURRENTLY DEPLOYED</span>
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl md:text-3xl font-display font-bold text-amber-300">
            {deployedUnits}
          </div>
          <div className="text-[11px] font-mono-hud text-amber-500/80 mt-1">
            Active in hazardous perimeters
          </div>
        </Card>

        <Card className="border border-red-500/30 p-4">
          <div className="flex items-center justify-between text-red-400 text-xs font-mono-hud mb-2">
            <span>UNIT CASUALTIES</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl md:text-3xl font-display font-bold text-red-400">
            {destroyedUnits}
          </div>
          <div className="text-[11px] font-mono-hud text-red-500/80 mt-1">
            Real calculated risk casualties
          </div>
        </Card>
      </div>

      {/* Fleet Table Card */}
      <Card className="border border-white/10 shadow-2xl">
        <CardHeader className="bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-slate-100">COMMAND FLEET REGISTRY & TELEMETRY</CardTitle>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-white/5 text-xs font-mono-hud">
              {['ALL', 'STANDBY', 'DEPLOYED', 'DESTROYED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    filterStatus === st
                      ? 'bg-amber-500/30 text-amber-200 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <Button
              variant="amber"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowRegisterModal(true)}
              disabled={!isAdmin}
              title={isAdmin ? 'Register a new rescue unit' : 'Command Admin access required'}
            >
              Register New Robot
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit ID</TableHead>
                <TableHead>Callsign / Name</TableHead>
                <TableHead>Assigned Team</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Missions</TableHead>
                <TableHead>Last Sector</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFleet.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500 italic">
                    No robot units found matching the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFleet.map((unit) => (
                  <TableRow key={unit.id} className="hover:bg-white/[0.04]">
                    <TableCell className="font-bold text-cyan-300">{unit.id}</TableCell>
                    <TableCell className="text-slate-200 font-semibold">{unit.callsign}</TableCell>
                    <TableCell className="text-slate-400">{unit.team}</TableCell>
                    <TableCell>{getStatusBadge(unit.status)}</TableCell>
                    <TableCell className="text-amber-300 font-bold">
                      {unit.missionsCompleted}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {unit.lastMissionSector || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {unit.status === 'STANDBY' && onDeployUnit && (
                          <Button
                            variant="amber"
                            size="sm"
                            onClick={() => onDeployUnit(unit.id)}
                          >
                            Dispatch
                          </Button>
                        )}

                        {unit.status === 'DESTROYED' && (
                          <Button
                            variant="teal"
                            size="sm"
                            icon={<Wrench className="w-3.5 h-3.5" />}
                            onClick={() => stateStore.repairUnit(unit.id)}
                            title="Repair chassis & restore to STANDBY"
                          >
                            Recommission
                          </Button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => stateStore.decommissionUnit(unit.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                            title="Decommission Unit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Register New Robot Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="COMMISSION NEW RESCUEBOT UNIT"
        subtitle="Registers unit into Command Roster with initial STANDBY status"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <Input
            label="Robot Unit ID"
            placeholder="e.g. RB-106, RB-201"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            error={regError}
            required
          />

          <Input
            label="Callsign / Unit Name"
            placeholder="e.g. Iron Sentinel, Phantom Scout"
            value={newCallsign}
            onChange={(e) => setNewCallsign(e.target.value)}
          />

          <div>
            <label className="block text-xs font-mono-hud font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Assigned Team / Division
            </label>
            <select
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              className="w-full bg-slate-950/70 text-slate-100 font-mono-hud text-xs md:text-sm px-3.5 py-2.5 rounded-md border border-slate-700/60 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="Tactical Recon Unit Alpha">Tactical Recon Unit Alpha</option>
              <option value="Urban Hazard Search Team">Urban Hazard Search Team</option>
              <option value="Collapsed Structure Rapid Division">
                Collapsed Structure Rapid Division
              </option>
              <option value="Gas Infiltration Specialist">Gas Infiltration Specialist</option>
              <option value="Autonomous First Response Brigade">
                Autonomous First Response Brigade
              </option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 text-[11px] font-mono-hud text-slate-400">
            Note: Newly registered units begin immediately in <strong className="text-teal-300">STANDBY</strong> status,
            ready for assignment to disaster zones.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRegisterModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="amber" size="md">
              Confirm & Commission Unit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
