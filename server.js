require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { Octokit } = require("octokit");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET || "secret"));
app.use(express.static(path.join(__dirname, "public")));

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;

// Helper to get Octokit instance for the current user
const getOctokit = (req) => {
  const token = req.signedCookies.github_token;
  if (!token) return null;
  return new Octokit({ auth: token });
};

// --- OAuth Routes ---

// 1. Redirect to GitHub OAuth
app.get("/auth/github", (req, res) => {
  // Requesting 'repo' and 'user' scopes
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
    const status = error.status || error.response?.status || 500;
    const githubMessage = error.response?.data?.message || error.message;

    console.error("List Repos Error:", {
      status,
      message: githubMessage,
      documentation_url: error.response?.data?.documentation_url,
    });

    if (status === 401) {
      // Token is invalid/expired/revoked, force clean re-auth flow.
      res.clearCookie("github_token");
      return res.status(401).json({
        error: "GitHub session expired or invalid. Please sign in again.",
      });
    }

    if (status === 403 && /rate limit/i.test(githubMessage || "")) {
      return res.status(403).json({
        error:
          "GitHub API rate limit reached. Please wait a few minutes and try again.",
      });
    }

    res.status(status).json({ error: `Failed to fetch repositories: ${githubMessage}` });
  }
});

// Create a new repository
app.post("/api/create-repo", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const {
    name,
    description,
    private: isPrivate,
    default_branch,
    license_template,
    gitignore_template,
  } = req.body;
  if (!name)
    return res.status(400).json({ error: "Repository name is required" });

  try {
    console.log(`Processing repository creation: ${name}`);
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      description: description || "",
      private: isPrivate === true,
      default_branch: default_branch || "main",
      auto_init: !!(license_template || gitignore_template), // Auto-init if templates are selected
      license_template: license_template || undefined,
      gitignore_template: gitignore_template || undefined,
    });
    console.log(`Repository created: ${data.full_name}`);
    res
      .status(201)
      .json({ message: "Repository created successfully", repo: data });
  } catch (error) {
    console.error("Repository Creation Error:", error.message, error.status);
    const errorMessage = error.response
      ? JSON.stringify(error.response.data)
      : error.message;
    res
      .status(error.status || 500)
      .json({ error: `GitHub API Error: ${errorMessage}` });
  }
});

// Update or Create a file in a repository
app.post("/api/update-file", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { owner, repo, path: filePath, content, message } = req.body;
  if (!owner || !repo || !filePath || !content) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // 1. Get the SHA of the file if it exists
    let sha;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
      sha = data.sha;
    } catch (e) {
      // File doesn't exist yet, that's fine for initial commit
    }

    // 2. Create or update file content
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: message || `Update ${filePath}`,
      content: Buffer.from(content).toString("base64"),
      sha: sha, // Required if updating existing file
    });

    res.json({ message: "File updated successfully", data });
  } catch (error) {
    console.error("Update File Error:", error);
    res.status(500).json({ error: "Failed to update file" });
  }
});

// Get file content
app.get("/api/repos/:owner/:repo/file-content", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { owner, repo } = req.params;
  const filePath = req.query.path;

  if (!filePath) return res.status(400).json({ error: "Path parameter is required" });

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
    });
    // GitHub returns content in base64 for files
    if (data.content) {
      data.decodedContent = Buffer.from(data.content, "base64").toString(
        "utf-8",
      );
    }
    res.json(data);
  } catch (error) {
    console.error("Fetch Content Error:", error);
    res
      .status(error.status || 500)
      .json({ error: "Failed to fetch file content" });
  }
});

