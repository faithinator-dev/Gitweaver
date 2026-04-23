// --- Global Forge Core ---
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
    // 1. Navigation & Search
    document.querySelectorAll('.nav-tab[data-view]').forEach(btn => btn.onclick = () => switchView(btn.dataset.view));
    
    const mobileSearchTrigger = document.getElementById('mobile-search-trigger');
    const mobileSearchPanel = document.getElementById('mobile-search-panel');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    
    mobileSearchTrigger?.addEventListener('click', () => {
        mobileSearchPanel.classList.toggle('active');
        if (mobileSearchPanel.classList.contains('active')) {
            switchView('dashboard-view');
            mobileSearchInput.focus();
        }
    });

    // 2. AI Name Forge
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

    // 3. Template Gallery
    const templates = document.querySelectorAll('.template-card');
    templates.forEach(t => {
        t.onclick = () => {
            templates.forEach(card => card.classList.remove('active'));
            t.classList.add('active');
            if (t.dataset.template !== 'blank') {
                nameInput.placeholder = `e.g. my-${t.dataset.template}-app`;
            }
        };
    });

    // 4. Provisioning Terminal & Deploy
    const deployBtn = document.getElementById('deploy-btn');
    const terminal = document.getElementById('provision-terminal');
    const output = document.getElementById('terminal-output');

    const log = (msg, type = 'system') => {
        const line = document.createElement('span');
        line.className = `log-line log-${type}`;
        line.textContent = `> [${new Date().toLocaleTimeString()}] ${msg}`;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    };

    deployBtn?.addEventListener('click', async () => {
        const name = nameInput.value;
        const visibility = document.getElementById('repo-visibility').value;
        const activeTemplate = document.querySelector('.template-card.active');
        
        if (!name) return showToast("Project name required", "error");

        deployBtn.disabled = true;
        terminal.style.display = 'block';
        output.innerHTML = '';
        
        log(`Initiating Forge for ${name}...`, 'forge');
        await new Promise(r => setTimeout(r, 600));
        log("Establishing GitHub Handshake...", 'system');
        await new Promise(r => setTimeout(r, 800));
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
                await new Promise(r => setTimeout(r, 500));
                log("Optimizing metadata and branches...", 'system');
                await new Promise(r => setTimeout(r, 700));
                log("PROVISIONING SUCCESSFUL.", 'success');
                
                showToast("Stack Provisioned!");
                setTimeout(() => {
                    window.openRepoModal(data.repo.owner.login, data.repo.name, data.repo.private, true);
                    fetchRepos();
                    deployBtn.disabled = false;
                }, 1000);
            } else {
                log(`ERROR: ${data.error}`, 'system');
                deployBtn.disabled = false;
            }
        } catch (e) {
            log("CRITICAL ERROR: Connection Terminated.", 'system');
            deployBtn.disabled = false;
        }
    });

    // 5. Auth & Initial Load
    let allRepos = [];
    const fetchRepos = async () => {
        const res = await fetch('/api/repos');
        allRepos = await res.json();
        renderRepos(allRepos);
        document.getElementById('total-repos-count').textContent = allRepos.length;
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
    initIcons();
});

function renderRepos(repos) {
    const container = document.getElementById('repo-list');
    if (!container) return;
    container.innerHTML = repos.map(r => `
        <div class="project-card" onclick="window.openRepoModal('${r.owner.login}', '${r.name}', ${r.private})">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <span style="font-weight:600; font-size:1rem;">${r.name}</span>
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
    const modal = document.getElementById('repo-modal');
    document.getElementById('modal-repo-name').textContent = name;
    modal.classList.add('active');

    const gitCmds = document.getElementById('git-commands');
    gitCmds.innerHTML = `git remote add origin https://github.com/${owner}/${name}.git<br>git branch -M main<br>git push -u origin main`;

    if (isNew) {
        document.querySelector('[data-tab="setup"]').click();
    } else {
        document.querySelector('[data-tab="commits"]').click();
        const list = document.getElementById('commits-list');
        list.innerHTML = 'Loading activity...';
        fetch(`/api/repos/${owner}/${name}/commits`).then(r => r.json()).then(commits => {
            list.innerHTML = Array.isArray(commits) ? commits.slice(0, 5).map(c => `
                <div style="padding:10px 0; border-bottom:1px solid #222;">
                    <div style="font-size:14px; font-weight:500;">${c.commit.message}</div>
                    <div style="font-size:12px; color:#666;">${c.commit.author.name}</div>
                </div>
            `).join('') : 'No activity yet.';
        });
    }
};

document.querySelector('.modal-close-btn').onclick = () => {
    document.getElementById('repo-modal').classList.remove('active');
};
