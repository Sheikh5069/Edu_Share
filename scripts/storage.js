/**
 * Local storage management for files and user data
 */

const STORAGE_KEYS = {
    FILES: 'fileshare_files',
    USER_REACTIONS: 'fileshare_user_reactions',
    SETTINGS: 'fileshare_settings'
};

/**
 * Load files from server or localStorage as fallback
 */
async function loadFiles() {
    // Try to load from server first
    if (await checkServerAvailability()) {
        await loadFilesFromServer();
        return;
    }
    
    // Fall back to localStorage
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.FILES);
        files = stored ? JSON.parse(stored) : [];
        
        // Validate and clean up files
        files = files.filter(file => {
            return file && file.id && file.name && file.type;
        });
        
        console.log(`Loaded ${files.length} files from local storage`);
    } catch (error) {
        console.error('Error loading files:', error);
        files = [];
        showToast('Error loading files from storage', 'error');
    }
}

/**
 * Save files to localStorage
 */
function saveFiles() {
    try {
        localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
        console.log(`Saved ${files.length} files to storage`);
    } catch (error) {
        console.error('Error saving files:', error);
        
        if (error.name === 'QuotaExceededError') {
            showToast('Storage quota exceeded. Please delete some files.', 'error');
            return false;
        }
        
        showToast('Error saving files to storage', 'error');
        return false;
    }
    return true;
}

/**
 * Add a new file to storage (server or localStorage)
 */
async function addFile(fileData) {
    try {
        // Try to upload to server first
        if (await checkServerAvailability()) {
            const fileId = await uploadFileToServer(fileData, fileData.caption);
            if (fileId) {
                // Reload files from server to get updated list
                await loadFilesFromServer();
                console.log('File uploaded to server successfully:', fileData.name);
                return { id: fileId };
            }
        }
        
        // Fall back to localStorage
        const id = generateFileId();
        const file = {
            id: id,
            name: fileData.name,
            type: fileData.type,
            size: fileData.size,
            content: fileData.content,
            textContent: fileData.textContent || null,
            caption: fileData.caption || '',
            uploadDate: new Date().toISOString(),
            views: 0,
            likes: 0,
            dislikes: 0,
            uploader: generateUploaderId()
        };
        
        files.unshift(file);
        
        if (saveFiles()) {
            console.log('File added to local storage:', file.name);
            return file;
        }
        
        return null;
    } catch (error) {
        console.error('Error adding file:', error);
        showToast('Error adding file to storage', 'error');
        return null;
    }
}

/**
 * Delete a file from storage
 */
function deleteFile(fileId) {
    try {
        const index = files.findIndex(f => f.id === fileId);
        if (index === -1) {
            showToast('File not found', 'error');
            return false;
        }
        
        const fileName = files[index].name;
        files.splice(index, 1);
        
        if (saveFiles()) {
            // Also remove user reactions for this file
            const userReactions = getUserReactions();
            delete userReactions[fileId];
            saveUserReactions(userReactions);
            
            console.log('File deleted successfully:', fileName);
            showToast('File deleted successfully', 'success');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        showToast('Error deleting file', 'error');
        return false;
    }
}

/**
 * Get user reactions from server or localStorage
 */
async function getUserReactions() {
    try {
        // Try to load from server first
        if (await checkServerAvailability()) {
            return await loadUserReactionsFromServer();
        }
        
        // Fall back to localStorage
        const stored = localStorage.getItem(STORAGE_KEYS.USER_REACTIONS);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error loading user reactions:', error);
        return {};
    }
}

/**
 * Save user reactions to localStorage
 */
function saveUserReactions(reactions) {
    try {
        localStorage.setItem(STORAGE_KEYS.USER_REACTIONS, JSON.stringify(reactions));
        return true;
    } catch (error) {
        console.error('Error saving user reactions:', error);
        return false;
    }
}

/**
 * Get user settings from localStorage
 */
function getUserSettings() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return stored ? JSON.parse(stored) : {
            theme: 'light',
            autoPlayVideos: false,
            defaultSort: 'newest'
        };
    } catch (error) {
        console.error('Error loading user settings:', error);
        return {};
    }
}

