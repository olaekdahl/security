/**
 * Threat Modeling Demo - Main Server
 * Demonstrates STRIDE, PASTA, and DREAD methodologies with Node.js, MongoDB, and React
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB, getDB } from "./db/mongo.js";
import authRoutes from "./routes/auth.js";
import threatRoutes from "./routes/threats.js";
import assetsRoutes from "./routes/assets.js";
import analysisRoutes from "./routes/analysis.js";
import demoRoutes from "./routes/demo.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE (Demonstrates security best practices)
// ═══════════════════════════════════════════════════════════════

// Helmet adds various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate limiting to prevent DoS attacks (STRIDE: Denial of Service)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 auth attempts per 15 minutes
  message: { error: "Too many authentication attempts" },
});
app.use("/api/auth/login", authLimiter);

// Body parsing with size limits (prevents large payload attacks)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ═══════════════════════════════════════════════════════════════
// SECURITY LOGGING (Demonstrates audit logging for STRIDE: Repudiation)
// ═══════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  };
  
  // In production, send to SIEM/logging service
  console.log("[AUDIT]", JSON.stringify(logEntry));
  
  // Store in MongoDB for demonstration
  if (req.path !== "/api/health") {
    getDB()?.collection("audit_logs")?.insertOne(logEntry).catch(() => {});
  }
  
  next();
});

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════
app.use("/api/auth", authRoutes);
app.use("/api/threats", threatRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/demo", demoRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    security: {
      helmet: true,
      rateLimit: true,
      cors: true,
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING (Prevents information disclosure - STRIDE)
// ═══════════════════════════════════════════════════════════════
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err);
  
  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    error: isProduction ? "Internal server error" : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// ═══════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════
async function startServer() {
  try {
    await connectDB();
    console.log("✓ Connected to MongoDB");
    
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
      console.log("\n═══════════════════════════════════════════════════");
      console.log("  THREAT MODELING DEMO");
      console.log("  STRIDE | PASTA | DREAD");
      console.log("═══════════════════════════════════════════════════\n");
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
