require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Octokit } = require("octokit");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Security & Middleware
const isProduction = process.env.NODE_ENV === "production";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://unpkg.com", "'unsafe-inline'"], // unsafe-inline for the theme switcher script
      "img-src": ["'self'", "https://github.com", "https://*.githubusercontent.com", "data:", "https://avatars.githubusercontent.com"],
      "connect-src": ["'self'", "https://api.github.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/", limiter);

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: isProduction ? (process.env.CORS_ORIGIN ? corsOrigins : false) : corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET || "gw-secret-fallback"));
app.use(express.static(path.join(__dirname, "public")));

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.warn("CRITICAL: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing from .env");
}

// Helper to get Octokit instance for the current user
const getOctokit = (req) => {
  const token = req.signedCookies.github_token;
  if (!token) return null;
  return new Octokit({ auth: token });
};

// --- OAuth Routes ---

// 1. Redirect to GitHub OAuth
app.get("/auth/github", (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=repo,user`;
  res.redirect(githubAuthUrl);
});

// 2. Callback from GitHub
app.get("/auth/github/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No code provided");
  }

  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: GITHUB_REDIRECT_URI,
      },
      {
        headers: { Accept: "application/json" },
      },
    );

    const token = response.data.access_token;
    if (!token) {
      return res.status(400).send("Failed to exchange code for token");
    }

    // Store token in HTTP-only cookie
    res.cookie("github_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      signed: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax",
      path: "/",
    });

    res.redirect("/");
  } catch (error) {
    console.error(
      "OAuth Error:",
      error.response ? error.response.data : error.message,
    );
    res.status(500).send("Authentication failed");
  }
});

// --- API Endpoints ---

// Get current user info
app.get("/api/user", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { data } = await octokit.rest.users.getAuthenticated();
    res.json(data);
  } catch (error) {
    if (error.status === 401) {
      res.clearCookie("github_token");
      return res.status(401).json({ error: "GitHub session expired. Please sign in again." });
    }
    res.status(error.status || 500).json({ error: "Failed to fetch user info" });
  }
});

// Check authentication status
app.get("/api/auth-status", (req, res) => {
  const token = req.signedCookies.github_token;
  res.json({ loggedIn: !!token });
});

// List user repositories
app.get("/api/repos", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });
    res.json(data);
  } catch (error) {
    const status = error.status || 500;
    const githubMessage = error.response?.data?.message || error.message;

    if (status === 401) {
      res.clearCookie("github_token");
      return res.status(401).json({ error: "GitHub session expired. Please sign in again." });
    }

    res.status(status).json({ error: `Failed to fetch repositories: ${githubMessage}` });
  }
});

// Create a new repository
app.post("/api/create-repo", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { name, description, private: isPrivate, default_branch, readme, gitignore, license } = req.body;
  if (!name) return res.status(400).json({ error: "Repository name is required" });

  try {
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      description: description || "",
      private: isPrivate === true,
      default_branch: default_branch || "main",
      auto_init: readme || gitignore || license,
    });
    res.status(201).json(data);
  } catch (error) {
    const errorMessage = error.response ? error.response.data.message : error.message;
    res.status(error.status || 500).json({ error: `Failed to create repository: ${errorMessage}` });
  }
});

// Edit file in repository
app.post("/api/edit-file", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { repo, path: filePath, content, message } = req.body;
  if (!repo || !filePath || content === undefined) {
    return res.status(400).json({ error: "Missing required parameters: repo, path, or content" });
  }

  try {
    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
      return res.status(400).json({ error: "Repository format should be 'owner/repo'" });
    }

    // Get existing file SHA if it exists
    let sha;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo: repoName,
        path: filePath,
      });
      sha = data.sha;
    } catch (e) {
      // File doesn't exist, which is fine
    }

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: filePath,
      message: message || `Update ${filePath}`,
      content: Buffer.from(content).toString("base64"),
      sha: sha,
    });

    res.json({ message: "File updated successfully", data });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    res.status(error.status || 500).json({ error: `Failed to update file: ${errorMessage}` });
  }
});

// Update or Create a file (legacy endpoint)
app.post("/api/update-file", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { owner, repo, path: filePath, content, message } = req.body;
  if (!owner || !repo || !filePath || !content) return res.status(400).json({ error: "Missing parameters" });

  try {
    let sha;
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path: filePath });
      sha = data.sha;
    } catch (e) {}

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: message || `Update ${filePath}`,
      content: Buffer.from(content).toString("base64"),
      sha: sha,
    });
    res.json({ message: "File updated successfully", data });
  } catch (error) {
    res.status(500).json({ error: "Failed to update file" });
  }
});

// Get recent commits
app.get("/api/repos/:owner/:repo/commits", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });
  const { owner, repo } = req.params;
  try {
    const { data } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 10 });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: "Failed to fetch commits" });
  }
});

// List branches
app.get("/api/repos/:owner/:repo/branches", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });
  const { owner, repo } = req.params;
  try {
    const { data } = await octokit.rest.repos.listBranches({ owner, repo });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: "Failed to fetch branches" });
  }
});

// Create a branch
app.post("/api/repos/:owner/:repo/branches", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });
  const { owner, repo } = req.params;
  const { branch, from_branch } = req.body;
  try {
    const { data: refData } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${from_branch || "main"}` });
    const { data } = await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: refData.object.sha });
    res.status(201).json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: "Failed to create branch" });
  }
});

// Action Pulse
app.get("/api/repos/:owner/:repo/actions", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });
  const { owner, repo } = req.params;
  try {
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 1 });
    if (data.workflow_runs && data.workflow_runs.length > 0) {
      const run = data.workflow_runs[0];
      res.json({ status: run.status, conclusion: run.conclusion, url: run.html_url });
    } else {
      res.json({ status: "none", conclusion: "none" });
    }
  } catch (error) {
    res.json({ status: "none", conclusion: "none" });
  }
});

// AI Naming Forge
app.post("/api/generate-repo-name", async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: "Keyword required" });
  const prefixes = ["Neon", "Flux", "Void", "Quantum", "Apex", "Ether", "Zero", "Nova", "Cyber", "Synapse"];
  const suffixes = ["Link", "Core", "Forge", "Grid", "Pulse", "Flow", "Sync", "Wave", "Hub", "Node"];
  const suggestions = Array.from({ length: 3 }, () => {
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${p}${keyword.charAt(0).toUpperCase() + keyword.slice(1)}${s}`;
  });
  setTimeout(() => res.json({ suggestions }), 400);
});

// Logout
app.get("/auth/logout", (req, res) => {
  res.clearCookie("github_token", {
    httpOnly: true,
    secure: isProduction,
    signed: true,
    sameSite: "lax",
    path: "/",
  });
  res.redirect("/");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`GitWeaver server running on port ${port}`);
});
