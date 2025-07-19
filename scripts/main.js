/**
 * Main application initialization and global functionality
 */

// Global variables
let currentFileId = null;
let files = [];
let currentTab = 'gallery';

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
async function initializeApp() {
    await loadFiles();
    setupEventListeners();
    await updateStats();
    
    // Show gallery by default
    await switchTab('gallery');
    
    console.log('FileShare application initialized');
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const tab = e.target.closest('.nav-btn').dataset.tab;
            await switchTab(tab);
        });
    });
    
    // Modal close events
    document.getElementById('file-modal').addEventListener('click', (e) => {
        if (e.target.id === 'file-modal') {
            closeModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => renderGallery(), 300));
    }
    
    // Filter controls
    const sortSelect = document.getElementById('sort-select');
    const typeFilter = document.getElementById('type-filter');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', () => renderGallery());
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', () => renderGallery());
    }
}

/**
 * Switch between tabs
 */
async function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Show/hide tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    currentTab = tabName;
    
    // Refresh gallery if switching to it
    if (tabName === 'gallery') {
        await renderGallery();
    }
}

/**
 * Show loading overlay
 */
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, 5000);
}

/**
 * Get icon for toast type
 */
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

/**
 * Open file preview modal
 */
async function openFileModal(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    currentFileId = fileId;
    
    // Increment view count
    await incrementViews(fileId);
    
    const modal = document.getElementById('file-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-file-content');
    const modalDate = document.getElementById('modal-date');
    const modalSize = document.getElementById('modal-size');
    const modalViews = document.getElementById('modal-views');
    const modalCaption = document.getElementById('modal-caption');
    const modalLikes = document.getElementById('modal-likes');
    const modalDislikes = document.getElementById('modal-dislikes');
    
    // Set modal content
    modalTitle.textContent = file.name;
    modalDate.textContent = formatDate(file.uploadDate);
    modalSize.textContent = formatFileSize(file.size);
    modalViews.textContent = `${file.views} views`;
    modalCaption.textContent = file.caption || 'No caption provided';
    modalLikes.textContent = file.likes;
    modalDislikes.textContent = file.dislikes;
    
    // Set file content based on type
    if (file.type.startsWith('image/')) {
        modalContent.innerHTML = `
            <div class="file-preview-modal">
                <img src="${file.content}" alt="${file.name}" />
            </div>
        `;
    } else if (file.type === 'text/plain') {
        modalContent.innerHTML = `
            <div class="file-preview-modal">
                <div class="text-content">${escapeHtml(file.textContent || 'Content not available')}</div>
            </div>
        `;
    } else {
        modalContent.innerHTML = `
            <div class="file-preview-modal">
                <div class="file-icon-large">
                    <i class="fas fa-${getFileIcon(file.type)}"></i>
                </div>
                <p>Preview not available for this file type</p>
                <p>Click download to save the file</p>
            </div>
        `;
    }
    
    // Update like/dislike button states
    await updateModalButtons(fileId);
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

/**
 * Close file preview modal
 */
function closeModal() {
    document.getElementById('file-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentFileId = null;
}

/**
 * Update modal button states
 */
async function updateModalButtons(fileId) {
    const userReactions = await getUserReactions();
    const likeBtn = document.querySelector('.like-btn');
    const dislikeBtn = document.querySelector('.dislike-btn');
    
    // Remove active states
    likeBtn.classList.remove('active');
    dislikeBtn.classList.remove('active');
    
    // Set active state based on user reaction
    if (userReactions[fileId] === 'like') {
        likeBtn.classList.add('active');
    } else if (userReactions[fileId] === 'dislike') {
        dislikeBtn.classList.add('active');
    }
}

/**
 * Toggle like for a file
 */
async function toggleLike(fileId) {
    // Try to handle on server first
    if (await checkServerAvailability()) {
        const success = await handleReactionOnServer(fileId, 'like');
        if (success) {
            // Reload files and stats from server
            await loadFilesFromServer();
            await loadStatsFromServer();
            
            // Update UI
            const file = files.find(f => f.id === fileId);
            if (file && currentFileId === fileId) {
                document.getElementById('modal-likes').textContent = file.likes;
                document.getElementById('modal-dislikes').textContent = file.dislikes;
                await updateModalButtons(fileId);
            }
            
            renderGallery();
            return;
        }
    }
    
    // Fall back to local storage
    const userReactions = await getUserReactions();
    const currentReaction = userReactions[fileId];
    
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    if (currentReaction === 'like') {
        file.likes--;
        delete userReactions[fileId];
    } else {
        if (currentReaction === 'dislike') {
            file.dislikes--;
        }
        file.likes++;
        userReactions[fileId] = 'like';
    }
    
    saveFiles();
    saveUserReactions(userReactions);
    
    if (currentFileId === fileId) {
        document.getElementById('modal-likes').textContent = file.likes;
        document.getElementById('modal-dislikes').textContent = file.dislikes;
        await updateModalButtons(fileId);
    }
    
    renderGallery();
    updateStats();
}

/**
 * Toggle dislike for a file
 */
async function toggleDislike(fileId) {
    // Try to handle on server first
    if (await checkServerAvailability()) {
        const success = await handleReactionOnServer(fileId, 'dislike');
        if (success) {
            // Reload files and stats from server
            await loadFilesFromServer();
            await loadStatsFromServer();
            
            // Update UI
            const file = files.find(f => f.id === fileId);
            if (file && currentFileId === fileId) {
                document.getElementById('modal-likes').textContent = file.likes;
                document.getElementById('modal-dislikes').textContent = file.dislikes;
                await updateModalButtons(fileId);
            }
            
            renderGallery();
            return;
        }
    }
    
    // Fall back to local storage
    const userReactions = await getUserReactions();
    const currentReaction = userReactions[fileId];
    
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    if (currentReaction === 'dislike') {
        file.dislikes--;
        delete userReactions[fileId];
    } else {
        if (currentReaction === 'like') {
            file.likes--;
        }
        file.dislikes++;
        userReactions[fileId] = 'dislike';
    }
    
    saveFiles();
    saveUserReactions(userReactions);
    
    if (currentFileId === fileId) {
        document.getElementById('modal-likes').textContent = file.likes;
        document.getElementById('modal-dislikes').textContent = file.dislikes;
        await updateModalButtons(fileId);
    }
    
    renderGallery();
    updateStats();
}

/**
 * Download a file
 */
function downloadFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    try {
        const link = document.createElement('a');
        link.href = file.content;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('File download started', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Failed to download file', 'error');
    }
}

/**
 * Increment view count for a file
 */
async function incrementViews(fileId) {
    // Try to increment on server first
    if (await checkServerAvailability()) {
        await incrementViewsOnServer(fileId);
        // Reload stats from server
        await loadStatsFromServer();
        return;
    }
    
    // Fall back to local storage
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    file.views++;
    saveFiles();
    updateStats();
}

/**
 * Handle search input
 */
function handleSearch() {
    renderGallery();
}

/**
 * Update application statistics
 */
async function updateStats() {
    // Try to load from server first
    if (await checkServerAvailability()) {
        await loadStatsFromServer();
        return;
    }
    
    // Fall back to local calculation
    const totalFiles = files.length;
    const totalViews = files.reduce((sum, file) => sum + file.views, 0);
    const totalLikes = files.reduce((sum, file) => sum + file.likes, 0);
    
    document.getElementById('total-files').textContent = totalFiles;
    document.getElementById('total-views').textContent = totalViews;
    document.getElementById('total-likes').textContent = totalLikes;
}

/**
 * Debounce function for search
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add slideOut animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.switchTab = switchTab;
window.openFileModal = openFileModal;
window.closeModal = closeModal;
window.toggleLike = toggleLike;
window.toggleDislike = toggleDislike;
window.downloadFile = downloadFile;
window.showToast = showToast;
