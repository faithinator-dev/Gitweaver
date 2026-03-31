# GitWeaver

GitWeaver is a streamlined repository management tool designed to simplify the lifecycle of GitHub-hosted projects. It provides a centralized interface for creating, configuring, and updating repositories without manual intervention via the GitHub CLI or web portal.

## Overview

In modern development workflows, the overhead of managing multiple repositories can become significant. GitWeaver automates the administrative aspects of repository management, allowing developers to focus on implementation. 

## Key Features

- **Automated Repository Provisioning**: Create new GitHub repositories with custom descriptions directly from the dashboard.
- **Empty Initialization**: Repositories are created in a clean state (no initial files), optimized for pushing existing local projects.
- **Remote Content Management**: Update file contents within repositories directly via the integrated editor.
- **Secure GitHub Authentication**: Utilizes OAuth 2.0 for secure, scoped access to your GitHub account.
- **Streamlined Configuration**: Generates immediate remote configuration commands to connect local projects.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A GitHub OAuth Application (to obtain Client ID and Client Secret)

### Local Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/gitweaver.git
    cd gitweaver
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    GITHUB_CLIENT_ID=your_client_id
    GITHUB_CLIENT_SECRET=your_client_secret
    GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
    SESSION_SECRET=a_secure_random_string
    ```

4.  **Start the application**:
    ```bash
    npm start
    ```

## Usage

### 1. Authentication
Access `http://localhost:3000` and click **Login with GitHub**. This will authorize GitWeaver to manage your repositories.

### 2. Creating a Repository
Enter a name and an optional description in the "Create Repository" section. Once created, the dashboard will display the exact commands required to link your local code.

### 3. Updating Files
Use the "Edit Website Content" section to update existing files or create new ones in your target repositories by providing the repository owner and filename.

## License

This project is licensed under the MIT License.
