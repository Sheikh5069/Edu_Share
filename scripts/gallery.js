/**
 * Gallery functionality for displaying and managing files
 */

/**
 * Render the gallery with current files
 */
function renderGallery() {
    const container = document.getElementById('files-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (!container || !emptyState) return;
    
    // Get filtered and sorted files
    const filteredFiles = getFilteredFiles();
    
    // Show/hide empty state
    if (filteredFiles.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    } else {
        container.style.display = 'grid';
        emptyState.style.display = 'none';
    }
    
    // Render files
    container.innerHTML = '';
    filteredFiles.forEach(file => {
        const fileCard = createFileCard(file);
        container.appendChild(fileCard);
    });
    
    console.log(`Rendered ${filteredFiles.length} files in gallery`);
}

/**
 * Get filtered and sorted files based on current settings
 */
function getFilteredFiles() {
    let filteredFiles = [...files];
    
    // Apply search filter
    const searchQuery = document.getElementById('search-input')?.value.toLowerCase().trim();
    if (searchQuery) {
        filteredFiles = filteredFiles.filter(file => 
            file.name.toLowerCase().includes(searchQuery) ||
            (file.caption && file.caption.toLowerCase().includes(searchQuery))
        );
    }
    
    // Apply type filter
    const typeFilter = document.getElementById('type-filter')?.value;
    if (typeFilter && typeFilter !== 'all') {
        filteredFiles = filteredFiles.filter(file => {
            const category = getFileCategory(file.type);
            return category === typeFilter;
        });
    }
    
    // Apply sorting
    const sortBy = document.getElementById('sort-select')?.value || 'newest';
    filteredFiles.sort((a, b) => {
        switch (sortBy) {
            case 'oldest':
                return new Date(a.uploadDate) - new Date(b.uploadDate);
            case 'most-liked':
                return b.likes - a.likes;
            case 'most-viewed':
                return b.views - a.views;
            case 'newest':
            default:
                return new Date(b.uploadDate) - new Date(a.uploadDate);
        }
    });
    
    return filteredFiles;
}

/**
 * Create a file card element
 */
function createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.addEventListener('click', () => openFileModal(file.id));
    
    const category = getFileCategory(file.type);
    const icon = getFileIcon(file.type);
    const userReactions = getUserReactions();
    const userReaction = userReactions[file.id];
    
    // Create thumbnail content
    let thumbnailContent;
    if (file.type.startsWith('image/')) {
        thumbnailContent = `<img src="${file.content}" alt="${escapeHtml(file.name)}" />`;
    } else {
        thumbnailContent = `<div class="file-icon-large ${category}"><i class="fas fa-${icon}"></i></div>`;
    }
    
    card.innerHTML = `
        <div class="file-thumbnail ${category}">
            ${thumbnailContent}
            <div class="file-type-badge">${file.type.split('/')[1].toUpperCase()}</div>
        </div>
        <div class="file-info">
            <div class="file-title" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            ${file.caption ? `<div class="file-caption">${escapeHtml(file.caption)}</div>` : ''}
            <div class="file-meta">
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(file.uploadDate)}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-file"></i>
                    <span>${formatFileSize(file.size)}</span>
                </div>
            </div>
            <div class="file-stats">
                <div class="stat-item">
                    <i class="fas fa-eye"></i>
                    <span>${file.views}</span>
                </div>
                <div class="file-actions-inline">
                    <button class="action-btn-small like-btn-small ${userReaction === 'like' ? 'active' : ''}" 
                            onclick="event.stopPropagation(); toggleLike('${file.id}')">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${file.likes}</span>
                    </button>
                    <button class="action-btn-small dislike-btn-small ${userReaction === 'dislike' ? 'active' : ''}" 
                            onclick="event.stopPropagation(); toggleDislike('${file.id}')">
                        <i class="fas fa-thumbs-down"></i>
                        <span>${file.dislikes}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Create file grid item for list view (alternative layout)
 */
function createFileListItem(file) {
    const item = document.createElement('div');
    item.className = 'file-list-item';
    item.addEventListener('click', () => openFileModal(file.id));
    
    const category = getFileCategory(file.type);
    const icon = getFileIcon(file.type);
    const userReactions = getUserReactions();
    const userReaction = userReactions[file.id];
    
    item.innerHTML = `
        <div class="file-icon-container">
            <div class="file-icon ${category}">
                <i class="fas fa-${icon}"></i>
            </div>
        </div>
        <div class="file-details-list">
            <div class="file-name-list">${escapeHtml(file.name)}</div>
            <div class="file-meta-list">
                <span class="file-size-list">${formatFileSize(file.size)}</span>
                <span class="file-date-list">${formatDate(file.uploadDate)}</span>
            </div>
            ${file.caption ? `<div class="file-caption-list">${escapeHtml(file.caption)}</div>` : ''}
        </div>
        <div class="file-stats-list">
            <div class="stat-item-list">
                <i class="fas fa-eye"></i>
                <span>${file.views}</span>
            </div>
            <div class="stat-item-list">
                <i class="fas fa-thumbs-up"></i>
                <span>${file.likes}</span>
            </div>
            <div class="stat-item-list">
                <i class="fas fa-thumbs-down"></i>
                <span>${file.dislikes}</span>
            </div>
        </div>
        <div class="file-actions-list">
            <button class="action-btn-small like-btn-small ${userReaction === 'like' ? 'active' : ''}" 
                    onclick="event.stopPropagation(); toggleLike('${file.id}')">
                <i class="fas fa-thumbs-up"></i>
            </button>
            <button class="action-btn-small dislike-btn-small ${userReaction === 'dislike' ? 'active' : ''}" 
                    onclick="event.stopPropagation(); toggleDislike('${file.id}')">
                <i class="fas fa-thumbs-down"></i>
            </button>
            <button class="action-btn-small download-btn-small" 
                    onclick="event.stopPropagation(); downloadFile('${file.id}')">
                <i class="fas fa-download"></i>
            </button>
        </div>
    `;
    
    return item;
}

/**
 * Switch between grid and list view
 */
function setViewMode(mode) {
    const container = document.getElementById('files-grid');
    if (!container) return;
    
    container.className = mode === 'list' ? 'files-list' : 'files-grid';
    
    // Re-render with appropriate items
    const filteredFiles = getFilteredFiles();
    container.innerHTML = '';
    
    filteredFiles.forEach(file => {
        const item = mode === 'list' ? createFileListItem(file) : createFileCard(file);
        container.appendChild(item);
    });
    
    // Save preference
    const settings = getUserSettings();
    settings.viewMode = mode;
    saveUserSettings(settings);
}

/**
 * Handle gallery controls
 */
function setupGalleryControls() {
    // View mode toggle (if implemented)
    const viewToggle = document.getElementById('view-toggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', () => {
            const currentMode = document.getElementById('files-grid').classList.contains('files-list') ? 'list' : 'grid';
            setViewMode(currentMode === 'grid' ? 'list' : 'grid');
        });
    }
    
    // Bulk actions (if implemented)
    const selectAllBtn = document.getElementById('select-all');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', toggleSelectAll);
    }
    
    const deleteSelectedBtn = document.getElementById('delete-selected');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedFiles);
    }
}

/**
 * Toggle select all files
 */
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
    });
    
    updateBulkActionsVisibility();
}

/**
 * Delete selected files
 */
function deleteSelectedFiles() {
    const selectedIds = Array.from(document.querySelectorAll('.file-checkbox:checked'))
        .map(cb => cb.dataset.fileId);
    
    if (selectedIds.length === 0) {
        showToast('No files selected', 'warning');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedIds.length} file(s)?`)) {
        let deleteCount = 0;
        
        selectedIds.forEach(fileId => {
            if (deleteFile(fileId)) {
                deleteCount++;
            }
        });
        
        if (deleteCount > 0) {
            showToast(`${deleteCount} file(s) deleted successfully`, 'success');
            renderGallery();
            updateStats();
        }
    }
}

