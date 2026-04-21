// --- Global Initialization ---
const initIcons = () => { if (window.lucide) window.lucide.createIcons(); };

const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    initIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// --- View Management ---
const switchView = (viewId) => {
    console.log("Navigating to:", viewId);
    const views = document.querySelectorAll('.view');
    const navBtns = document.querySelectorAll('.nav-btn');

    views.forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.add('active');
    }

    navBtns.forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`.nav-btn[data-view="${viewId}"]`).forEach(btn => btn.classList.add('active'));
    
    initIcons();
};

// --- Execute immediately when DOM is ready ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Forge Initializing...");

    // 1. Attach Sidebar & View Listeners IMMEDIATELY
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.view) {
            btn.onclick = (e) => {
                e.preventDefault();
                switchView(btn.dataset.view);
            };
        }
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.onclick = () => {
            sidebar.classList.toggle('collapsed');
            initIcons();
        };
    }

    // 2. Premium Interaction (Glow)
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.repo-card, .glass-card, .metric-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
    });

    // 3. AI Architect Logic
    const aiBtn = document.getElementById('ai-generate-commit');
    if (aiBtn) {
        aiBtn.onclick = async () => {
            const path = document.getElementById('file-name').value;
            const content = document.getElementById('file-content').value;
            if (!path || !content) return showToast("Missing path or content", "error");

            aiBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Architecting...';
            initIcons();

            try {
                const res = await fetch('/api/generate-commit-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, content })
                });
                const data = await res.json();
                aiBtn.dataset.suggestedMessage = data.message;
                aiBtn.innerHTML = '<i data-lucide="sparkles"></i> AI Architected!';
                showToast(`AI Suggested: "${data.message}"`);
            } catch (e) {
                aiBtn.innerHTML = '<i data-lucide="sparkles"></i> AI Architect';
            }
            initIcons();
        };
    }

    // 4. Publish Logic
    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) {
        publishBtn.onclick = async () => {
            const target = document.getElementById('target-repo').value;
            const path = document.getElementById('file-name').value;
            const content = document.getElementById('file-content').value;
            if (!target || !path || !content) return showToast("Missing fields", "error");

            const [owner, repo] = target.split('/');
            const message = aiBtn.dataset.suggestedMessage || `Update ${path}`;

            publishBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Publishing...';
            initIcons();

            try {
                const res = await fetch('/api/update-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ owner, repo, path, content, message })
                });
                if (res.ok) showToast("Pushed to GitHub!");
                else showToast("Publish failed", "error");
            } catch (e) { showToast("Network error", "error"); }
            publishBtn.innerHTML = 'Commit Changes';
            initIcons();
        };
    }

    // 5. Auth Check (Non-blocking)
    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth-status');
            const data = await res.json();
            if (data.loggedIn) {
                document.getElementById('landing-content').style.display = 'none';
                document.getElementById('sidebar').style.display = 'flex';
                document.getElementById('app-content').style.display = 'block';
                // Trigger repo load
                fetch('/api/repos').then(r => r.json()).then(repos => renderRepos(repos));
            }
        } catch (e) { console.error("Auth failed", e); }
    };
    checkAuth();
    initIcons();
});

function renderRepos(repos) {
    const container = document.getElementById('repo-list');
    if (!container) return;
    container.innerHTML = repos.map((r, i) => `
        <div class="repo-card ${i === 0 || i === 5 ? 'featured' : ''}" onclick="window.openRepoModal('${r.owner.login}', '${r.name}', ${r.private})">
            <h3>${r.name}</h3>
            <p class="description">${r.description || 'No description'}</p>
            <div class="repo-footer">
                <span class="badge">${r.language || 'Plain Text'}</span>
                <span class="badge">${r.private ? 'Private' : 'Public'}</span>
            </div>
        </div>
    `).join('');
    initIcons();
}

window.openRepoModal = (owner, name, isPrivate) => {
    const modal = document.getElementById('repo-modal');
    document.getElementById('modal-repo-name').textContent = name;
    document.getElementById('modal-visibility').textContent = isPrivate ? 'Private' : 'Public';
    modal.classList.add('active');
    modal.style.display = 'flex';
};

document.querySelector('.close-modal').onclick = () => {
    const modal = document.getElementById('repo-modal');
    modal.classList.remove('active');
    modal.style.display = 'none';
};
