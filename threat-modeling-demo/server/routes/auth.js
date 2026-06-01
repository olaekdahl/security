/**
 * Authentication Routes
 * Demonstrates secure authentication with threat modeling considerations
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Joi from "joi";
import { getDB } from "../db/mongo.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "demo-secret-change-in-production";
const JWT_EXPIRES_IN = "1h";
const BCRYPT_ROUNDS = 12;

// Input validation schemas (STRIDE: Tampering protection)
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid("user", "analyst").default("user"),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

/**
 * POST /api/auth/register
 * Register a new user with secure password hashing
 */
router.post("/register", async (req, res) => {
  try {
    // Validate input (STRIDE: Tampering prevention)
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password, role } = value;
    const db = getDB();

    // Check for existing user (prevent enumeration by generic error)
    const existingUser = await db.collection("users").findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      // STRIDE: Information Disclosure - Don't reveal which field exists
      return res.status(409).json({ error: "User already exists" });
    }

    // Hash password with bcrypt (STRIDE: Spoofing protection)
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = {
      username,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      lastLogin: null,
      failedLoginAttempts: 0,
      accountLocked: false,
    };

    await db.collection("users").insertOne(user);

    // Audit log (STRIDE: Repudiation prevention)
    await db.collection("audit_logs").insertOne({
      action: "USER_REGISTERED",
      username,
      timestamp: new Date(),
      ip: req.ip,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: { username, email, role },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /api/auth/login
 * Secure login with brute force protection
 */
router.post("/login", async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const { username, password } = value;
    const db = getDB();

    // Find user
    const user = await db.collection("users").findOne({ username });

    // Generic error message (STRIDE: Information Disclosure prevention)
    const invalidCredentialsError = { error: "Invalid credentials" };

    if (!user) {
      // Timing attack prevention: still hash something
      await bcrypt.hash("dummy", BCRYPT_ROUNDS);
      return res.status(401).json(invalidCredentialsError);
    }

    // Check if account is locked (STRIDE: DoS / abuse prevention)
    if (user.accountLocked) {
      await db.collection("audit_logs").insertOne({
        action: "LOGIN_ATTEMPT_LOCKED_ACCOUNT",
        username,
        timestamp: new Date(),
        ip: req.ip,
      });
      return res.status(423).json({ error: "Account locked. Contact support." });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const lockAccount = failedAttempts >= 5;

      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            failedLoginAttempts: failedAttempts,
            accountLocked: lockAccount,
            lastFailedLogin: new Date(),
          },
        }
      );

      // Audit log
      await db.collection("audit_logs").insertOne({
        action: lockAccount ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
        username,
        failedAttempts,
        timestamp: new Date(),
        ip: req.ip,
      });

      return res.status(401).json(invalidCredentialsError);
    }

    // Successful login - reset failed attempts
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: 0,
          lastLogin: new Date(),
        },
      }
    );

    // Generate JWT (STRIDE: Spoofing protection via signed token)
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit log (STRIDE: Repudiation prevention)
    await db.collection("audit_logs").insertOne({
      action: "LOGIN_SUCCESS",
      username,
      timestamp: new Date(),
      ip: req.ip,
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /api/auth/logout
 * Logout and audit
 */
router.post("/logout", async (req, res) => {
  try {
    // In a real app, you'd invalidate the token (add to blocklist or use Redis)
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        await getDB().collection("audit_logs").insertOne({
          action: "LOGOUT",
          username: decoded.username,
          timestamp: new Date(),
          ip: req.ip,
        });
      } catch {
        // Token might be expired, still allow logout
      }
    }

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: "Logout failed" });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.collection("users").findOne(
      { username: req.user.username },
      { projection: { password: 0 } } // Never return password
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to get user info" });
  }
});

/**
 * Authentication middleware
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(403).json({ error: "Invalid token" });
  }
}

/**
 * Authorization middleware - check role
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    if (!roles.includes(req.user.role)) {
      // Audit unauthorized access attempt
      getDB().collection("audit_logs").insertOne({
        action: "UNAUTHORIZED_ACCESS_ATTEMPT",
        username: req.user.username,
        requiredRoles: roles,
        userRole: req.user.role,
        path: req.path,
        timestamp: new Date(),
        ip: req.ip,
      });
      
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    next();
  };
}

export default router;
