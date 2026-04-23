// --- Global Setup ---
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
    
    // 1. Mobile Search Logic
    const mobileSearchTrigger = document.getElementById('mobile-search-trigger');
    const mobileSearchPanel = document.getElementById('mobile-search-panel');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const desktopSearchBtn = document.getElementById('desktop-search-btn');

    const toggleMobileSearch = () => {
        const isActive = mobileSearchPanel.classList.toggle('active');
        if (isActive) {
            switchView('dashboard-view');
            mobileSearchInput.focus();
        }
    };

    mobileSearchTrigger?.addEventListener('click', toggleMobileSearch);
    
    desktopSearchBtn?.addEventListener('click', () => {
        switchView('dashboard-view');
        document.getElementById('repo-search')?.focus();
    });

    // 2. Navigation
    document.querySelectorAll('.nav-tab[data-view]').forEach(btn => {
        btn.onclick = () => switchView(btn.dataset.view);
    });

    // 3. Deployment & Immediate Navigation
    const deployBtn = document.getElementById('deploy-btn');
    deployBtn?.addEventListener('click', async () => {
        const name = document.getElementById('repo-name').value;
        const visibility = document.getElementById('repo-visibility').value;
        if (!name) return showToast("Name required", "error");

        deployBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Deploying...';
        initIcons();

        try {
            const res = await fetch('/api/create-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, private: visibility === 'private' })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Deployed! Opening Command Center...");
                // Open modal immediately for the new repo
                window.openRepoModal(data.repo.owner.login, data.repo.name, data.repo.private, true);
                fetchRepos();
            } else {
                showToast("Failed", "error");
            }
        } catch (e) { showToast("Error", "error"); }
        deployBtn.innerHTML = 'Deploy';
    });

    // 4. Modal
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

    // 5. App Data
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

    mobileSearchInput?.addEventListener('input', () => {
        const term = mobileSearchInput.value.toLowerCase();
        renderRepos(allRepos.filter(r => r.name.toLowerCase().includes(term)));
    });

    checkAuth();
    initIcons();
});

function renderRepos(repos) {
    const container = document.getElementById('repo-list');
    if (!container) return;
    container.innerHTML = repos.map(r => `
        <div class="project-card" onclick="window.openRepoModal('${r.owner.login}', '${r.name}', ${r.private})">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <span style="font-weight:600; font-size:1.1rem;">${r.name}</span>
                <span class="badge">${r.private ? 'Private' : 'Public'}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--ds-accents-5); display:flex; align-items:center; gap:10px;">
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

    // Update Git Commands
    const gitCmds = document.getElementById('git-commands');
    gitCmds.innerHTML = `git remote add origin https://github.com/${owner}/${name}.git<br>git branch -M main<br>git push -u origin main`;

    // Auto-switch to Setup if new
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
