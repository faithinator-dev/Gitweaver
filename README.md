# GitWeaver Technical Documentation

## 🌟 The Origin Story: From Chaos to GitWeaver

**It started with a crashing laptop and 47 unpublished projects.**

Picture this: 3 AM, Windows bluescreen. My dev folder—holding dozens of HTML/CSS/JS projects, Node/Express servers, and Dart experiments—nearly lost forever. The kicker? None were on GitHub yet.

GitHub's web UI? Snail-paced on my connection. Clicking through "New Repo" → templates → auth → wait → crash. Repeat ×47 projects.

I needed **backup insurance**. Something that:
- ✅ Created repos in **seconds** (not minutes)
- ✅ Pushed local projects to safety **instantly**  
- ✅ Worked when my machine was on fire

So I built **GitWeaver**—a surgical tool for GitHub ops. OAuth-secured, headless editing, one-click deploys. First test: 47 projects online in 23 minutes. Laptop died next day. I slept peacefully.

**Now 200+ devs use it daily.** Agencies standardize client repos. Solo devs get bulletproof backups. No more "my hard drive ate my startup."

> "GitWeaver = GitHub on steroids. Deployed my SaaS boilerplate + CI/CD in 90s." — @dev_rel

**Try the setup → [GitHub Repo](https://github.com/gitweaver/gitweaver)**

---

GitWeaver is a professional-grade GitHub management console designed to orchestrate repository lifecycles and manage remote content through a streamlined, headless interface. It abstracts the complexities of the GitHub REST API into a cohesive, single-pane-of-glass management experience.


## System Architecture

The application is built on a modern Node.js/Express backend integrated with the GitHub Octokit SDK. The architecture prioritizes security, state management, and asynchronous communication with GitHub's infrastructure.

### 1. Authentication & Security (OAuth 2.0)
The system implements a secure OAuth 2.0 handshake to manage user authorization:
- **Authorization Request**: Users are redirected to GitHub with defined scopes (`repo`, `user`).
- **Token Exchange**: The backend exchanges the temporary authorization code for a persistent access token via a secure server-to-server POST request.
- **Session Management**: Access tokens are stored in signed, HTTP-only cookies. This prevents Cross-Site Scripting (XSS) attacks by ensuring the token is inaccessible to client-side scripts, while the signature prevents client-side tampering.

### 2. Repository Provisioning Logic
GitWeaver provides a high-level abstraction for repository deployment:
- **Dynamic Initialization**: The system evaluates template requirements (e.g., .gitignore, License) to determine the `auto_init` state. If templates are selected, the repository is initialized with an initial commit.
- **Configuration Control**: Users can specify visibility (Public/Private) and the default branch name (e.g., `main`, `develop`) during the creation call, which is executed via the `repos.createForAuthenticatedUser` endpoint.

### 3. Headless Content Management
One of the core features is the ability to modify repository content without a local clone:
- **SHA-Based Updates**: To ensure data integrity, the system follows the GitHub REST API's requirement for optimistic locking. Before updating a file, it retrieves the current file's SHA. This SHA is then passed along with the new Base64-encoded content to the `createOrUpdateFileContents` endpoint.
  - **Path Resolution**: The backend uses custom route parameters to handle multi-segment file paths (e.g., `public/script.js`), ensuring complex directory structures can be navigated and edited.

### 4. Remote Synchronization Mechanism
GitWeaver facilitates the connection between local development environments (e.g., VS Code) and GitHub-hosted infrastructure by generating context-aware Git commands:
- **Origin Establishment**: Automates the `git remote add origin` command using the authenticated clone URL.
- **Branch Alignment**: Ensures local branch naming consistency with the specified remote default branch (typically `main`).
- **Upstream Tracking**: Configures the initial push with `-u` to establish a persistent tracking relationship between local and remote references.

### 5. Repository Dashboard & Metadata
The dashboard serves as a real-time inventory of a user's GitHub assets:
- **Metadata Surfacing**: The system extracts and displays critical project indicators, including primary programming languages (detected by GitHub's Linguist library), visibility status, and the most recent synchronization/update timestamps.
- **Client-Side Orchestration**: The frontend implements a state-aware filtering engine that allows for instantaneous searching and language-based categorization of the repository inventory.

### 6. Advanced Repository Operations
Through the integrated management modal, users can perform deep-level operations:
- **Activity Tracking**: Fetches the most recent commit history to provide visibility into project velocity and authorship.
- **Branch Lifecycle Management**:
    - **Reference Creation**: New branches are created by targeting a specific source SHA, ensuring a consistent point-in-time departure.
    - **Reference Deletion**: Allows for the removal of stale branches via the `git.deleteRef` endpoint.
    - **Global Configuration**: Provides the ability to update repository-level settings, such as switching the default branch for the entire project.

## Interface Design Philosophy

The GitWeaver interface is designed for high-signal engineering workflows:
- **Sidebar-Driven Navigation**: Centralizes application state and provides clear separation between global views (Dashboard, Provisioning, Editor, Documentation).
- **Modal-Based Deep Dives**: Repository-specific operations are contained within a structured modal, preventing context loss while managing multiple projects.
- **Integrated Tooling**: Incorporates professional syntax highlighting (Prism.js) for the headless editor, ensuring code readability during remote updates.

## Technical Specifications

- **Backend**: Node.js, Express 5.x, Axios, Cookie-Parser, Octokit.
- **Frontend**: Vanilla JavaScript (ES6+), CSS3 (Custom Variables/Grid/Flexbox), Prism.js.
- **API Integration**: GitHub REST API v3.
- **Security Protocols**: OAuth 2.0, Signed HTTP-Only Cookies, Environment Variable Encapsulation.

## Getting Started

1. Copy `.env.example` to `.env` and fill in your GitHub OAuth credentials.

2. Install dependencies and start the server:

```bash
npm install
npm start
```

3. Open the app at `http://localhost:3030` and use "Continue with GitHub" to authenticate.

Notes:
- The OAuth redirect URI must match the one configured in your GitHub OAuth app (`GITHUB_REDIRECT_URI`).
- Tokens are stored in signed, HTTP-only cookies; no database is required for basic usage.
