# FileShare - Static File Sharing Website

## Overview

FileShare is a modern, client-side file sharing application that allows users to upload files, view files uploaded by others, and engage with content through likes, dislikes, and views. The application is built as a purely static frontend application with no backend dependencies, storing all data in the browser's localStorage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Pure Vanilla JavaScript**: No frameworks or build tools required
- **Static HTML/CSS/JS**: Purely client-side application that can be served from any web server
- **Component-based Structure**: Modular JavaScript files for different functionalities (upload, gallery, storage, utils)
- **Responsive Design**: Mobile-first CSS with modern layout techniques (Grid, Flexbox)

### Data Storage Solution
- **localStorage**: All application data persists in the browser's localStorage
- **No Backend Required**: Eliminates server costs and complexity
- **Client-side Only**: Files are stored as base64-encoded data URLs in localStorage

### File Management
- **Supported File Types**: Images (PNG, JPG), Documents (PDF, DOC, XLS, PPT), and Text files
- **File Validation**: Client-side validation for file types and sizes
- **File Preview**: Modal-based file viewing with metadata display

## Key Components

### 1. Upload System (`scripts/upload.js`)
- Drag-and-drop interface for file uploads
- File type and size validation
- Preview functionality before upload
- Progress indicators and error handling
- Base64 encoding for file storage

### 2. Gallery System (`scripts/gallery.js`)
- Grid-based file display
- Search and filtering capabilities
- Sorting options (newest, oldest, most liked, most viewed)
- File interaction (view, like, dislike)

### 3. Storage Management (`scripts/storage.js`)
- localStorage CRUD operations
- Data validation and cleanup
- Error handling for storage quota limits
- User reaction tracking

### 4. Main Application (`scripts/main.js`)
- Application initialization
- Tab navigation system
- Global event handling
- Statistics tracking

### 5. Utilities (`scripts/utils.js`)
- HTML escaping for XSS protection
- File size formatting
- Date formatting
- Toast notifications
- Modal management

## Data Flow

1. **File Upload**:
   - User selects files via drag-drop or file input
   - Files are validated for type and size
   - Files are converted to base64 data URLs
   - File metadata is created and stored in localStorage
   - Gallery is updated with new files

2. **File Viewing**:
   - Files are loaded from localStorage on app initialization
   - Gallery displays files with search/filter capabilities
   - File interactions (views, likes) are tracked and persisted

3. **Data Persistence**:
   - All data stored in browser's localStorage
   - Files stored as base64-encoded data URLs
   - User reactions and metadata stored separately
   - Automatic data validation and cleanup on load

## External Dependencies

### CDN Resources
- **Font Awesome 6.0.0**: Icon library for UI elements
- **Google Fonts (Inter)**: Typography system
- **No JavaScript Libraries**: Pure vanilla JavaScript implementation

### Browser APIs
- **localStorage**: Primary data storage mechanism
- **FileReader API**: For reading and encoding uploaded files
- **Drag and Drop API**: For file upload interface

## Deployment Strategy

### Static Hosting
- **No Build Process**: Direct deployment of HTML/CSS/JS files
- **Any Web Server**: Can be hosted on any static file server
- **CDN Compatible**: All assets can be served from CDN
- **No Server Configuration**: Pure client-side application

### Browser Requirements
- **Modern Browser Support**: Requires ES6+ features
- **localStorage Support**: Essential for data persistence
- **FileReader API**: Required for file uploads

### Scalability Considerations
- **localStorage Limits**: Typically 5-10MB per domain
- **Performance**: Limited by browser's localStorage access speed
- **Data Portability**: No built-in sync between devices/browsers

## Key Architectural Decisions

### 1. Client-Side Only Architecture
- **Problem**: Need for simple file sharing without server complexity
- **Solution**: Pure frontend application using localStorage
- **Rationale**: Eliminates hosting costs, server maintenance, and deployment complexity
- **Trade-offs**: Limited storage space, no cross-device sync, no real-time collaboration

### 2. Base64 File Encoding
- **Problem**: Need to store binary files in localStorage (text-only)
- **Solution**: Convert files to base64 data URLs
- **Rationale**: Enables file storage in localStorage while maintaining file integrity
- **Trade-offs**: ~33% storage overhead, potential performance impact for large files

### 3. Vanilla JavaScript Implementation
- **Problem**: Need for maintainable, lightweight application
- **Solution**: Pure JavaScript without frameworks
- **Rationale**: Reduces complexity, eliminates build tools, improves load times
- **Trade-offs**: More manual DOM manipulation, less abstraction

### 4. Component-Based File Structure
- **Problem**: Code organization for multiple features
- **Solution**: Separate JavaScript files for different concerns
- **Rationale**: Improves maintainability and code reusability
- **Implementation**: gallery.js, upload.js, storage.js, utils.js, main.js