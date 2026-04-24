// --- Global Forge Core v4.0 ---
const initIcons = () => { if (window.lucide) window.lucide.createIcons(); };

const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-triangle'}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    initIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

const switchView = (viewId) => {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`.nav-tab[data-view="${viewId}"]`).forEach(btn => btn.classList.add('active'));
    initIcons();
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Engine Logic
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('gw-theme') || 'theme-vercel';
    document.body.className = savedTheme;
    
    const updateThemeIcon = () => {
        const isLinear = document.body.classList.contains('theme-linear');
        themeToggle.innerHTML = `<i data-lucide="${isLinear ? 'sun' : 'moon'}"></i>`;
        initIcons();
    };
    updateThemeIcon();

    themeToggle?.addEventListener('click', () => {
        const isLinear = document.body.classList.toggle('theme-linear');
        document.body.classList.toggle('theme-vercel', !isLinear);
        localStorage.setItem('gw-theme', isLinear ? 'theme-linear' : 'theme-vercel');
        updateThemeIcon();
    });

    // 2. Omni Search Logic
    window.openOmniSearch = () => {
        document.getElementById('omni-overlay').classList.add('active');
        document.getElementById('omni-input').focus();
        renderOmniResults("");
    };

    window.closeOmniSearch = () => {
        document.getElementById('omni-overlay').classList.remove('active');
    };

    const omniInput = document.getElementById('omni-input');
    const omniResults = document.getElementById('omni-results');

    const commands = [
        { icon: 'plus-square', label: 'Provision New Project', action: () => switchView('create-view') },
        { icon: 'terminal', label: 'Open Rapid Editor', action: () => switchView('editor-view') },
        { icon: 'bar-chart-3', label: 'View Analytics', action: () => switchView('analytics-view') },
        { icon: 'layers', label: 'Go to Overview', action: () => switchView('dashboard-view') }
    ];

    const renderOmniResults = (query) => {
        const term = query.toLowerCase();
        let html = "";
        
        const filteredCmds = commands.filter(c => c.label.toLowerCase().includes(term));
        if (filteredCmds.length > 0) {
            html += `<div style="font-size:10px; color:var(--ds-accents-5); padding:8px 12px; text-transform:uppercase;">Actions</div>`;
            html += filteredCmds.map(c => `
                <div class="omni-item" onclick="(${c.action.toString()})(); closeOmniSearch();">
                    <i data-lucide="${c.icon}"></i> <span>${c.label}</span>
                </div>
            `).join('');
        }

        const filteredRepos = allRepos.filter(r => r.name.toLowerCase().includes(term));
        if (filteredRepos.length > 0) {
            html += `<div style="font-size:10px; color:var(--ds-accents-5); padding:8px 12px; text-transform:uppercase; margin-top:8px;">Repositories</div>`;
            html += filteredRepos.slice(0, 5).map(r => `
                <div class="omni-item" onclick="window.openRepoModal('${r.owner.login}', '${r.name}', ${r.private}); closeOmniSearch();">
                    <i data-lucide="github"></i> <span>${r.name}</span>
                </div>
            `).join('');
        }

        omniResults.innerHTML = html || `<div style="padding:20px; text-align:center; color:#666;">No results found.</div>`;
        initIcons();
    };

    omniInput?.addEventListener('input', (e) => renderOmniResults(e.target.value));
    
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openOmniSearch(); }
        if (e.key === 'Escape') closeOmniSearch();
    });

    // 3. AI Name Forge
    const aiForgeBtn = document.getElementById('ai-name-forge');
    const suggestionsList = document.getElementById('name-suggestions');
    const nameInput = document.getElementById('repo-name');

    aiForgeBtn?.addEventListener('click', async () => {
        const keyword = nameInput.value || "project";
        aiForgeBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
        initIcons();

        try {
            const res = await fetch('/api/generate-repo-name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword })
            });
            const { suggestions } = await res.json();
            suggestionsList.innerHTML = suggestions.map(s => `<span class="suggestion-chip">${s}</span>`).join('');
            
            document.querySelectorAll('.suggestion-chip').forEach(chip => {
                chip.onclick = () => {
                    nameInput.value = chip.textContent;
                    suggestionsList.innerHTML = '';
                };
            });
        } catch (e) { showToast("AI Forge Offline", "error"); }
        aiForgeBtn.innerHTML = '<i data-lucide="sparkles"></i>';
        initIcons();
    });

    // 4. Template Gallery
    const templates = document.querySelectorAll('.template-card');
    templates.forEach(t => {
        t.onclick = () => {
            templates.forEach(card => card.classList.remove('active'));
            t.classList.add('active');
        };
    });

    // 5. Deployment Logic with Faster Terminal
    const deployBtn = document.getElementById('deploy-btn');
    const terminal = document.getElementById('provision-terminal');
    const terminalOutput = document.getElementById('terminal-output');

    const log = (msg, type = 'system') => {
        const line = document.createElement('span');
        line.className = `log-line log-${type}`;
        line.textContent = `> [${new Date().toLocaleTimeString()}] ${msg}`;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    };

    deployBtn?.addEventListener('click', async () => {
        const name = nameInput.value;
        const visibility = document.getElementById('repo-visibility').value;
        const activeTemplate = document.querySelector('.template-card.active');
        
        if (!name) return showToast("Project name required", "error");

        deployBtn.disabled = true;
        terminal.style.display = 'block';
        terminalOutput.innerHTML = '';
        
        log(`Initiating Forge for ${name}...`, 'forge');
        await new Promise(r => setTimeout(r, 200));
        log("Establishing GitHub Handshake...", 'system');
        await new Promise(r => setTimeout(r, 300));
        log(`Applying blueprint: ${activeTemplate.dataset.template}`, 'forge');

        try {
            const res = await fetch('/api/create-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    private: visibility === 'private',
                    license_template: document.getElementById('toggle-license').checked ? 'mit' : undefined,
                    gitignore_template: document.getElementById('toggle-gitignore').checked ? activeTemplate.dataset.gitignore || 'Node' : undefined
                })
            });
            const data = await res.json();
            
            if (res.ok) {
                log("Repository weaving complete.", 'forge');
                await new Promise(r => setTimeout(r, 200));
                log("Optimizing metadata...", 'system');
                await new Promise(r => setTimeout(r, 200));
                log("PROVISIONING SUCCESSFUL.", 'success');
                
                showToast("Stack Provisioned!");
                setTimeout(() => {
                    window.openRepoModal(data.repo.owner.login, data.repo.name, data.repo.private, true);
                    fetchRepos();
                    deployBtn.disabled = false;
                }, 500);
            } else {
                log(`ERROR: ${data.error}`, 'system');
                deployBtn.disabled = false;
            }
        } catch (e) {
            log("CRITICAL ERROR: Connection Terminated.", 'system');
            deployBtn.disabled = false;
        }
    });

    // 6. Ghost Branch Logic
    const ghostBtn = document.getElementById('create-ghost-branch');
    ghostBtn?.addEventListener('click', async () => {
        const branchName = document.getElementById('new-branch-name').value;
        const repoName = document.getElementById('modal-repo-name').textContent;
        const owner = currentRepoOwner;

        if (!branchName) return showToast("Branch name required", "error");
        
        ghostBtn.disabled = true;
        ghostBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
        initIcons();

        try {
            const res = await fetch(`/api/repos/${owner}/${repoName}/branches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch: branchName })
            });
            if (res.ok) {
                showToast(`Ghost Branch Forged!`);
                document.getElementById('new-branch-name').value = '';
                loadRepoBranches(owner, repoName);
            } else { showToast("Forge failed", "error"); }
        } catch (e) { showToast("Connection error", "error"); }
        ghostBtn.disabled = false;
        ghostBtn.innerHTML = 'Forge Branch';
        initIcons();
    });

    // 7. Navigation & Data Loading
    let allRepos = [];
    let currentRepoOwner = "";

    document.querySelectorAll('.nav-tab[data-view]').forEach(btn => btn.onclick = () => switchView(btn.dataset.view));

    const fetchRepos = async () => {
        const res = await fetch('/api/repos');
        allRepos = await res.json();
        renderRepos(allRepos);
        document.getElementById('total-repos-count').textContent = allRepos.length;
        allRepos.forEach(repo => updateActionPulse(repo.owner.login, repo.name));
    };

    const updateActionPulse = async (owner, name) => {
        try {
            const res = await fetch(`/api/repos/${owner}/${name}/actions`);
            const data = await res.json();
            const pulseEl = document.querySelector(`[data-pulse="${owner}/${name}"]`);
            const cardEl = document.querySelector(`[data-card="${owner}/${name}"]`);
            if (!pulseEl) return;
            pulseEl.className = 'status-pulse';
            if (data.status === 'in_progress' || data.status === 'queued') pulseEl.classList.add('pulse-running');
            else if (data.conclusion === 'success') pulseEl.classList.add('pulse-success');
            else if (data.conclusion === 'failure') { pulseEl.classList.add('pulse-failure'); cardEl?.classList.add('status-failing'); }
            else pulseEl.classList.add('pulse-none');
        } catch (e) {}
    };

    const checkAuth = async () => {
        const res = await fetch('/api/auth-status');
        const data = await res.json();
        if (data.loggedIn) {
            document.getElementById('landing-content').style.display = 'none';
            document.getElementById('app-content').style.display = 'block';
            fetchRepos();
        }
    };
    checkAuth();
});

function renderRepos(repos) {
    const container = document.getElementById('repo-list');
    if (!container) return;
    container.innerHTML = repos.map(r => `
        <div class="project-card" data-card="${r.owner.login}/${r.name}" onclick="window.openRepoModal('${r.owner.login}', '${r.name}', ${r.private})">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="status-pulse pulse-none" data-pulse="${r.owner.login}/${r.name}"></span>
                    <span style="font-weight:600; font-size:1rem;">${r.name}</span>
                </div>
                <span class="badge">${r.private ? 'Private' : 'Public'}</span>
            </div>
            <div style="font-size:0.85rem; color:#666; display:flex; align-items:center; gap:10px;">
                <i data-lucide="github" style="width:14px;"></i>
                <span>${r.default_branch || 'main'}</span>
                <span>•</span>
                <span>${new Date(r.updated_at).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
    initIcons();
}

window.openRepoModal = (owner, name, isPrivate, isNew = false) => {
    window.currentRepoOwner = owner;
    const modal = document.getElementById('repo-modal');
    document.getElementById('modal-repo-name').textContent = name;
    modal.classList.add('active');
    const gitCmds = document.getElementById('git-commands');
    gitCmds.innerHTML = `git remote add origin https://github.com/${owner}/${name}.git<br>git branch -M main<br>git push -u origin main`;
    if (!isNew) {
        fetch(`/api/repos/${owner}/${name}/commits`).then(r => r.json()).then(commits => {
            document.getElementById('commits-list').innerHTML = Array.isArray(commits) ? commits.slice(0, 5).map(c => `
                <div style="padding:10px 0; border-bottom:1px solid #222;">
                    <div style="font-size:14px; font-weight:500;">${c.commit.message}</div>
                    <div style="font-size:12px; color:#666;">${c.commit.author.name}</div>
                </div>
            `).join('') : 'No activity yet.';
        });
        loadRepoBranches(owner, name);
    } else {
        document.querySelector('[data-tab="setup"]').click();
    }
};

async function loadRepoBranches(owner, name) {
    const res = await fetch(`/api/repos/${owner}/${name}/branches`);
    const branches = await res.json();
    document.getElementById('branches-list').innerHTML = branches.map(b => `
        <div class="branch-item-mini">
            <span><i data-lucide="git-branch" style="width:14px;"></i> ${b.name}</span>
            <span style="font-size:10px; color:#444;">FORGED</span>
        </div>
    `).join('');
    initIcons();
}
