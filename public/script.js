// --- Global Setup ---
const initIcons = () => { if (window.lucide) window.lucide.createIcons(); };

const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-triangle'}" style="width: 16px;"></i> <span>${message}</span>`;
    container.appendChild(toast);
    initIcons();
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// --- View Switching ---
const switchView = (viewId) => {
    document.querySelectorAll('.view').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    document.querySelectorAll('.nav-tab[data-view]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`.nav-tab[data-view="${viewId}"]`).forEach(btn => btn.classList.add('active'));
    initIcons();
};

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Navigation Tabs
    document.querySelectorAll('.nav-tab[data-view]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            switchView(btn.dataset.view);
        };
    });

    // 2. Global Search Hook (Cmd+K)
    const searchInput = document.getElementById('repo-search');
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            switchView('dashboard-view');
            if (searchInput) searchInput.focus();
        }
    });
    
    document.getElementById('global-search-btn')?.addEventListener('click', () => {
        switchView('dashboard-view');
        if (searchInput) searchInput.focus();
    });

    // 3. Form Deploy Logic
    const deployBtn = document.getElementById('deploy-btn');
    if (deployBtn) {
        deployBtn.onclick = async () => {
            const name = document.getElementById('repo-name').value;
            const visibility = document.getElementById('repo-visibility').value;
            const desc = document.getElementById('repo-description').value;

            if (!name) return showToast("Repository name required", "error");

            deployBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Deploying...';
            initIcons();

            try {
                const res = await fetch('/api/create-repo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, private: visibility === 'private', description: desc })
                });
                if (res.ok) {
                    showToast("Repository Deployed!");
                    switchView('dashboard-view');
                    fetchRepos();
                } else {
                    showToast("Deployment failed", "error");
                }
            } catch (e) {
                showToast("Network error", "error");
            }
            deployBtn.innerHTML = 'Deploy';
        };
    }

    // 4. Rapid Edit & AI Commit
    const aiBtn = document.getElementById('ai-generate-commit');
    if (aiBtn) {
        aiBtn.onclick = async () => {
            const path = document.getElementById('file-name').value;
            const content = document.getElementById('file-content').value;
            if (!path || !content) return showToast("Missing path or content", "error");
            
            aiBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> AI...';
            initIcons();
            try {
                const res = await fetch('/api/generate-commit-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, content })
                });
                const data = await res.json();
                aiBtn.dataset.msg = data.message;
                aiBtn.innerHTML = '<i data-lucide="sparkles"></i> Applied';
                showToast(`AI Suggested: "${data.message}"`);
            } catch (e) { aiBtn.innerHTML = 'AI Commit'; }
            initIcons();
        };
    }

    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) {
        publishBtn.onclick = async () => {
            const target = document.getElementById('target-repo').value;
            const path = document.getElementById('file-name').value;
            const content = document.getElementById('file-content').value;
            if (!target || !path || !content) return showToast("Missing fields", "error");
            
            const [owner, repo] = target.split('/');
            const message = aiBtn?.dataset.msg || `Update ${path}`;
            
            publishBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Committing...';
            initIcons();
            try {
                const res = await fetch('/api/update-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ owner, repo, path, content, message })
                });
                if (res.ok) showToast("Changes Committed!");
                else showToast("Commit failed", "error");
            } catch (e) { showToast("Network error", "error"); }
            publishBtn.innerHTML = 'Commit Changes';
            initIcons();
        };
    }

    // 5. Modal Logic
    document.querySelector('.modal-close').onclick = () => {
        document.getElementById('repo-modal').classList.remove('active');
    };
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        };
    });

    // 6. Initialize App
    let allRepos = [];
    const fetchRepos = async () => {
        try {
            const res = await fetch('/api/repos');
            allRepos = await res.json();
            renderRepos(allRepos);
            document.getElementById('total-repos-count').textContent = allRepos.length;
            
            // Analytics populate
            const hl = document.getElementById('health-score-list');
            if (hl) {
                hl.innerHTML = allRepos.slice(0, 5).map(r => `
                    <div style="padding: 1rem 0; border-bottom: 1px solid var(--ds-accents-2); display: flex; justify-content: space-between;">
                        <span style="font-weight: 500;">${r.name}</span>
                        <span style="color: var(--ds-accents-5);">Synchronized</span>
                    </div>
                `).join('');
            }
        } catch (e) {
            document.getElementById('repo-list').innerHTML = `<p style="color: var(--ds-accents-5);">Failed to load projects.</p>`;
        }
    };

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth-status');
            const data = await res.json();
            if (data.loggedIn) {
                document.getElementById('landing-content').style.display = 'none';
                document.getElementById('app-content').style.display = 'block';
                fetchRepos();
            }
        } catch (e) {}
    };
    checkAuth();
    initIcons();

    // 7. Search Filter
    if (searchInput) {
        searchInput.oninput = () => {
            const term = searchInput.value.toLowerCase();
            const filtered = allRepos.filter(r => r.name.toLowerCase().includes(term));
            renderRepos(filtered);
        };
    }
});

// --- Render Logic ---
function renderRepos(repos) {
    const container = document.getElementById('repo-list');
    if (!container) return;
    
    container.innerHTML = repos.map(r => `
        <div class="project-card" onclick="window.openRepoModal('${r.owner.login}', '${r.name}', ${r.private})">
            <div class="project-header">
                <div class="project-icon"><i data-lucide="github" style="width: 14px;"></i></div>
                <span class="project-title">${r.name}</span>
                <span class="badge">${r.private ? 'Private' : 'Public'}</span>
            </div>
            <div class="project-meta">
                <div class="meta-row">
                    <i data-lucide="git-branch" style="width: 14px;"></i> ${r.default_branch || 'main'}
                </div>
                <div class="meta-row">
                    <i data-lucide="clock" style="width: 14px;"></i> ${timeAgo(new Date(r.updated_at))}
                </div>
            </div>
        </div>
    `).join('');
    initIcons();
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    return "Just now";
}

window.openRepoModal = (owner, name, isPrivate) => {
    const modal = document.getElementById('repo-modal');
    document.getElementById('modal-repo-name').textContent = name;
    document.getElementById('modal-visibility').textContent = isPrivate ? 'Private' : 'Public';
    modal.classList.add('active');
    
    const commitsList = document.getElementById('commits-list');
    commitsList.innerHTML = '<p style="color: var(--ds-accents-5);">Loading commits...</p>';
    fetch(`/api/repos/${owner}/${name}/commits`).then(r => r.json()).then(commits => {
        commitsList.innerHTML = commits.slice(0, 10).map(c => `
            <div class="list-item">
                <span class="list-item-title">${c.commit.message}</span>
                <span class="list-item-meta">${c.commit.author.name} • ${new Date(c.commit.author.date).toLocaleDateString()}</span>
            </div>
        `).join('');
    });

    const branchesList = document.getElementById('branches-list');
    branchesList.innerHTML = '<p style="color: var(--ds-accents-5);">Loading branches...</p>';
    fetch(`/api/repos/${owner}/${name}/branches`).then(r => r.json()).then(branches => {
        branchesList.innerHTML = branches.map(b => `
            <div class="list-item" style="flex-direction: row; align-items: center; gap: 8px;">
                <i data-lucide="git-branch" style="width: 14px; color: var(--ds-accents-5);"></i>
                <span class="list-item-title">${b.name}</span>
            </div>
        `).join('');
        initIcons();
    });
};
