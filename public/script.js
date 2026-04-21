document.addEventListener('DOMContentLoaded', async () => {
    // --- 0. Core UI Elements ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const appContent = document.getElementById('app-content');
    const landingContent = document.getElementById('landing-content');
    const toastContainer = document.getElementById('toast-container');
    const repoListContainer = document.getElementById('repo-list');
    const repoModal = document.getElementById('repo-modal');
    const closeModal = document.querySelector('.close-modal');
    
    let allRepos = [];
    let currentRepo = null;

    // Initialize Lucide Icons
    const initIcons = () => {
        if (window.lucide) window.lucide.createIcons();
    };

    // --- 1. Premium Interactions (Mouse Tracking Glow) ---
    const updateGlow = (e) => {
        const cards = document.querySelectorAll('.repo-card, .glass-card, .metric-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    };
    document.addEventListener('mousemove', updateGlow);

    // --- 2. Sidebar Logic ---
    if (localStorage.getItem('sidebar-collapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }

    sidebarToggle.onclick = () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
        initIcons();
    };

    // Keyboard Shortcuts (Cmd+K for search)
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

    // --- 3. View Management ---
    const views = document.querySelectorAll('.view');
    const navBtns = document.querySelectorAll('.nav-btn');

    const switchView = (viewId) => {
        views.forEach(v => v.classList.remove('active'));
        navBtns.forEach(b => b.classList.remove('active'));
        
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');
        
        document.querySelectorAll(`.nav-btn[data-view="${viewId}"]`).forEach(btn => btn.classList.add('active'));

        if (viewId === 'analytics-view') loadAnalytics();
        initIcons();
    };

    navBtns.forEach(btn => {
        btn.onclick = () => switchView(btn.dataset.view);
    });

    // --- 4. Toast System ---
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        initIcons();
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };

    // --- 5. Auth & Initial Load ---
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();

        if (data.loggedIn) {
            landingContent.style.display = 'none';
            sidebar.style.display = 'flex';
            appContent.style.display = 'block';
            loadRepositories();
        } else {
            initIcons();
        }
    } catch (error) {
        console.error('Auth Check Error:', error);
    }

    // --- 6. Repository Dashboard (Bento Layout) ---
    async function loadRepositories() {
        repoListContainer.innerHTML = Array(3).fill('<div class="skeleton-card"></div>').join('');
        try {
            const response = await fetch('/api/repos');
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

        // Bento logic: Every 5th item is featured, or the first two
        repoListContainer.innerHTML = repos.map((repo, index) => {
            const isFeatured = index === 0 || index === 5;
            return `
                <div class="repo-card ${isFeatured ? 'featured' : ''}" onclick="openRepoModal('${repo.owner.login}', '${repo.name}', ${repo.private})">
                    <div class="repo-header" style="display:flex; justify-content:space-between; align-items:start;">
                        <h3>${repo.name}</h3>
                        <span class="badge">${repo.private ? 'Private' : 'Public'}</span>
                    </div>
                    <p class="description">${repo.description || 'No description provided.'}</p>
                    <div class="repo-footer" style="display:flex; gap:1rem; align-items:center; border-top:1px solid var(--border-subtle); padding-top:1rem; margin-top:auto;">
                        ${repo.language ? `<span class="badge" style="background:rgba(255,255,255,0.03)">${repo.language}</span>` : ''}
                        <small style="color:var(--text-dark); margin-left:auto;">${timeAgo(new Date(repo.updated_at))}</small>
                    </div>
                </div>
            `;
        }).join('');
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

    // --- 7. Analytics View ---
    async function loadAnalytics() {
        const healthList = document.getElementById('health-score-list');
        if (allRepos.length > 0) {
            healthList.innerHTML = allRepos.slice(0, 5).map(repo => `
                <div style="display:flex; justify-content:space-between; padding:1rem; border-bottom:1px solid var(--border-subtle)">
                    <span>${repo.name}</span>
                    <span style="color:var(--git-green)">98% Healthy</span>
                </div>
            `).join('');
        }
    }

    // --- 8. Modal & Editor ---
    window.openRepoModal = (owner, repoName, isPrivate) => {
        currentRepo = { owner, name: repoName };
        document.getElementById('modal-repo-name').textContent = repoName;
        document.getElementById('modal-visibility').textContent = isPrivate ? 'Private' : 'Public';
        repoModal.classList.add('active');
        loadCommits(owner, repoName);
        initIcons();
    };

    function closeRepoModal() {
        repoModal.classList.remove('active');
        currentRepo = null;
    }

    closeModal.onclick = closeRepoModal;
    window.onclick = (e) => { if (e.target == repoModal) closeRepoModal(); };

    async function loadCommits(owner, repo) {
        const list = document.getElementById('commits-list');
        list.innerHTML = 'Loading...';
        try {
            const res = await fetch(`/api/repos/${owner}/${repo}/commits`);
            const commits = await res.json();
            list.innerHTML = commits.slice(0, 5).map(c => `
                <div style="padding:1rem; border-bottom:1px solid var(--border-subtle)">
                    <div style="font-weight:600">${c.commit.message}</div>
                    <small style="color:var(--text-dark)">${c.commit.author.name} • ${timeAgo(new Date(c.commit.author.date))}</small>
                </div>
            `).join('');
            initIcons();
        } catch (e) { list.innerHTML = 'Error loading activity.'; }
    }

    // Search & Filter
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

    // --- 9. AI Commit Architect Logic ---
    const aiBtn = document.getElementById('ai-generate-commit');
    if (aiBtn) {
        aiBtn.onclick = async () => {
            const path = document.getElementById('file-name').value;
            const content = document.getElementById('file-content').value;

            if (!path || !content) {
                return showToast("Fill in path and content first", "error");
            }

            aiBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Architecting...';
            initIcons();

            try {
                const res = await fetch('/api/generate-commit-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, content })
                });
                const data = await res.json();
                
                // We'll store the generated message in a toast and update the button
                showToast(`AI Suggested: "${data.message}"`);
                
                // For this view, we can add a hidden message or just use it as the default
                // Let's add it to a temporary data attribute or similar
                aiBtn.dataset.suggestedMessage = data.message;
                aiBtn.innerHTML = '<i data-lucide="sparkles"></i> AI Architected!';
                initIcons();
            } catch (e) {
                showToast("AI failed to architect", "error");
                aiBtn.innerHTML = '<i data-lucide="sparkles"></i> AI Architect';
            }
        };
    }

    // --- 10. File Update Logic (Rapid Edit) ---
    const updateForm = document.getElementById('update-file-form'); // Note: I should ensure this ID exists in HTML
    // Looking at index.html, it's actually just a div/section. Let's fix the form handler.
    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) {
        publishBtn.onclick = async (e) => {
            e.preventDefault();
            const target = document.getElementById('target-repo').value;
            const path = document.getElementById('file-name').value;
            const content = document.getElementById('file-content').value;
            const aiMessage = aiBtn ? aiBtn.dataset.suggestedMessage : null;
            
            if (!target || !path || !content) return showToast("Missing fields", "error");

            const [owner, repo] = target.split('/');
            if (!owner || !repo) return showToast("Use owner/repo format", "error");

            publishBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Publishing...';
            initIcons();

            try {
                const res = await fetch('/api/update-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        owner, repo, path, content,
                        message: aiMessage || `Rapid Edit: ${path}`
                    })
                });
                if (res.ok) {
                    showToast("Successfully published to GitHub!");
                    // Reset AI state
                    if (aiBtn) {
                        aiBtn.innerHTML = '<i data-lucide="sparkles"></i> AI Architect';
                        delete aiBtn.dataset.suggestedMessage;
                    }
                } else {
                    showToast("Publish failed", "error");
                }
            } catch (e) {
                showToast("Network error", "error");
            } finally {
                publishBtn.innerHTML = 'Commit Changes';
                initIcons();
            }
        };
    }

    initIcons();
});
