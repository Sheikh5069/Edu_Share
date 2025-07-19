/**
 * File upload functionality
 */

// Supported file types and their configurations
const SUPPORTED_TYPES = {
    'image/png': { category: 'image', maxSize: 10 * 1024 * 1024, icon: 'image' },
    'image/jpeg': { category: 'image', maxSize: 10 * 1024 * 1024, icon: 'image' },
    'image/jpg': { category: 'image', maxSize: 10 * 1024 * 1024, icon: 'image' },
    'text/plain': { category: 'text', maxSize: 10 * 1024 * 1024, icon: 'file-alt' },
    'application/pdf': { category: 'document', maxSize: 10 * 1024 * 1024, icon: 'file-pdf' },
    'application/vnd.ms-excel': { category: 'document', maxSize: 10 * 1024 * 1024, icon: 'file-excel' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { category: 'document', maxSize: 10 * 1024 * 1024, icon: 'file-excel' },
    'application/vnd.ms-powerpoint': { category: 'document', maxSize: 10 * 1024 * 1024, icon: 'file-powerpoint' },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { category: 'document', maxSize: 10 * 1024 * 1024, icon: 'file-powerpoint' },
    'application/msword': { category: 'document', maxSize: 10 * 1024 * 1024, icon: 'file-word' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { category: 'document', maxSize: 10 * 1024 * 1024, icon: 'file-word' }
};

let selectedFiles = [];
let isUploading = false;

// Initialize upload functionality
document.addEventListener('DOMContentLoaded', function() {
    setupUploadEvents();
});

/**
 * Setup upload event listeners
 */
function setupUploadEvents() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    if (!uploadArea || !fileInput) return;
    
    // Click to browse
    uploadArea.addEventListener('click', () => {
        if (!isUploading) {
            fileInput.click();
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files);
    });
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFileSelection(e.dataTransfer.files);
    });
}

/**
 * Handle file selection
 */
function handleFileSelection(fileList) {
    if (isUploading) {
        showToast('Upload in progress, please wait...', 'warning');
        return;
    }
    
    const newFiles = Array.from(fileList);
    const validFiles = [];
    const errors = [];
    
    // Validate each file
    newFiles.forEach(file => {
        const validation = validateFile(file);
        if (validation.valid) {
            validFiles.push(file);
        } else {
            errors.push(`${file.name}: ${validation.error}`);
        }
    });
    
    // Show validation errors
    if (errors.length > 0) {
        showToast(`Some files were rejected:\n${errors.join('\n')}`, 'error');
    }
    
    if (validFiles.length > 0) {
        selectedFiles = validFiles;
        showUploadForm();
        renderFilePreview();
    }
}

/**
 * Validate a single file
 */
function validateFile(file) {
    // Check file type
    if (!SUPPORTED_TYPES[file.type]) {
        return {
            valid: false,
            error: 'File type not supported'
        };
    }
    
    // Check file size
    const config = SUPPORTED_TYPES[file.type];
    if (file.size > config.maxSize) {
        return {
            valid: false,
            error: `File size exceeds ${formatFileSize(config.maxSize)} limit`
        };
    }
    
    // Check if file name is reasonable
    if (file.name.length > 255) {
        return {
            valid: false,
            error: 'File name too long'
        };
    }
    
    return { valid: true };
}

/**
 * Show upload form
 */
function showUploadForm() {
    document.getElementById('upload-area').style.display = 'none';
    document.getElementById('upload-form').style.display = 'block';
}

/**
 * Hide upload form
 */
function hideUploadForm() {
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('upload-form').style.display = 'none';
    selectedFiles = [];
    document.getElementById('file-caption').value = '';
}

/**
 * Render file preview
 */
function renderFilePreview() {
    const preview = document.getElementById('file-preview');
    preview.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const config = SUPPORTED_TYPES[file.type];
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';
        
        fileItem.innerHTML = `
            <div class="file-icon ${config.category}">
                <i class="fas fa-${config.icon}"></i>
            </div>
            <div class="file-details">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <div class="file-type">${file.type.split('/')[1].toUpperCase()}</div>
            <button type="button" class="remove-file" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        preview.appendChild(fileItem);
    });
}

/**
 * Remove a file from selection
 */
function removeFile(index) {
    selectedFiles.splice(index, 1);
    
    if (selectedFiles.length === 0) {
        cancelUpload();
    } else {
        renderFilePreview();
    }
}

/**
 * Cancel upload and reset form
 */
function cancelUpload() {
    if (isUploading) {
        showToast('Cannot cancel upload in progress', 'warning');
        return;
    }
    
    hideUploadForm();
    
    // Reset file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.value = '';
    }
}

/**
 * Upload selected files
 */
async function uploadFile() {
    if (isUploading) {
        showToast('Upload already in progress', 'warning');
        return;
    }
    
    if (selectedFiles.length === 0) {
        showToast('No files selected', 'warning');
        return;
    }
    
    isUploading = true;
    showLoading();
    
    const caption = document.getElementById('file-caption').value.trim();
    let successCount = 0;
    let errorCount = 0;
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            
            try {
                const fileData = await processFile(file, caption);
                const savedFile = addFile(fileData);
                
                if (savedFile) {
                    successCount++;
                    console.log(`File uploaded successfully: ${file.name}`);
                } else {
                    errorCount++;
                    console.error(`Failed to save file: ${file.name}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`Error processing file ${file.name}:`, error);
            }
        }
        
        // Show results
        if (successCount > 0) {
            showToast(`${successCount} file(s) uploaded successfully!`, 'success');
            
            // Refresh gallery and stats
            renderGallery();
            updateStats();
            
            // Reset form
            cancelUpload();
            
            // Switch to gallery tab
            switchTab('gallery');
        }
        
        if (errorCount > 0) {
            showToast(`${errorCount} file(s) failed to upload`, 'error');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
    } finally {
        isUploading = false;
        hideLoading();
    }
}

/**
 * Process a file for storage
 */
function processFile(file, caption) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: e.target.result,
                    caption: caption
                };
                
                // For text files, also store the text content
                if (file.type === 'text/plain') {
                    const textReader = new FileReader();
                    textReader.onload = function(textEvent) {
                        fileData.textContent = textEvent.target.result;
                        resolve(fileData);
                    };
                    textReader.onerror = function() {
                        reject(new Error('Failed to read text content'));
                    };
                    textReader.readAsText(file);
                } else {
                    resolve(fileData);
                }
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Get file icon based on type
 */
function getFileIcon(type) {
    const config = SUPPORTED_TYPES[type];
    return config ? config.icon : 'file';
}

/**
 * Get file category based on type
 */
function getFileCategory(type) {
    const config = SUPPORTED_TYPES[type];
    return config ? config.category : 'unknown';
}

/**
 * Check if file type is supported
 */
function isFileTypeSupported(type) {
    return !!SUPPORTED_TYPES[type];
}

/**
 * Get maximum file size for type
 */
function getMaxFileSize(type) {
    const config = SUPPORTED_TYPES[type];
    return config ? config.maxSize : 0;
}

// Make functions globally available
window.removeFile = removeFile;
window.cancelUpload = cancelUpload;
window.uploadFile = uploadFile;
window.getFileIcon = getFileIcon;
window.getFileCategory = getFileCategory;
window.isFileTypeSupported = isFileTypeSupported;
window.getMaxFileSize = getMaxFileSize;
