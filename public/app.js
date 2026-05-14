// GitWeaver Application Script - Integrated Frontend

// Global state
let currentUser = null;
let repositories = [];
let currentView = 'dashboard';

// Initialize app on load
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
});

// Initialize the application
async function initializeApp() {
    try {
        // Check if user is authenticated
        const response = await fetch('/api/user', { credentials: 'include' });
        
        if (response.ok) {
            currentUser = await response.json();
            showAppView();
            loadUserData();
            await loadRepositories();
            // Ensure default view is displayed
            switchView('dashboard');
        } else {
            showLandingView();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showLandingView();
    }
}

// Show landing view
function showLandingView() {
    document.getElementById('landing-view').style.display = 'flex';
    document.getElementById('app-view').style.display = 'none';
}

// Show app view
function showAppView() {
    document.getElementById('landing-view').style.display = 'none';
    document.getElementById('app-view').style.display = 'flex';
}

// Load user data and populate UI
function loadUserData() {
    if (!currentUser) return;

    document.getElementById('sidebar-username').textContent = currentUser.login || 'User';
    document.getElementById('sidebar-avatar').src = currentUser.avatar_url;
    document.getElementById('owner-name').textContent = currentUser.login;
}

// Load repositories from GitHub API
async function loadRepositories() {
    try {
        const response = await fetch('/api/repos', { credentials: 'include' });
        
        if (!response.ok) throw new Error('Failed to load repositories');

        repositories = await response.json();
        renderRepositoryList();
        updateMetrics();
    } catch (error) {
        console.error('Error loading repositories:', error);
        showToast('Failed to load repositories', 'error');
    }
}

// Render repository list in dashboard
function renderRepositoryList() {
    const listContainer = document.getElementById('repo-list-content');
    
    if (repositories.length === 0) {
        listContainer.innerHTML = `
            <div class="px-gutter py-8 text-center text-on-surface-variant">
                <span class="material-symbols-outlined text-4xl mb-2 block opacity-50">folder_open</span>
                <p class="font-body-md text-body-md">No repositories yet. Create one to get started.</p>
            </div>
        `;
        return;
    }

    // Create header row
    const header = `
        <div class="bg-surface-container-low px-gutter py-3 grid grid-cols-12 items-center gap-4 sticky top-0 border-b border-[#30363d]">
            <div class="col-span-5 font-label-caps text-label-caps text-on-surface-variant uppercase">Repository Name</div>
            <div class="col-span-2 font-label-caps text-label-caps text-on-surface-variant uppercase">Visibility</div>
            <div class="col-span-2 font-label-caps text-label-caps text-on-surface-variant uppercase">Language</div>
            <div class="col-span-2 font-label-caps text-label-caps text-on-surface-variant uppercase">Last Sync</div>
            <div class="col-span-1"></div>
        </div>
    `;

    // Create repo rows
    const rows = repositories.map(repo => `
        <div class="px-gutter py-4 grid grid-cols-12 items-center gap-4 border-t border-[#30363d] hover:bg-surface-container-high/50 transition-colors group">
            <div class="col-span-5 flex items-center gap-3">
                <span class="material-symbols-outlined text-primary">${repo.private ? 'folder_lock' : 'folder'}</span>
                <div class="flex flex-col">
                    <button onclick="openRepoModal('${repo.name}')" class="font-body-md text-body-md font-bold text-primary group-hover:underline cursor-pointer text-left">${repo.name}</button>
                    <span class="font-body-sm text-body-sm text-on-surface-variant">${repo.description || 'No description'}</span>
                </div>
            </div>
            <div class="col-span-2">
                <span class="px-2 py-0.5 bg-surface-container-highest border border-outline-variant rounded font-code-sm text-code-sm text-on-surface uppercase">${repo.private ? 'Private' : 'Public'}</span>
            </div>
            <div class="col-span-2 flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-primary"></div>
                <span class="font-body-sm text-body-sm text-on-surface">${repo.language || 'Unknown'}</span>
            </div>
            <div class="col-span-2">
                <span class="font-code-sm text-code-sm text-on-surface-variant">${formatDate(repo.updated_at)}</span>
            </div>
            <div class="col-span-1 text-right">
                <button onclick="openRepoModal('${repo.name}')" class="bg-[#21262d] border border-[#30363d] text-on-surface px-3 py-1.5 rounded font-body-sm text-body-sm hover:border-outline transition-all active:scale-[0.98]">Manage</button>
            </div>
        </div>
    `).join('');

    listContainer.innerHTML = header + rows;
}

// Update metrics
function updateMetrics() {
    document.getElementById('repo-count').textContent = repositories.length;
    document.getElementById('api-calls').textContent = (Math.random() * 1000).toFixed(0);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

// Switch between views
function switchView(viewName) {
    currentView = viewName;
    
    // Hide all view content
    document.querySelectorAll('.view-content').forEach(v => v.style.display = 'none');
    
    // Remove active state from nav buttons
    document.querySelectorAll('.view-nav-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-surface-container-high', 'text-primary', 'border-r-2', 'border-primary');
    });
    
    // Show selected view
    const viewId = `${viewName}-view`;
    const viewElement = document.getElementById(viewId);
    if (viewElement) {
        // Use flex for editor view to maintain layout
        viewElement.style.display = viewName === 'editor' ? 'flex' : 'block';
    }
    
    // Set active nav button
    const navBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (navBtn) {
        navBtn.classList.add('active', 'bg-surface-container-high', 'text-primary', 'border-r-2', 'border-primary');
    }
}