/**
 * Save user settings to localStorage
 */
function saveUserSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('Error saving user settings:', error);
        return false;
    }
}

/**
 * Generate unique file ID
 */
function generateFileId() {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate anonymous uploader ID
 */
function generateUploaderId() {
    return 'user_' + Math.random().toString(36).substr(2, 12);
}

/**
 * Get storage usage information
 */
function getStorageInfo() {
    try {
        const filesData = localStorage.getItem(STORAGE_KEYS.FILES);
        const reactionsData = localStorage.getItem(STORAGE_KEYS.USER_REACTIONS);
        const settingsData = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        
        const filesSize = filesData ? new Blob([filesData]).size : 0;
        const reactionsSize = reactionsData ? new Blob([reactionsData]).size : 0;
        const settingsSize = settingsData ? new Blob([settingsData]).size : 0;
        
        const totalUsed = filesSize + reactionsSize + settingsSize;
        const estimatedQuota = 5 * 1024 * 1024; // Rough estimate of 5MB for localStorage
        
        return {
            filesSize,
            reactionsSize,
            settingsSize,
            totalUsed,
            estimatedQuota,
            percentageUsed: (totalUsed / estimatedQuota) * 100
        };
    } catch (error) {
        console.error('Error getting storage info:', error);
        return null;
    }
}

/**
 * Clear all application data
 */
function clearAllData() {
    if (confirm('Are you sure you want to delete all files and data? This action cannot be undone.')) {
        try {
            localStorage.removeItem(STORAGE_KEYS.FILES);
            localStorage.removeItem(STORAGE_KEYS.USER_REACTIONS);
            localStorage.removeItem(STORAGE_KEYS.SETTINGS);
            
            files = [];
            
            showToast('All data cleared successfully', 'success');
            renderGallery();
            updateStats();
            
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            showToast('Error clearing data', 'error');
            return false;
        }
    }
    return false;
}

/**
 * Export all data as JSON
 */
function exportData() {
    try {
        const data = {
            files: files,
            userReactions: getUserReactions(),
            settings: getUserSettings(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `fileshare_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Data exported successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Error exporting data', 'error');
        return false;
    }
}

/**
 * Import data from JSON file
 */
function importData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data structure
                if (!data.files || !Array.isArray(data.files)) {
                    throw new Error('Invalid data format');
                }
                
                // Backup current data
                const backup = {
                    files: [...files],
                    userReactions: getUserReactions(),
                    settings: getUserSettings()
                };
                
                // Import files
                files = data.files;
                
                // Import user reactions if available
                if (data.userReactions) {
                    saveUserReactions(data.userReactions);
                }
                
                // Import settings if available
                if (data.settings) {
                    saveUserSettings(data.settings);
                }
                
                // Save imported files
                if (saveFiles()) {
                    showToast('Data imported successfully', 'success');
                    renderGallery();
                    updateStats();
                    resolve(true);
                } else {
                    // Restore backup on failure
                    files = backup.files;
                    saveUserReactions(backup.userReactions);
                    saveUserSettings(backup.settings);
                    reject(new Error('Failed to save imported data'));
                }
            } catch (error) {
                console.error('Error importing data:', error);
                showToast('Error importing data: ' + error.message, 'error');
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

// Make functions globally available
window.loadFiles = loadFiles;
window.saveFiles = saveFiles;
window.addFile = addFile;
window.deleteFile = deleteFile;
window.getUserReactions = getUserReactions;
window.saveUserReactions = saveUserReactions;
window.getUserSettings = getUserSettings;
window.saveUserSettings = saveUserSettings;
window.getStorageInfo = getStorageInfo;
window.clearAllData = clearAllData;
window.exportData = exportData;
window.importData = importData;
