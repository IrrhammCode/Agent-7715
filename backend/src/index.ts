import dotenv from "dotenv";
import path from "path";
// Load environment variables from root .env BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { validateConfig } from "./config";
import agentRoutes from "./routes/agent";
import demoRoutes from "./routes/demo";
import { websocketService } from "./services/websocketService";

// Validate configuration
try {
  validateConfig();
} catch (error) {
  console.error("Configuration error:", error);
  process.exit(1);
}

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket
websocketService.initialize(server);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    websocketClients: websocketService.getConnectedClients(),
  });
});

// Routes
app.use("/api", agentRoutes);
app.use("/api/demo", demoRoutes);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Agent 7715 Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Agent API: http://localhost:${PORT}/api/trigger-agent`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);

  // Start agent execution loop (every 60 seconds)
  // Auto-execution is enabled by default, set AUTO_EXECUTE=false to disable
  const autoExecute = process.env.AUTO_EXECUTE !== "false";
  if (autoExecute) {
    const { agentOrchestrator } = require("./services/agentOrchestrator");
    agentOrchestrator.startExecutionLoop(60);
    console.log(`🔄 Auto-execution enabled (every 60s)`);
    console.log(`   Set AUTO_EXECUTE=false in .env to disable`);
  } else {
    console.log(`⏸️  Auto-execution disabled (manual trigger only)`);
  }
}).on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`   Please stop the process using port ${PORT} or change PORT in .env`);
    console.error(`   To find the process: netstat -ano | findstr :${PORT}`);
    console.error(`   To kill it: taskkill /F /PID <PID>`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});