// Handle provisioning form submission
document.addEventListener('DOMContentLoaded', () => {
    const provisionForm = document.getElementById('provision-form');
    if (provisionForm) {
        provisionForm.addEventListener('submit', handleProvisioningSubmit);
    }
    
    // Handle visibility radio buttons
    const visibilityRadios = document.querySelectorAll('input[name="visibility"]');
    visibilityRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('visibility-text').textContent = e.target.value;
        });
    });

    // AI name forge button
    const aiForge = document.getElementById('ai-name-forge');
    if (aiForge) {
        aiForge.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const input = document.getElementById('repo_name');
            const keyword = (input && input.value.trim()) || 'app';
            try {
                aiForge.disabled = true;
                aiForge.classList.add('loading');
                const r = await fetch('/api/generate-repo-name', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keyword }),
                    credentials: 'include'
                });
                if (!r.ok) throw new Error('Failed to generate names');
                const body = await r.json();
                const list = document.getElementById('name-suggestions');
                list.innerHTML = '';
                (body.suggestions || []).forEach(s => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'px-3 py-1 mr-2 mb-2 rounded bg-surface-container-high border border-outline-variant text-on-surface text-sm';
                    btn.textContent = s;
                    btn.addEventListener('click', () => { input.value = s; list.innerHTML = ''; });
                    list.appendChild(btn);
                });
            } catch (err) {
                console.error(err);
                showToast('AI name generation failed', 'error');
            } finally {
                aiForge.disabled = false;
                aiForge.classList.remove('loading');
            }
        });
    }
});

async function handleProvisioningSubmit(e) {
    e.preventDefault();

    const repoName = document.getElementById('repo_name').value.trim();
    const description = document.getElementById('description').value.trim();
    const visibility = document.querySelector('input[name="visibility"]:checked').value;
    const includeReadme = document.getElementById('init_readme').checked;
    const includeGitignore = document.getElementById('init_gitignore').checked;
    const includeLicense = document.getElementById('init_license').checked;
    const defaultBranch = document.getElementById('default_branch').value.trim() || 'main';

    if (!repoName) {
        showToast('Repository name is required', 'error');
        return;
    }

    try {
        const response = await fetch('/api/create-repo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name: repoName,
                description,
                private: visibility === 'private',
                auto_init: includeReadme || includeGitignore || includeLicense,
                readme: includeReadme,
                gitignore: includeGitignore,
                license: includeLicense,
                default_branch: defaultBranch
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create repository');
        }

        const repo = await response.json();
        showToast(`Repository "${repoName}" created successfully!`, 'success');
        
        // Reset form and reload repos
        document.getElementById('provision-form').reset();
        await loadRepositories();
        switchView('dashboard');

    } catch (error) {
        console.error('Provisioning error:', error);
        showToast(error.message, 'error');
    }
}

