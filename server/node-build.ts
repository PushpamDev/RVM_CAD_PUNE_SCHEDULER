import path from "path";
import { createServer } from "./index";
import * as express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

// 1. Serve static files (like main.js, main.css)
// This must be BEFORE the catch-all middleware
app.use(express.static(distPath));

// 2. Handle React Router - serve index.html for all non-API, non-static routes
// This middleware will run *after* your API routes (from createServer)
// and *after* the static file handler above.
app.use((req, res, next) => {
  // If the request is for an API route, let it go.
  // The server will handle it or 404 if not found.
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return next();
  }

  // For everything else, send the main SPA file
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});