document.addEventListener('DOMContentLoaded', async () => {
    const sidebar = document.getElementById('sidebar');
    const appContent = document.getElementById('app-content');
    const landingContent = document.getElementById('landing-content');
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const statusMessage = document.getElementById('status-message');
    const repoListContainer = document.getElementById('repo-list');

    // Modal elements
    const repoModal = document.getElementById('repo-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalRepoName = document.getElementById('modal-repo-name');
    const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
    const modalTabContents = document.querySelectorAll('.modal-tab-content');

    let allRepos = [];
    let currentRepo = null;

    // 1. View Management
    const switchView = (viewId) => {
        views.forEach(v => v.classList.remove('active'));
        navBtns.forEach(b => b.classList.remove('active'));
        
        document.getElementById(viewId).classList.add('active');
        const activeBtn = Array.from(navBtns).find(b => b.dataset.view === viewId);
        if (activeBtn) activeBtn.classList.add('active');
    };

    navBtns.forEach(btn => {
        btn.onclick = () => switchView(btn.dataset.view);
    });

    // 2. Check Auth Status
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();

        if (data.loggedIn) {
            landingContent.style.display = 'none';
            sidebar.style.display = 'flex';
            appContent.style.display = 'block';
            document.body.classList.remove('no-sidebar');
            loadRepositories();
        } else {
            document.body.classList.add('no-sidebar');
        }
    } catch (error) {
        console.error('Auth Check Error:', error);
    }

    // 3. Helper to show status
    const showStatus = (message, isError = false) => {
        statusMessage.textContent = message;
        statusMessage.className = isError ? 'status-error' : 'status-success';
        statusMessage.style.display = 'block';
        setTimeout(() => statusMessage.style.display = 'none', 5000);
    };

    // 4. Load Repositories
    async function loadRepositories() {
        repoListContainer.innerHTML = '<div class="loading">Fetching repository inventory...</div>';
        try {
            const response = await fetch('/api/repos');
            
            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Unexpected response format from server (Status ${response.status}). Details: ${text.substring(0, 100)}`);
            }

            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}: Failed to fetch repositories`);
            }
            
            allRepos = data;
            renderRepositories(allRepos);
            updateLanguageFilter(allRepos);
        } catch (error) {
            console.error('Sync Error:', error);
            repoListContainer.innerHTML = `<div class="error">Synchronization failed. Reason: ${error.message}</div>`;
        }
    }

    function renderRepositories(repos) {
        if (repos.length === 0) {
            repoListContainer.innerHTML = '<div class="empty-state">No repositories detected in this account.</div>';
            return;
        }

        repoListContainer.innerHTML = repos.map(repo => `
            <div class="repo-card" onclick="openRepoModal('${repo.owner.login}', '${repo.name}')">
                <h3>${repo.name}</h3>
                <div class="metadata">
                    <span class="visibility-badge">${repo.private ? 'Private' : 'Public'}</span>
                    ${repo.language ? `<span class="lang">${repo.language}</span>` : ''}
                </div>
                <p class="description">${repo.description || 'No description provided.'}</p>
                <div class="repo-footer">
                    <small>Updated: ${new Date(repo.updated_at).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }

    // 5. Modal Management
    window.openRepoModal = (owner, repoName) => {
        currentRepo = { owner, name: repoName };
        modalRepoName.textContent = repoName;
        repoModal.style.display = 'block';
        loadCommits(owner, repoName);
        
        // Reset modal tabs
        modalTabBtns.forEach(b => b.classList.remove('active'));
        modalTabContents.forEach(c => c.classList.remove('active'));
        modalTabBtns[0].classList.add('active');
        modalTabContents[0].classList.add('active');
    };

    closeModal.onclick = () => { repoModal.style.display = 'none'; currentRepo = null; };
    window.onclick = (e) => { if (e.target == repoModal) closeModal.onclick(); };

    modalTabBtns.forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.dataset.tab;
            modalTabBtns.forEach(b => b.classList.remove('active'));
            modalTabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            if (tabId === 'commits') loadCommits(currentRepo.owner, currentRepo.name);
            if (tabId === 'branches') loadBranches(currentRepo.owner, currentRepo.name);
        };
    });

    // 6. API Interactions
    async function loadCommits(owner, repo) {
        const list = document.getElementById('commits-list');
        list.innerHTML = 'Loading activity...';
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/commits`);
            const commits = await res.json();
            list.innerHTML = commits.map(c => `
                <div class="commit-item">
                    <div class="commit-header">
                        <strong>${c.commit.author.name}</strong>
                        <small>${new Date(c.commit.author.date).toLocaleString()}</small>
                    </div>
                    <p class="commit-msg">${c.commit.message}</p>
                </div>
            `).join('');
        } catch (e) { list.innerHTML = 'Error loading commits.'; }
    }

    async function loadBranches(owner, repo) {
        const list = document.getElementById('branches-list');
        list.innerHTML = 'Loading branches...';
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/branches`);
            const branches = await res.json();
            list.innerHTML = branches.map(b => `
                <div class="branch-item">
                    <code>${b.name}</code>
                    <button onclick="deleteBranch('${owner}', '${repo}', '${b.name}')" class="btn-text-danger">Delete</button>
                </div>
            `).join('');
        } catch (e) { list.innerHTML = 'Error loading branches.'; }
    }

    // 7. Form Handlers
    const createRepoForm = document.getElementById('create-repo-form');
    createRepoForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('repo-name').value,
            description: document.getElementById('repo-description').value,
            private: document.getElementById('repo-visibility').value === 'private',
            default_branch: document.getElementById('default-branch').value,
            gitignore_template: document.getElementById('gitignore-template').value,
            license_template: document.getElementById('license-template').value
        };

        try {
            const res = await fetch('/api/create-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showStatus(`Repository ${payload.name} deployed successfully.`);
                createRepoForm.reset();
                switchView('dashboard-view');
                loadRepositories();
            } else {
                const err = await res.json();
                showStatus(err.error, true);
            }
        } catch (e) { showStatus('Deployment failed.', true); }
    };

    // 8. Search & Filters
    const repoSearch = document.getElementById('repo-search');
    const filterLanguage = document.getElementById('filter-language');

    const filterRepos = () => {
        const term = repoSearch.value.toLowerCase();
        const lang = filterLanguage.value;
        const filtered = allRepos.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(term);
            const matchesLang = lang === 'all' || r.language === lang;
            return matchesSearch && matchesLang;
        });
        renderRepositories(filtered);
    };

    repoSearch.oninput = filterRepos;
    filterLanguage.onchange = filterRepos;

    function updateLanguageFilter(repos) {
        const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
        filterLanguage.innerHTML = '<option value="all">All Languages</option>' + 
            languages.map(l => `<option value="${l}">${l}</option>`).join('');
    }

    // 9. Editor Handlers
    document.getElementById('load-file-btn').onclick = async () => {
        const path = document.getElementById('editor-file-path').value;
        if (!path) return;
        try {
            const res = await fetch(`/api/repos/${currentRepo.owner}/${currentRepo.name}/file-content?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            if (data.decodedContent) {
                document.getElementById('modal-file-content').value = data.decodedContent;
                showStatus(`Loaded ${path}`);
            }
        } catch (e) { showStatus('Load failed', true); }
    };

    document.getElementById('save-file-btn').onclick = async () => {
        const path = document.getElementById('editor-file-path').value;
        const content = document.getElementById('modal-file-content').value;
        const message = document.getElementById('modal-commit-message').value;
        if (!path || !content) return;

        try {
            const res = await fetch('/api/update-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner: currentRepo.owner,
                    repo: currentRepo.name,
                    path, content, message
                })
            });
            if (res.ok) {
                showStatus('Changes committed.');
                loadCommits(currentRepo.owner, currentRepo.name);
            }
        } catch (e) { showStatus('Commit failed', true); }
    };
});
