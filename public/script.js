document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const dashboard = document.getElementById('dashboard');
    const statusMessage = document.getElementById('status-message');
    const repoListContainer = document.getElementById('repo-list');

    // 1. Check Auth Status
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();

        if (data.loggedIn) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            dashboard.style.display = 'block';
            loadRepositories(); // Initial load
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }

    // 2. Helper to show status and alert
    const showStatus = (message, isError = false) => {
        statusMessage.textContent = message;
        statusMessage.className = isError ? 'status-error' : 'status-success';
        statusMessage.style.display = 'block';
        
        if (isError) {
            alert(`Error: ${message}`);
        }

        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    };

    // 3. Load Repositories
    async function loadRepositories() {
        repoListContainer.innerHTML = 'Loading repositories...';
        try {
            const response = await fetch('/api/repos');
            if (!response.ok) throw new Error('Failed to fetch repositories');
            
            const repos = await response.json();
            if (repos.length === 0) {
                repoListContainer.innerHTML = 'No repositories found.';
                return;
            }

            repoListContainer.innerHTML = '<ul class="repo-list-items">' + 
                repos.map(repo => {
                    const gitUrl = repo.clone_url;
                    const defaultBranch = repo.default_branch || 'main';
                    return `
                    <li class="repo-card">
                        <div class="repo-header">
                            <h3>${repo.name} <span class="visibility">${repo.private ? 'Private' : 'Public'}</span></h3>
                            <a href="${repo.html_url}" target="_blank" class="repo-link">View on GitHub →</a>
                        </div>
                        <p><small>${repo.description || 'No description'}</small></p>
                        
                        <div class="integration-box">
                            <h4>Git Integration Commands</h4>
                            <pre>git remote add origin ${gitUrl}
git branch -M ${defaultBranch}
git push -u origin ${defaultBranch}</pre>
                            <div class="copy-hint">Run these in your local project terminal to connect.</div>
                        </div>
                    </li>
                `}).join('') + '</ul>';
        } catch (error) {
            console.error('Load Repos Error:', error);
            repoListContainer.innerHTML = 'Error loading repositories.';
        }
    }

    // 4. Handle Create Repo Form
    const createRepoForm = document.getElementById('create-repo-form');
    createRepoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const repoName = document.getElementById('repo-name').value;
        console.log('Attempting to create repo:', repoName);

        try {
            const response = await fetch('/api/create-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: repoName })
            });
            
            const data = await response.json();

            if (response.ok) {
                showStatus(`Repository "${repoName}" created successfully!`);
                createRepoForm.reset();
                loadRepositories(); // Refresh the list
            } else {
                showStatus(data.error || 'Failed to create repository', true);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showStatus('Network error occurred. Check console for details.', true);
        }
    });

    // 5. Handle Update File Form
    const updateFileForm = document.getElementById('update-file-form');
    updateFileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const owner = document.getElementById('owner-name').value;
        const repo = document.getElementById('target-repo').value;
        const fileName = document.getElementById('file-name').value;
        const content = document.getElementById('file-content').value;

        try {
            const response = await fetch('/api/update-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner,
                    repo,
                    path: fileName,
                    content: content
                })
            });
            const data = await response.json();

            if (response.ok) {
                showStatus(`File "${fileName}" updated successfully!`);
                updateFileForm.reset();
            } else {
                showStatus(data.error || 'Failed to update file', true);
            }
        } catch (error) {
            showStatus('Network error occurred', true);
        }
    });
});
