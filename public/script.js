document.addEventListener('DOMContentLoaded', async () => {
    // --- 0. Core UI Elements ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const appContent = document.getElementById('app-content');
    const landingContent = document.getElementById('landing-content');
    const toastContainer = document.getElementById('toast-container');
    const repoListContainer = document.getElementById('repo-list');
    
    const repoModal = document.getElementById('repo-modal');
    const closeModal = document.querySelector('.close-modal');
    
    let allRepos = [];
    let currentRepo = null;

    // --- 1. Sidebar & Theme Logic ---
    if (localStorage.getItem('sidebar-collapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }

    sidebarToggle.onclick = () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
    };

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeText(true);
    }

    themeToggle.onclick = () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeText(isDark);
    };

    function updateThemeText(isDark) {
        const text = themeToggle.querySelector('.theme-text');
        if (text) text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            switchView('dashboard-view');
            document.getElementById('repo-search').focus();
        }
        if (e.key === 'Escape' && repoModal.classList.contains('active')) {
            closeRepoModal();
        }
    });

    // --- 2. Toast System ---
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
            <span class="toast-message">${message}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };

    // --- 3. View Management ---
    const views = document.querySelectorAll('.view');
    const navBtns = document.querySelectorAll('.nav-btn');

    const switchView = (viewId) => {
        views.forEach(v => v.classList.remove('active'));
        navBtns.forEach(b => b.classList.remove('active'));
        
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');
        
        const activeBtn = Array.from(navBtns).find(b => b.dataset.view === viewId);
        if (activeBtn) activeBtn.classList.add('active');

        if (viewId === 'analytics-view') loadAnalytics();
    };

    navBtns.forEach(btn => {
        btn.onclick = () => switchView(btn.dataset.view);
    });

    // --- 4. Auth & Initial Load ---
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

    // --- 5. Repository Management ---
    async function loadRepositories() {
        repoListContainer.innerHTML = `
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        `;
        try {
            const response = await fetch('/api/repos');
            if (!response.ok) throw new Error('Failed to fetch repositories');
            
            allRepos = await response.json();
            renderRepositories(allRepos);
            updateLanguageFilter(allRepos);
        } catch (error) {
            repoListContainer.innerHTML = `<div class="error">Sync failed: ${error.message}</div>`;
        }
    }

    function renderRepositories(repos) {
        if (repos.length === 0) {
            repoListContainer.innerHTML = '<div class="empty-state">No repositories found.</div>';
            return;
        }

        repoListContainer.innerHTML = repos.map(repo => `
            <div class="repo-card" onclick="openRepoModal('${repo.owner.login}', '${repo.name}', ${repo.private})">
                <div class="repo-card-header">
                    <h3>${repo.name}</h3>
                    <span class="badge">${repo.private ? 'Private' : 'Public'}</span>
                </div>
                <div class="metadata">
                    ${repo.language ? `<span class="badge" style="background: var(--bg-tertiary)">${repo.language}</span>` : ''}
                    <span class="stars">⭐ ${repo.stargazers_count}</span>
                </div>
                <p class="description">${repo.description || 'No description provided.'}</p>
                <div class="repo-footer">
                    <small>Updated ${timeAgo(new Date(repo.updated_at))}</small>
                    <div class="sparkline-placeholder"></div>
                </div>
            </div>
        `).join('');
    }

    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }

    // --- 6. Analytics Logic ---
    async function loadAnalytics() {
        const healthList = document.getElementById('health-score-list');
        const trendingList = document.getElementById('trending-list');

        // Health Scores
        if (allRepos.length > 0) {
            healthList.innerHTML = allRepos.slice(0, 5).map(repo => {
                const score = Math.floor(Math.random() * 20) + 80; // Simulated health score
                return `
                    <div class="analytics-list-item" style="display:flex; justify-content:space-between; padding:0.75rem; border-bottom:1px solid var(--border-color)">
                        <span>${repo.name}</span>
                        <span class="badge" style="color:var(--success)">${score}% Healthy</span>
                    </div>
                `;
            }).join('');
        }

        // Trending
        try {
            const res = await fetch('/api/trending');
            const trending = await res.json();
            trendingList.innerHTML = trending.slice(0, 5).map(repo => `
                <div class="analytics-list-item" style="display:flex; justify-content:space-between; padding:0.75rem; border-bottom:1px solid var(--border-color)">
                    <span>${repo.name}</span>
                    <span>★ ${repo.stargazers_count}</span>
                </div>
            `).join('');
        } catch (e) {
            trendingList.innerHTML = 'Trending data unavailable.';
        }
    }

    // --- 7. Modal & IDE Logic ---
    window.openRepoModal = (owner, repoName, isPrivate) => {
        currentRepo = { owner, name: repoName };
        document.getElementById('modal-repo-name').textContent = repoName;
        document.getElementById('modal-visibility').textContent = isPrivate ? 'Private' : 'Public';
        repoModal.classList.add('active');
        loadCommits(owner, repoName);
        
        // Reset Tabs
        document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-tab="commits"]').classList.add('active');
        document.getElementById('tab-commits').classList.add('active');
    };

    function closeRepoModal() {
        repoModal.classList.remove('active');
        currentRepo = null;
    }

    closeModal.onclick = closeRepoModal;
    window.onclick = (e) => { if (e.target == repoModal) closeRepoModal(); };

    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            if (tabId === 'commits') loadCommits(currentRepo.owner, currentRepo.name);
            if (tabId === 'branches') loadBranches(currentRepo.owner, currentRepo.name);
            if (tabId === 'editor') loadFileTree(currentRepo.owner, currentRepo.name);
        };
    });

    // File Explorer & Editor
    async function loadFileTree(owner, repo, path = "") {
        const treeContainer = document.getElementById('file-tree');
        treeContainer.innerHTML = '<div class="loading">...</div>';
        
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/contents?path=${encodeURIComponent(path)}`);
            const items = await res.json();
            
            let html = "";
            if (path !== "") {
                const parentPath = path.split('/').slice(0, -1).join('/');
                html += `<div class="tree-item folder" onclick="loadFileTree('${owner}', '${repo}', '${parentPath}')">..</div>`;
            }

            if (Array.isArray(items)) {
                items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
                html += items.map(item => `
                    <div class="tree-item ${item.type === 'dir' ? 'folder' : 'file'}" 
                         onclick="${item.type === 'dir' ? `loadFileTree('${owner}', '${repo}', '${item.path}')` : `openFile('${item.path}')`}">
                        ${item.type === 'dir' ? '📁' : '📄'} ${item.name}
                    </div>
                `).join('');
            }
            treeContainer.innerHTML = html;
        } catch (e) {
            treeContainer.innerHTML = 'Error.';
        }
    }
    window.loadFileTree = loadFileTree;

    window.openFile = async (path) => {
        document.getElementById('editor-current-file').textContent = path;
        try {
            const res = await fetch(`/api/repos/${currentRepo.owner}/${currentRepo.name}/file-content?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            const content = data.decodedContent || "";
            const editor = document.getElementById('modal-file-content');
            editor.value = content;
            updateLineNumbers(editor, '.line-numbers-modal');
        } catch (e) { showToast('Failed to load file', 'error'); }
    };

    // Line Numbers Logic
    function updateLineNumbers(textarea, targetSelector) {
        const lineNumbers = document.querySelector(targetSelector);
        const lines = textarea.value.split('\n').length;
        lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => i + 1).join('<br>');
    }

    const modalEditor = document.getElementById('modal-file-content');
    modalEditor.oninput = () => updateLineNumbers(modalEditor, '.line-numbers-modal');
    modalEditor.onscroll = () => {
        document.querySelector('.line-numbers-modal').scrollTop = modalEditor.scrollTop;
    };

    const mainEditor = document.getElementById('file-content');
    if (mainEditor) {
        mainEditor.oninput = () => updateLineNumbers(mainEditor, '.line-numbers');
    }

    // --- 8. API Interactions ---
    async function loadCommits(owner, repo) {
        const list = document.getElementById('commits-list');
        list.innerHTML = 'Loading...';
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/commits`);
            const commits = await res.json();
            list.innerHTML = commits.slice(0, 10).map(c => `
                <div class="commit-item" style="padding:1rem; border-bottom:1px solid var(--border-color)">
                    <div style="font-weight:600; font-size:0.875rem;">${c.commit.message}</div>
                    <div style="color:var(--text-tertiary); font-size:0.75rem;">${c.commit.author.name} • ${timeAgo(new Date(c.commit.author.date))}</div>
                </div>
            `).join('');
        } catch (e) { list.innerHTML = 'Error.'; }
    }

    async function loadBranches(owner, repo) {
        const list = document.getElementById('branches-list');
        list.innerHTML = 'Loading...';
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/branches`);
            const branches = await res.json();
            list.innerHTML = branches.map(b => `
                <div class="branch-item" style="display:flex; justify-content:space-between; padding:0.75rem; border-bottom:1px solid var(--border-color)">
                    <code>${b.name}</code>
                    <button class="btn btn-ghost btn-xs" style="color:var(--danger)">Delete</button>
                </div>
            `).join('');
        } catch (e) { list.innerHTML = 'Error.'; }
    }

    // Form Handlers
    document.getElementById('create-repo-form').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('repo-name').value,
            description: document.getElementById('repo-description').value,
            private: document.getElementById('repo-visibility').value === 'private',
            default_branch: document.getElementById('default-branch').value
        };
        try {
            const res = await fetch('/api/create-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast(`Repository ${payload.name} created!`);
                switchView('dashboard-view');
                loadRepositories();
            } else {
                const err = await res.json();
                showToast(err.error, 'error');
            }
        } catch (e) { showToast('Failed to create repo', 'error'); }
    };

    // Load/Save in Modal
    document.getElementById('save-file-btn').onclick = async () => {
        const path = document.getElementById('editor-current-file').textContent;
        const content = document.getElementById('modal-file-content').value;
        const message = document.getElementById('modal-commit-message').value || "Update file via GitWeaver";
        
        if (path === "Select a file") return showToast("Select a file first", "error");

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
                showToast('Changes committed successfully.');
                loadCommits(currentRepo.owner, currentRepo.name);
            } else {
                showToast('Failed to commit.', 'error');
            }
        } catch (e) { showToast('Error.', 'error'); }
    };

    // Search Logic
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
});