/**
 * Update bulk actions visibility
 */
function updateBulkActionsVisibility() {
    const selectedCount = document.querySelectorAll('.file-checkbox:checked').length;
    const bulkActions = document.getElementById('bulk-actions');
    
    if (bulkActions) {
        bulkActions.style.display = selectedCount > 0 ? 'flex' : 'none';
        
        const selectedCountSpan = document.getElementById('selected-count');
        if (selectedCountSpan) {
            selectedCountSpan.textContent = selectedCount;
        }
    }
}

/**
 * Get file recommendations based on user behavior
 */
function getRecommendedFiles(limit = 6) {
    const userReactions = getUserReactions();
    const likedFiles = Object.keys(userReactions).filter(id => userReactions[id] === 'like');
    
    // Get files similar to liked ones (same category)
    const likedCategories = likedFiles.map(id => {
        const file = files.find(f => f.id === id);
        return file ? getFileCategory(file.type) : null;
    }).filter(Boolean);
    
    const categoryCount = {};
    likedCategories.forEach(cat => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    const preferredCategory = Object.keys(categoryCount).reduce((a, b) => 
        categoryCount[a] > categoryCount[b] ? a : b, null);
    
    // Recommend files from preferred category that user hasn't interacted with
    return files
        .filter(file => 
            !userReactions[file.id] && 
            (preferredCategory ? getFileCategory(file.type) === preferredCategory : true)
        )
        .sort((a, b) => (b.likes + b.views) - (a.likes + a.views))
        .slice(0, limit);
}

/**
 * Show recommended files section
 */
function renderRecommendations() {
    const recommendedFiles = getRecommendedFiles();
    
    if (recommendedFiles.length === 0) return;
    
    const container = document.getElementById('recommendations-container');
    if (!container) return;
    
    container.innerHTML = `
        <h3>Recommended for you</h3>
        <div class="recommendations-grid">
            ${recommendedFiles.map(file => createFileCard(file).outerHTML).join('')}
        </div>
    `;
    
    container.style.display = 'block';
}

// Initialize gallery when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupGalleryControls();
});

// Make functions globally available
window.renderGallery = renderGallery;
window.setViewMode = setViewMode;
window.getFilteredFiles = getFilteredFiles;
window.createFileCard = createFileCard;
window.getRecommendedFiles = getRecommendedFiles;
window.renderRecommendations = renderRecommendations;
