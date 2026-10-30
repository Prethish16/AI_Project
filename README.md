RescueBot Command
RescueBot Command is a browser-based autonomous hazard exploration and rescue simulation. It models a robot operating in an unknown disaster environment, gathering observations, reasoning about hazards, planning routes, and attempting rescue and safe-return objectives.

The application uses a React + TypeScript interface with a deterministic classical-AI simulation engine. Browser localStorage is used to persist user accounts, sector memory, and simulation data.
Features
- Autonomous exploration: Simulates a robot exploring an environment using sensor observations and predefined movement rules.
- Knowledge representation: Maintains an internal representation of the environment, including safe cells and confirmed hazards.
- Logical inference: Applies hazard rules and inference to reason about unknown cells.
- Path planning: Uses Breadth-First Search (BFS) to find routes through cells considered safe.
- Rescue and return objectives: Supports goal selection and tracks exploration and mission outcomes.
- Sector memory: Retains information established by previous deployments to a sector.
- AI Logic Lab: Provides a place to inspect and test the simulation's reasoning behaviour.
- Command Peek: Provides a read-only view of relevant command or environment information without exposing hidden ground truth to the robot's reasoning.
- Mission and result views: Organizes mission control, incident logs, fleet information, telemetry, and simulation results.
Technology Stack
Area	Technologies
Frontend	React, TypeScript
Build tool	Vite
Styling	CSS
AI simulation	Deterministic classical-AI logic
Knowledge and planning	Knowledge representation, logical inference, BFS
Persistence	Browser localStorage


Architecture
The application follows a layered client-side architecture.
User / Operator
      |
      v
+-------------------------------+
| 1. User Interface Layer       |
| React + TypeScript            |
| Authentication, mission,      |
| fleet, logs, telemetry, HUD   |
+-------------------------------+
      |
      v
+-------------------------------+
| 2. Orchestration Layer        |
| Handles user input,           |
| initializes or loads sectors, |
| runs simulations, updates UI |
+-------------------------------+
      |
      v
+-------------------------------+
| 3. AI Simulation Engine       |
| Knowledge representation     |
| Logical inference             |
| BFS path planning             |
| Robot behaviour and actions  |
+-------------------------------+
      |
      v
+-------------------------------+
| 4. Persistence Layer          |
| Browser localStorage          |
| User accounts                 |
| Sector memory                 |
| Mission and simulation data   |
+-------------------------------+
Layer responsibilities
1. User Interface Layer — Presents the application screens and simulation information to the operator.
2. Orchestration Layer — Coordinates user actions, environment initialization or restoration, simulation execution, and result updates.
3. AI Simulation Engine — Handles environment reasoning, hazard assessment, path planning, and robot actions.
4. Persistence Layer — Saves and retrieves account, sector, mission, and simulation information through browser storage.
Sector memory and redeployment
A sector's stored hazard layout is used to reproduce the same environment during a later deployment. The robot does not receive the complete hidden layout as prior knowledge. It inherits only evidence established by the previous unit, such as confirmed safe cells, confirmed hazards, and the location where a unit was lost. This keeps the robot's reasoning separate from the environment's ground truth.

When a sector has no previous destroyed-unit record, the application can initialize a new environment. When such a record exists, it can reload the stored sector layout.
Project Structure
rescuebot-command/
├── src/
│   ├── components/
│   │   ├── grid/
│   │   │   └── TacticalGrid.tsx
│   │   ├── hud/
│   │   │   ├── ReasoningLog.tsx
│   │   │   └── TelemetryPanel.tsx
│   │   └── ui/
│   ├── pages/
│   │   ├── AILogicLabPage.tsx
│   │   ├── AuthPage.tsx
│   │   ├── FleetCenterPage.tsx
│   │   ├── IncidentLogsPage.tsx
│   │   └── MissionControlPage.tsx
│   ├── simulation/
│   │   ├── logic.ts
│   │   └── sectorMemory.ts
│   ├── storage/
│   │   ├── missionStore.ts
│   │   └── stateStore.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── types.ts
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
Getting Started
Prerequisites
- Node.js
- npm
Installation
1. Clone the repository:
   git clone <repository-url>
2. Move into the project directory:
   cd rescuebot-command
3. Install dependencies:
   npm install
4. Start the development server:
   npm run dev
5. Open the local URL printed in the terminal by Vite.
Production build
npm run build
To preview the production build locally:
npm run preview
AI Reasoning Design
The simulation uses deterministic, rule-based classical-AI techniques rather than a trained machine-learning model.
- The knowledge representation layer stores observations and the robot's current understanding of the environment.
- Logical inference evaluates hazard constraints and available evidence.
- BFS-based path planning searches for routes through cells currently treated as safe.
- Robot simulation executes actions and updates its knowledge from new observations.
The inference approach prioritizes soundness over completeness: it avoids declaring a cell hazardous without sufficient evidence, even if that means some hazards remain unresolved. This is important because a false hazard accusation could incorrectly block a safe route.
Data and Persistence
The project uses browser localStorage for client-side persistence. Data is therefore specific to the browser and device where the application is used; it is not automatically synchronized between users or devices.

Authentication and persistence are intended for demonstration purposes. A production deployment should use a backend service, a database, and securely hashed credentials.
Limitations
- The simulation runs in the browser and does not control a physical robot.
- localStorage does not provide multi-user synchronization or centralized data management.
- The reasoning engine is deterministic and rule-based; it is not a trained AI model.
- The inference strategy is sound but not complete, so it may leave some hazards unresolved.
License
Add a license here before distributing the project publicly.