// Handle file editor
document.addEventListener('DOMContentLoaded', () => {
    const fileContent = document.getElementById('file-content');
    if (fileContent) {
        fileContent.addEventListener('input', updateFileStats);
    }
});

function updateFileStats() {
    const content = document.getElementById('file-content').value;
    document.getElementById('file-lines').textContent = content.split('\n').length;
    document.getElementById('file-size').textContent = new Blob([content]).size;
}

async function commitFile() {
    const repo = document.getElementById('file-repo').value.trim();
    const path = document.getElementById('file-path').value.trim();
    const content = document.getElementById('file-content').value;
    const message = `Update ${path}`;

    if (!repo || !path || !content) {
        showToast('Repository, path, and content are required', 'error');
        return;
    }

    try {
        const response = await fetch('/api/edit-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ repo, path, content, message })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to commit file');
        }

        showToast('File committed successfully!', 'success');
        document.getElementById('file-repo').value = '';
        document.getElementById('file-path').value = '';
        document.getElementById('file-content').value = '';
        updateFileStats();

    } catch (error) {
        console.error('Commit error:', error);
        showToast(error.message, 'error');
    }
}

function previewFile() {
    const content = document.getElementById('file-content').value;
    if (!content) {
        showToast('No content to preview', 'error');
        return;
    }
    
    // Highlight with Prism if available
    if (window.Prism) {
        const highlighted = Prism.highlight(content, Prism.languages.javascript, 'javascript');
        console.log('Preview:\n' + highlighted);
    }
    showToast('Preview logged to console', 'success');
}

// Open repository modal
function openRepoModal(repoName) {
    const repo = repositories.find(r => r.name === repoName);
    if (!repo) return;

    document.getElementById('modal-title').textContent = repo.name;
    
    const modalContent = `
        <div class="space-y-4">
            <div>
                <span class="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">Description</span>
                <p class="font-body-md text-body-md text-on-surface">${repo.description || 'No description'}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">Visibility</span>
                    <span class="font-body-md text-body-md text-on-surface">${repo.private ? 'Private' : 'Public'}</span>
                </div>
                <div>
                    <span class="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">Language</span>
                    <span class="font-body-md text-body-md text-on-surface">${repo.language || 'Unknown'}</span>
                </div>
                <div>
                    <span class="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">Stars</span>
                    <span class="font-body-md text-body-md text-on-surface">${repo.stargazers_count}</span>
                </div>
                <div>
                    <span class="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">Created</span>
                    <span class="font-body-md text-body-md text-on-surface">${formatDate(repo.created_at)}</span>
                </div>
            </div>
            <div>
                <span class="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">Clone URL</span>
                <code class="font-code-md text-code-md text-on-surface block bg-surface-container-lowest p-2 rounded break-all">${repo.clone_url}</code>
            </div>
            <div class="flex gap-2 pt-4 border-t border-outline-variant">
                <button onclick="closeRepoModal()" class="flex-1 px-4 py-2 rounded-lg border border-outline-variant font-body-md text-body-md text-on-surface hover:bg-surface-container-high transition-colors">Close</button>
                <a href="${repo.html_url}" target="_blank" class="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-body-md font-bold text-center hover:brightness-110 transition-all">View on GitHub</a>
            </div>
        </div>
    `;

    document.getElementById('modal-content').innerHTML = modalContent;
    document.getElementById('repo-modal').classList.remove('hidden');
}

function closeRepoModal() {
    document.getElementById('repo-modal').classList.add('hidden');
}

// Settings
function openSettings() {
    showToast('Settings page coming soon', 'success');
}

// Toast notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg font-body-md text-body-md flex items-center gap-2 ${
        type === 'success' 
            ? 'bg-secondary-container text-on-secondary-container' 
            : 'bg-error-container text-on-error-container'
    }`;

    const icon = type === 'success' ? 'check_circle' : 'error';
    toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span><span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filteredRepos = repositories.filter(repo => 
                repo.name.toLowerCase().includes(query) ||
                (repo.description && repo.description.toLowerCase().includes(query))
            );
            // You could update the display here
        });
    }
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
    setupEventListeners();
}