// Get recent commits
app.get("/api/repos/:owner/:repo/commits", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { owner, repo } = req.params;

  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 10,
    });
    res.json(data);
  } catch (error) {
    console.error("Fetch Commits Error:", error);
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
    console.error("Fetch Branches Error:", error);
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
    // 1. Get the SHA of the source branch
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${from_branch || "main"}`,
    });

    // 2. Create the new reference
    const { data } = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: refData.object.sha,
    });

    res.status(201).json(data);
  } catch (error) {
    console.error("Create Branch Error:", error);
    res.status(error.status || 500).json({ error: "Failed to create branch" });
  }
});

// Delete a branch
app.delete("/api/repos/:owner/:repo/branches/:branch", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { owner, repo, branch } = req.params;

  try {
    await octokit.rest.git.deleteRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    res.json({ message: `Branch ${branch} deleted successfully` });
  } catch (error) {
    console.error("Delete Branch Error:", error);
    res.status(error.status || 500).json({ error: "Failed to delete branch" });
  }
});

// Update repository (e.g., default branch)
app.patch("/api/repos/:owner/:repo", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { owner, repo } = req.params;
  const { default_branch } = req.body;

  try {
    const { data } = await octokit.rest.repos.update({
      owner,
      repo,
      default_branch,
    });
    res.json(data);
  } catch (error) {
    console.error("Update Repo Error:", error);
    res
      .status(error.status || 500)
      .json({ error: "Failed to update repository" });
  }
});

// List repository contents
app.get("/api/repos/:owner/:repo/contents", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { owner, repo } = req.params;
  const filePath = req.query.path || "";

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
    });
    res.json(data);
  } catch (error) {
    console.error("List Contents Error:", error);
    res.status(error.status || 500).json({ error: "Failed to list contents" });
  }
});

// Download ZIP
app.get("/api/repos/:owner/:repo/zip", async (req, res) => {
  const octokit = getOctokit(req);
  if (!octokit) return res.status(401).json({ error: "Unauthorized" });

  const { owner, repo } = req.params;

  try {
    const response = await octokit.rest.repos.downloadZipballArchive({
      owner,
      repo,
      ref: "main" // Defaulting to main, could be dynamic
    });
    res.redirect(response.url);
  } catch (error) {
    // If 'main' fails, try 'master'
    try {
      const response = await octokit.rest.repos.downloadZipballArchive({
        owner,
        repo,
        ref: "master"
      });
      res.redirect(response.url);
    } catch (e) {
      console.error("Download ZIP Error:", e);
      res.status(e.status || 500).json({ error: "Failed to download repository" });
    }
  }
});

// GitHub Trending API (Search by stars)
app.get("/api/trending", async (req, res) => {
  const octokit = getOctokit(req);
  // Optional auth for trending, but better with it
  const auth = octokit || new Octokit();

  try {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const dateStr = lastWeek.toISOString().split("T")[0];

    const { data } = await auth.rest.search.repos({
      q: `created:>${dateStr}`,
      sort: "stars",
      order: "desc",
      per_page: 10,
    });
    res.json(data.items);
  } catch (error) {
    console.error("Trending API Error:", error);
    res.status(500).json({ error: "Failed to fetch trending repos" });
  }
});

// AI Commit Architect: Generate professional commit messages
app.post("/api/generate-commit-message", async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || !content) {
    return res.status(400).json({ error: "File path and content required" });
  }

  // A "Heuristic AI" engine to analyze the code
  const generateMessage = (file, code) => {
    const ext = file.split(".").pop();
    const fileName = file.split("/").pop();

    // 1. Detect common patterns
    if (code.includes("import") || code.includes("require")) {
      return `refactor: update dependencies and imports in ${fileName}`;
    }
    if (code.includes("function") || code.includes("const") || code.includes("class")) {
      return `feat: implement core logic in ${fileName}`;
    }
    if (ext === "md") {
      return `docs: update documentation for ${fileName}`;
    }
    if (ext === "json" || ext === "yml" || ext === "yaml") {
      return `chore: update configuration in ${fileName}`;
    }
    if (code.length < 50) {
      return `fix: minor adjustments to ${fileName}`;
    }

    return `style: refine structure and formatting of ${fileName}`;
  };

  const message = generateMessage(filePath, content);
  
  // Simulate AI "thinking" time for premium feel
  setTimeout(() => {
    res.json({ message });
  }, 600);
});

// Logout
app.get("/auth/logout", (req, res) => {
  res.clearCookie("github_token");
  res.redirect("/");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`GitWeaver server running on port ${port}`);
});
