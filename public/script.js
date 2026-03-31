document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const dashboard = document.getElementById('dashboard');
    const statusMessage = document.getElementById('status-message');
    const repoListContainer = document.getElementById('repo-list');
    const landingContent = document.getElementById('landing-content');

    // Modal elements
    const repoModal = document.getElementById('repo-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalRepoName = document.getElementById('modal-repo-name');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let allRepos = [];
    let currentRepo = null;

    // 1. Check Auth Status
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();

        if (data.loggedIn) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            dashboard.style.display = 'block';
            if (landingContent) landingContent.style.display = 'none';
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
            
            allRepos = await response.json();
            renderRepositories(allRepos);
            updateLanguageFilter(allRepos);
        } catch (error) {
            console.error('Load Repos Error:', error);
            repoListContainer.innerHTML = 'Error loading repositories.';
        }
    }

    function renderRepositories(repos) {
        if (repos.length === 0) {
            repoListContainer.innerHTML = 'No repositories found.';
            return;
        }

        repoListContainer.innerHTML = '<ul class="repo-list-items">' + 
            repos.map(repo => {
                const gitUrl = repo.clone_url;
                const defaultBranch = repo.default_branch || 'main';
                const updatedAt = new Date(repo.updated_at).toLocaleDateString();
                
                return `
                <li class="repo-card" onclick="openRepoModal('${repo.owner.login}', '${repo.name}')">
                    <div class="repo-header">
                        <h3>${repo.name} <span class="visibility">${repo.private ? 'Private' : 'Public'}</span></h3>
                        <a href="${repo.html_url}" target="_blank" class="repo-link" onclick="event.stopPropagation()">View on GitHub</a>
                    </div>
                    
                    <div class="metadata">
                        ${repo.language ? `
                        <span class="lang-tag">
                            <span class="lang-dot"></span>
                            ${repo.language}
                        </span>` : ''}
                        <span class="updated-at">Updated on ${updatedAt}</span>
                    </div>

                    <p><small>${repo.description || 'No description provided.'}</small></p>
                    
                    <div class="integration-box" onclick="event.stopPropagation()">
                        <h4>Remote Configuration Commands</h4>
                        <pre>git remote add origin ${gitUrl}
git branch -M ${defaultBranch}
git push -u origin ${defaultBranch}</pre>
                        <div class="copy-hint">Execute these commands in your local repository to establish a connection.</div>
                    </div>
                </li>
            `}).join('') + '</ul>';
    }

    // Modal Logic
    window.openRepoModal = async (owner, repoName) => {
        currentRepo = { owner, name: repoName };
        modalRepoName.textContent = `${owner} / ${repoName}`;
        repoModal.style.display = 'block';
        
        // Reset tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        tabBtns[0].classList.add('active');
        tabContents[0].classList.add('active');
        
        loadCommits(owner, repoName);
    };

    closeModal.onclick = () => {
        repoModal.style.display = 'none';
        currentRepo = null;
    };

    window.onclick = (event) => {
        if (event.target == repoModal) {
            repoModal.style.display = 'none';
            currentRepo = null;
        }
    };

    tabBtns.forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            if (tabId === 'commits') loadCommits(currentRepo.owner, currentRepo.name);
            if (tabId === 'branches') loadBranches(currentRepo.owner, currentRepo.name);
        };
    });

    async function loadCommits(owner, repo) {
        const list = document.getElementById('commits-list');
        list.innerHTML = 'Loading commits...';
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/commits`);
            const commits = await res.json();
            list.innerHTML = commits.map(c => `
                <div class="commit-item">
                    <div class="commit-header">
                        <span class="commit-author">${c.commit.author.name}</span>
                        <span class="commit-date">${new Date(c.commit.author.date).toLocaleString()}</span>
                    </div>
                    <p class="commit-message">${c.commit.message}</p>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = 'Failed to load commits.';
        }
    }

    async function loadBranches(owner, repo) {
        const list = document.getElementById('branches-list');
        list.innerHTML = 'Loading branches...';
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/branches`);
            const branches = await res.json();
            
            // Get repo info for default branch
            const repoRes = await fetch(`/api/repos`);
            const repos = await repoRes.json();
            const repoInfo = repos.find(r => r.name === repo);
            const defaultBranch = repoInfo ? repoInfo.default_branch : 'main';

            list.innerHTML = branches.map(b => `
                <div class="branch-item">
                    <span class="branch-name">
                        ${b.name}
                        ${b.name === defaultBranch ? '<span class="branch-badge">Default</span>' : ''}
                    </span>
                    <div class="branch-item-actions">
                        ${b.name !== defaultBranch ? `
                            <button onclick="setDefaultBranch('${owner}', '${repo}', '${b.name}')" class="btn btn-secondary btn-small">Set Default</button>
                            <button onclick="deleteBranch('${owner}', '${repo}', '${b.name}')" class="btn btn-secondary btn-small btn-danger-text">Delete</button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = 'Failed to load branches.';
        }
    }

    window.setDefaultBranch = async (owner, repo, branch) => {
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ default_branch: branch })
            });
            if (res.ok) {
                showStatus(`Default branch updated to ${branch}`);
                loadBranches(owner, repo);
                loadRepositories();
            }
        } catch (e) { showStatus('Failed to update default branch', true); }
    };

    window.deleteBranch = async (owner, repo, branch) => {
        if (!confirm(`Are you sure you want to delete branch "${branch}"?`)) return;
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/branches/${branch}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showStatus(`Branch ${branch} deleted`);
                loadBranches(owner, repo);
            }
        } catch (e) { showStatus('Failed to delete branch', true); }
    };

    document.getElementById('create-branch-btn').onclick = async () => {
        const name = document.getElementById('new-branch-name').value;
        if (!name) return;
        try {
            const res = await fetch(`/api/repos/${currentRepo.owner}/${currentRepo.name}/branches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch: name })
            });
            if (res.ok) {
                showStatus(`Branch ${name} created`);
                document.getElementById('new-branch-name').value = '';
                loadBranches(currentRepo.owner, currentRepo.name);
            }
        } catch (e) { showStatus('Failed to create branch', true); }
    };

    // Editor Logic in Modal
    document.getElementById('load-file-btn').onclick = async () => {
        const path = document.getElementById('editor-file-path').value;
        if (!path) return;
        try {
            const res = await fetch(`/api/repos/${currentRepo.owner}/${currentRepo.name}/contents/${path}`);
            const data = await res.json();
            if (data.decodedContent) {
                document.getElementById('modal-file-content').value = data.decodedContent;
                showStatus(`Loaded ${path}`);
            } else {
                showStatus('Could not load file content', true);
            }
        } catch (e) { showStatus('Failed to load file', true); }
    };

    document.getElementById('save-file-btn').onclick = async () => {
        const path = document.getElementById('editor-file-path').value;
        const content = document.getElementById('modal-file-content').value;
        const message = document.getElementById('modal-commit-message').value || `Update ${path} via GitWeaver`;

        if (!path || !content) return;

        try {
            const res = await fetch('/api/update-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner: currentRepo.owner,
                    repo: currentRepo.name,
                    path: path,
                    content: content,
                    message: message
                })
            });
            if (res.ok) {
                showStatus(`Changes saved to ${path}`);
                document.getElementById('modal-commit-message').value = '';
                loadCommits(currentRepo.owner, currentRepo.name);
            } else {
                showStatus('Failed to save changes', true);
            }
        } catch (e) { showStatus('Error saving file', true); }
    };

    function updateLanguageFilter(repos) {
        const filterLanguage = document.getElementById('filter-language');
        const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
        
        // Reset and keep "All"
        filterLanguage.innerHTML = '<option value="all">All Languages</option>';
        languages.forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang;
            opt.textContent = lang;
            filterLanguage.appendChild(opt);
        });
    }

    // 4. Search and Filter Logic
    const repoSearch = document.getElementById('repo-search');
    const filterLanguage = document.getElementById('filter-language');

    const applyFilters = () => {
        const searchTerm = repoSearch.value.toLowerCase();
        const selectedLang = filterLanguage.value;

        const filtered = allRepos.filter(repo => {
            const matchesSearch = repo.name.toLowerCase().includes(searchTerm);
            const matchesLang = selectedLang === 'all' || repo.language === selectedLang;
            return matchesSearch && matchesLang;
        });

        renderRepositories(filtered);
    };

    if (repoSearch) repoSearch.addEventListener('input', applyFilters);
    if (filterLanguage) filterLanguage.addEventListener('change', applyFilters);

    // 5. Handle Create Repo Form
    const createRepoForm = document.getElementById('create-repo-form');
    if (createRepoForm) {
        createRepoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const payload = {
                name: document.getElementById('repo-name').value,
                description: document.getElementById('repo-description').value,
                private: document.getElementById('repo-visibility').value === 'private',
                default_branch: document.getElementById('default-branch').value || 'main',
                gitignore_template: document.getElementById('gitignore-template').value,
                license_template: document.getElementById('license-template').value
            };

            try {
                const response = await fetch('/api/create-repo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();

                if (response.ok) {
                    showStatus(`Repository "${payload.name}" created successfully!`);
                    createRepoForm.reset();
                    loadRepositories();
                } else {
                    showStatus(data.error || 'Failed to create repository', true);
                }
            } catch (error) {
                showStatus('A network error occurred.', true);
            }
        });
    }

    // 6. Handle Update File Form
    const updateFileForm = document.getElementById('update-file-form');
    if (updateFileForm) {
        updateFileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const owner = document.getElementById('owner-name').value;
            const repo = document.getElementById('target-repo').value;
            const fileName = document.getElementById('file-name').value;
            const content = document.getElementById('file-content').value;
            const message = document.getElementById('commit-message').value;

            try {
                const response = await fetch('/api/update-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        owner,
                        repo,
                        path: fileName,
                        content: content,
                        message: message
                    })
                });
                if (response.ok) {
                    showStatus(`File "${fileName}" updated successfully!`);
                    updateFileForm.reset();
                    loadRepositories();
                } else {
                    const data = await response.json();
                    showStatus(data.error || 'Failed to update file', true);
                }
            } catch (error) {
                showStatus('Network error occurred', true);
            }
        });
    }
});
