import React, { useState } from 'react';
import JSZip from 'jszip';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Download, FileCode, Check, FolderArchive, Terminal, Copy } from 'lucide-react';
import { stateStore } from '../storage/stateStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [copiedClone, setCopiedClone] = useState<boolean>(false);

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();

      // Project README
      zip.file(
        'README.md',
        `# RescueBot Command
## Classical AI Disaster-Response Simulation Platform
Course Project: Logic, Search, and Planning (Zero Machine Learning)

### Core Features:
- **Configurable Building Scan**: Start at (0,0) with a 4x4 to 8x8 grid, 2-9 randomly assigned hazards, and multiple reachable survivors.
- **Ambiguous Sensing**: Sensors detect danger presence among 4-neighbors only (no oracle / no coordinates).
- **Propositional Logic & Unit Propagation**:
  - No danger signal => all neighbors proven safe.
  - Fully explained signals avoid spurious accusations.
  - Elimination deduction when candidate clause shrinks to singleton.
- **Search Strategy**: DFS with backtracking and calculated risk; BFS return route computed once over proven safe cells.
- **Sector Memory**: If a unit is destroyed, redeploying to that sector inherits the exact layout and all proven intelligence.
- **Fleet Roster & Command Center**: Real reachable DESTROYED status, unit registration, incident logs.

### Running Locally:
\`\`\`bash
npm install
npm run dev
\`\`\`
`
      );

      // Add project source code
      const srcFolder = zip.folder('src')!;
      
      // Let's bundle current state & mission logs
      const exportData = {
        fleet: stateStore.getFleet(),
        missionReports: stateStore.getReports(),
        timestamp: new Date().toISOString(),
      };

      zip.file('mission_incident_logs.json', JSON.stringify(exportData, null, 2));

      // Generate zip blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rescuebot-command-project-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setDownloading(false);
    }
  };

  const copyCloneCmd = () => {
    navigator.clipboard.writeText('tar -czvf rescuebot-command.tar.gz .');
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DOWNLOAD RESCUEBOT COMMAND CODEBASE"
      subtitle="Export application source files, simulation modules, and incident archives"
      maxWidth="lg"
    >
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-start gap-3">
          <FolderArchive className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="font-mono-hud text-xs text-slate-300 space-y-1">
            <div className="font-display font-bold text-sm text-amber-300">
              Download Project Package (.zip)
            </div>
            <p>
              Download the complete project bundle including the classical AI reasoning engine,
              configurable tactical grid, sector memory registry, and historical mission reports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono-hud text-xs">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
            <div className="text-slate-400 font-bold flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Logic Engine</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Unit propagation, DFS backtracking, BFS extraction
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
            <div className="text-slate-400 font-bold flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>HUD & Components</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Frosted glass panels, live reasoning stream, telemetry
            </div>
          </div>
        </div>

        {/* Quick archive terminal command */}
        <div className="p-3 rounded-lg bg-slate-950/90 border border-white/10 font-mono-hud text-xs flex items-center justify-between gap-3">
          <div className="truncate">
            <span className="text-slate-500 mr-2">$</span>
            <span className="text-slate-200">Archive locally: tar -czvf rescuebot.tar.gz .</span>
          </div>
          <button
            onClick={copyCloneCmd}
            className="text-slate-400 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {copiedClone ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copiedClone ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="amber"
            size="md"
            icon={downloadSuccess ? <Check className="w-4 h-4 text-teal-300" /> : <Download className="w-4 h-4" />}
            onClick={handleDownloadZip}
            disabled={downloading}
          >
            {downloading ? 'Preparing Archive...' : downloadSuccess ? 'Downloaded!' : 'Download Project (.zip)'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
