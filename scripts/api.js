/**
 * API communication for server-based file sharing
 */

// API base URL
const API_BASE = '';

// User ID for tracking reactions (stored in localStorage)
let currentUserId = localStorage.getItem('fileshare_user_id');
if (!currentUserId) {
    currentUserId = 'user_' + Math.random().toString(36).substr(2, 12);
    localStorage.setItem('fileshare_user_id', currentUserId);
}

/**
 * Make API request with error handling
 */
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * Load files from server
 */
async function loadFilesFromServer() {
    try {
        const response = await apiRequest('/api/files');
        if (response.success) {
            files = response.files.map(file => ({
                id: file.file_id,
                name: file.name,
                type: file.type,
                size: parseInt(file.size),
                content: file.content,
                textContent: file.text_content,
                caption: file.caption,
                uploadDate: file.upload_date,
                views: parseInt(file.views),
                likes: parseInt(file.likes),
                dislikes: parseInt(file.dislikes)
            }));
            console.log(`Loaded ${files.length} files from server`);
        }
    } catch (error) {
        console.error('Failed to load files from server:', error);
        showToast('Failed to load files from server', 'error');
        // Fall back to local storage
        loadFiles();
    }
}

/**
 * Upload file to server
 */
async function uploadFileToServer(fileData, caption) {
    try {
        const response = await apiRequest('/api/upload', {
            method: 'POST',
            body: JSON.stringify({
                fileData: JSON.stringify(fileData),
                caption: caption
            })
        });
        
        if (response.success) {
            console.log('File uploaded to server successfully');
            return response.fileId;
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Failed to upload file to server:', error);
        throw error;
    }
}

/**
 * Increment file views on server
 */
async function incrementViewsOnServer(fileId) {
    try {
        await apiRequest(`/api/files/${fileId}/view`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Failed to increment views on server:', error);
    }
}

/**
 * Handle like/dislike on server
 */
async function handleReactionOnServer(fileId, reaction) {
    try {
        const response = await apiRequest(`/api/files/${fileId}/reaction`, {
            method: 'POST',
            body: JSON.stringify({
                reaction: reaction,
                userId: currentUserId
            })
        });
        
        return response.success;
    } catch (error) {
        console.error('Failed to handle reaction on server:', error);
        return false;
    }
}

/**
 * Load user reactions from server
 */
async function loadUserReactionsFromServer() {
    try {
        const response = await apiRequest(`/api/reactions/${currentUserId}`);
        if (response.success) {
            return response.reactions;
        }
    } catch (error) {
        console.error('Failed to load user reactions from server:', error);
    }
    return {};
}

/**
 * Load statistics from server
 */
async function loadStatsFromServer() {
    try {
        const response = await apiRequest('/api/stats');
        if (response.success) {
            const stats = response.stats;
            document.getElementById('total-files').textContent = stats.total_files;
            document.getElementById('total-views').textContent = stats.total_views;
            document.getElementById('total-likes').textContent = stats.total_likes;
        }
    } catch (error) {
        console.error('Failed to load stats from server:', error);
        // Fall back to local calculation
        updateStats();
    }
}

/**
 * Check if server is available
 */
async function checkServerAvailability() {
    try {
        await apiRequest('/api/stats');
        return true;
    } catch (error) {
        return false;
    }
}

// Make functions globally available
window.loadFilesFromServer = loadFilesFromServer;
window.uploadFileToServer = uploadFileToServer;
window.incrementViewsOnServer = incrementViewsOnServer;
window.handleReactionOnServer = handleReactionOnServer;
window.loadUserReactionsFromServer = loadUserReactionsFromServer;
window.loadStatsFromServer = loadStatsFromServer;
window.checkServerAvailability = checkServerAvailability;
window.currentUserId = currentUserId;