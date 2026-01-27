import express from "express";
import { getCollections } from "./mongo.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);
const VALIDATION_MODE = (process.env.VALIDATION_MODE || "off").toLowerCase();

/**
 * Returns true if an object contains keys that can be used for operator/path injection:
 * - keys starting with '$' (MongoDB operators)
 * - keys containing '.' (dotted paths)
 */
function containsMongoOperators(value) {
  if (!value || typeof value !== "object") return false;

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) return true;
    if (containsMongoOperators(value[key])) return true;
  }
  return false;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * Demo login endpoint:
 * - insecure mode: directly uses { username, password } from req.body (vulnerable)
 * - secure mode: validates input, blocks operator injection, enforces string types
 */
app.post("/login", async (req, res) => {
  try {
    const { users } = await getCollections();

    if (VALIDATION_MODE === "on") {
      if (containsMongoOperators(req.body)) {
        return res.status(400).json({ error: "Invalid input" });
      }

      const { username, password } = req.body ?? {};
      if (typeof username !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Invalid input" });
      }

      const user = await users.findOne({ username, password });
      return res.json({ ok: Boolean(user) });
    }

    // Vulnerable path (demo only)
    const { username, password } = req.body ?? {};
    const user = await users.findOne({ username, password });
    return res.json({ ok: Boolean(user), mode: "vulnerable" });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  // Keep this simple for live demos
  console.log(`app listening on :${PORT} validation=${VALIDATION_MODE}`);
});
