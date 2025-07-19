/**
 * File sharing functionality - export/import files between devices
 */

// Initialize share functionality
document.addEventListener('DOMContentLoaded', function() {
    setupShareEvents();
});

/**
 * Setup share event listeners
 */
function setupShareEvents() {
    const importInput = document.getElementById('import-input');
    if (importInput) {
        importInput.addEventListener('change', handleImportFile);
    }
}

/**
 * Export all files and data
 */
function exportAllData() {
    try {
        showLoading();
        
        const data = {
            files: files,
            userReactions: getUserReactions(),
            settings: getUserSettings(),
            exportDate: new Date().toISOString(),
            version: '1.0',
            totalFiles: files.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0)
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `fileshare_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        hideLoading();
        showToast(`Exported ${files.length} files successfully!`, 'success');
        
        console.log(`Exported ${files.length} files (${formatFileSize(data.totalSize)})`);
    } catch (error) {
        hideLoading();
        console.error('Export error:', error);
        showToast('Failed to export files: ' + error.message, 'error');
    }
}

/**
 * Handle import file selection
 */
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/json') {
        showToast('Please select a valid JSON export file', 'error');
        return;
    }
    
    importDataFromFile(file);
}

/**
 * Import data from file
 */
async function importDataFromFile(file) {
    try {
        showLoading();
        
        const fileContent = await readFileAsText(file);
        const importData = JSON.parse(fileContent);
        
        // Validate import data
        if (!validateImportData(importData)) {
            throw new Error('Invalid export file format');
        }
        
        // Show import confirmation
        const confirmMessage = `Import ${importData.files?.length || 0} files from ${formatDate(importData.exportDate)}?\n\nThis will replace your current files.`;
        
        if (!confirm(confirmMessage)) {
            hideLoading();
            return;
        }
        
        // Backup current data
        const backup = {
            files: [...files],
            userReactions: getUserReactions(),
            settings: getUserSettings()
        };
        
        try {
            // Import files
            files = importData.files || [];
            
            // Import user reactions if available
            if (importData.userReactions) {
                saveUserReactions(importData.userReactions);
            }
            
            // Import settings if available
            if (importData.settings) {
                saveUserSettings(importData.settings);
            }
            
            // Save imported files
            if (saveFiles()) {
                hideLoading();
                showToast(`Successfully imported ${files.length} files!`, 'success');
                
                // Refresh UI
                renderGallery();
                updateStats();
                
                // Switch to gallery tab to show imported files
                switchTab('gallery');
                
                console.log(`Imported ${files.length} files successfully`);
            } else {
                throw new Error('Failed to save imported files');
            }
            
        } catch (saveError) {
            // Restore backup on failure
            files = backup.files;
            saveUserReactions(backup.userReactions);
            saveUserSettings(backup.settings);
            saveFiles();
            
            throw saveError;
        }
        
    } catch (error) {
        hideLoading();
        console.error('Import error:', error);
        showToast('Failed to import files: ' + error.message, 'error');
    } finally {
        // Reset file input
        event.target.value = '';
    }
}

/**
 * Read file as text
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Validate import data structure
 */
function validateImportData(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    // Check required fields
    if (!data.files || !Array.isArray(data.files)) {
        return false;
    }
    
    // Check version compatibility
    if (data.version && data.version !== '1.0') {
        console.warn('Import file version mismatch:', data.version);
    }
    
    // Validate each file structure
    for (const file of data.files) {
        if (!file.id || !file.name || !file.type || !file.content) {
            console.error('Invalid file structure:', file);
            return false;
        }
    }
    
    return true;
}

/**
 * Get import/export statistics
 */
function getShareStats() {
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const storageInfo = getStorageInfo();
    
    return {
        totalFiles,
        totalSize,
        formattedSize: formatFileSize(totalSize),
        storageUsed: storageInfo ? formatFileSize(storageInfo.totalUsed) : 'Unknown',
        storagePercent: storageInfo ? storageInfo.percentageUsed.toFixed(1) : 'Unknown'
    };
}

/**
 * Show share statistics in UI
 */
function updateShareStats() {
    const stats = getShareStats();
    
    const statsContainer = document.getElementById('share-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="share-stat">
                <span class="stat-number">${stats.totalFiles}</span>
                <span class="stat-label">Files</span>
            </div>
            <div class="share-stat">
                <span class="stat-number">${stats.formattedSize}</span>
                <span class="stat-label">Total Size</span>
            </div>
            <div class="share-stat">
                <span class="stat-number">${stats.storagePercent}%</span>
                <span class="stat-label">Storage Used</span>
            </div>
        `;
    }
}

/**
 * Generate share link for individual file (future feature)
 */
function generateShareLink(fileId) {
    // This would generate a shareable link for a specific file
    // Could use URL fragments, base64 encoding, or external service
    const file = files.find(f => f.id === fileId);
    if (!file) return null;
    
    // For now, return a placeholder
    const baseUrl = window.location.origin + window.location.pathname;
    const shareData = {
        fileId: file.id,
        fileName: file.name,
        fileType: file.type,
        uploadDate: file.uploadDate
    };
    
    // Encode share data in URL fragment
    const encodedData = btoa(JSON.stringify(shareData));
    return `${baseUrl}#share=${encodedData}`;
}

/**
 * Handle shared file from URL (future feature)
 */
function handleSharedUrl() {
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
        try {
            const encodedData = hash.substring(7);
            const shareData = JSON.parse(atob(encodedData));
            
            console.log('Shared file detected:', shareData);
            showToast('Shared file link detected - feature coming soon!', 'info');
            
        } catch (error) {
            console.error('Invalid share link:', error);
        }
    }
}

// Initialize share URL handling
document.addEventListener('DOMContentLoaded', function() {
    handleSharedUrl();
});

// Make functions globally available
window.exportAllData = exportAllData;
window.importDataFromFile = importDataFromFile;
window.getShareStats = getShareStats;
window.updateShareStats = updateShareStats;
window.generateShareLink = generateShareLink;
window.handleSharedUrl = handleSharedUrl;