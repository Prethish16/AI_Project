import React, { useState } from 'react';
import { stateStore } from '../storage/stateStore';
import { UserProfile } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Shield, UserCheck, Key, Lock, CheckCircle2, User } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(stateStore.getCurrentUser());
  const [authMode, setAuthMode] = useState<'RESPONDER' | 'ADMIN'>('RESPONDER');

  // Responder Form
  const [respUsername, setRespUsername] = useState<string>('');
  const [respCallsign, setRespCallsign] = useState<string>('');
  const [respTeam, setRespTeam] = useState<string>('Tactical Recon Unit Alpha');

  // Command Admin Form
  const [adminPasskey, setAdminPasskey] = useState<string>('');
  const [adminError, setAdminError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleResponderLogin = (e: React.FormEvent) => {
    e.preventDefault();
    stateStore.loginResponder(respUsername, respCallsign, respTeam);
    setCurrentUser(stateStore.getCurrentUser());
    setSuccessMsg('Field Responder session activated successfully.');
    setTimeout(() => {
      setSuccessMsg('');
      if (onAuthSuccess) onAuthSuccess();
    }, 1200);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    const success = stateStore.loginAdmin(adminPasskey);
    if (success) {
      setCurrentUser(stateStore.getCurrentUser());
      setSuccessMsg('Command Officer credentials verified. Admin privileges granted.');
      setTimeout(() => {
        setSuccessMsg('');
        if (onAuthSuccess) onAuthSuccess();
      }, 1200);
    } else {
      setAdminError('Invalid Command Security Passkey. Access restricted.');
    }
  };

  const handleLogout = () => {
    stateStore.logout();
    setCurrentUser(stateStore.getCurrentUser());
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Current Active Operator Profile */}
      <Card className="border border-white/10 glass-panel shadow-2xl">
        <CardHeader className="bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <div>
              <CardTitle className="text-slate-100">CURRENT OPERATOR SESSION</CardTitle>
              <p className="font-mono-hud text-xs text-slate-400 mt-0.5">
                Active credential profile in RescueBot Command
              </p>
            </div>
          </div>

          <Badge variant={currentUser.role === 'COMMAND_ADMIN' ? 'coral' : 'teal'} dot>
            {currentUser.role === 'COMMAND_ADMIN' ? 'COMMAND OFFICER (ADMIN)' : 'FIELD RESPONDER'}
          </Badge>
        </CardHeader>

        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-white/5 font-mono-hud text-xs">
            <div className="space-y-1">
              <div className="text-slate-500 uppercase text-[10px]">Callsign & Handle</div>
              <div className="text-sm font-bold text-slate-200">
                {currentUser.callsign} ({currentUser.username})
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-slate-500 uppercase text-[10px]">Badge Number</div>
              <div className="text-sm font-bold text-amber-400">{currentUser.badgeNumber}</div>
            </div>

            <div className="space-y-1">
              <div className="text-slate-500 uppercase text-[10px]">Division Assignment</div>
              <div className="text-sm font-bold text-cyan-300">{currentUser.team}</div>
            </div>

            <div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Reset Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Notification */}
      {successMsg && (
        <Alert variant="success" title="AUTHENTICATION SUCCESS">
          {successMsg}
        </Alert>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-950/80 border border-white/10 font-mono-hud text-xs">
        <button
          onClick={() => {
            setAuthMode('RESPONDER');
            setAdminError('');
          }}
          className={`flex-1 py-2.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            authMode === 'RESPONDER'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>FIELD RESPONDER SIGNUP / LOGIN</span>
        </button>

        <button
          onClick={() => {
            setAuthMode('ADMIN');
            setAdminError('');
          }}
          className={`flex-1 py-2.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            authMode === 'ADMIN'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>RESTRICTED COMMAND OFFICER GATE</span>
        </button>
      </div>

      {/* Responder Form */}
      {authMode === 'RESPONDER' && (
        <Card className="border border-white/10">
          <CardHeader className="bg-slate-900/80">
            <CardTitle className="text-amber-400">RESPONDER OPERATOR SIGNUP / ONBOARDING</CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleResponderLogin} className="space-y-4">
              <Input
                label="Operator Name / Handle"
                placeholder="e.g. Maya Chen, John Doe"
                value={respUsername}
                onChange={(e) => setRespUsername(e.target.value)}
                required
              />

              <Input
                label="Tactical Callsign"
                placeholder="e.g. Phoenix-1, Echo-Lead"
                value={respCallsign}
                onChange={(e) => setRespCallsign(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-mono-hud font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assigned Response Division
                </label>
                <select
                  value={respTeam}
                  onChange={(e) => setRespTeam(e.target.value)}
                  className="w-full bg-slate-950/70 text-slate-100 font-mono-hud text-xs md:text-sm px-3.5 py-2.5 rounded-md border border-slate-700/60 focus:border-amber-400 focus:outline-none"
                >
                  <option value="Tactical Recon Unit Alpha">Tactical Recon Unit Alpha</option>
                  <option value="Urban Hazard Search Team">Urban Hazard Search Team</option>
                  <option value="Collapsed Structure Rapid Division">
                    Collapsed Structure Rapid Division
                  </option>
                  <option value="Gas Infiltration Specialist">Gas Infiltration Specialist</option>
                </select>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="amber" size="md" className="w-full">
                  Activate Responder Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Admin Gate Form */}
      {authMode === 'ADMIN' && (
        <Card className="border border-red-500/30 glass-panel-coral">
          <CardHeader className="bg-slate-900/80">
            <CardTitle className="text-red-400 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-400" />
              GATED COMMAND OFFICER ACCESS
            </CardTitle>
            <Badge variant="coral">Restricted Protocol</Badge>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <p className="font-mono-hud text-xs text-slate-300">
                This terminal requires elevated clearance to decommission hardware, overhaul destroyed
                robot chassis, and adjust system-level logic thresholds.
              </p>

              <Input
                label="Command Officer Security Passkey"
                type="password"
                placeholder="Enter passkey..."
                value={adminPasskey}
                onChange={(e) => setAdminPasskey(e.target.value)}
                error={adminError}
                icon={<Key className="w-4 h-4" />}
                required
              />

              <div className="p-3 rounded-lg bg-slate-950/80 border border-white/5 font-mono-hud text-[11px] text-slate-400">
                <span className="text-amber-400 font-bold">Authorized AI Course Passkey: </span>
                <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">COMMAND-AI-SECURE</code>
                <span className="text-slate-500 ml-2">(or ADMIN2026)</span>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="coral" size="md" className="w-full">
                  Authorize Command Admin Session
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
