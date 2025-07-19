const express = require('express');
const multer = require('multer');
const pg = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static('.'));

// Configure multer for file uploads
const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Initialize database tables
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS files (
                id SERIAL PRIMARY KEY,
                file_id VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(100) NOT NULL,
                size BIGINT NOT NULL,
                content TEXT NOT NULL,
                text_content TEXT,
                caption TEXT,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                views INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                dislikes INTEGER DEFAULT 0,
                uploader_id VARCHAR(255) NOT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_reactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                file_id VARCHAR(255) NOT NULL,
                reaction VARCHAR(10) CHECK (reaction IN ('like', 'dislike')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, file_id)
            )
        `);

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Generate unique IDs
function generateFileId() {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 12);
}

// API Routes

// Get all files
app.get('/api/files', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT file_id, name, type, size, content, text_content, caption, 
                   upload_date, views, likes, dislikes
            FROM files 
            ORDER BY upload_date DESC
        `);
        
        res.json({ success: true, files: result.rows });
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch files' });
    }
});

// Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { caption, fileData } = req.body;
        
        if (!fileData) {
            return res.status(400).json({ success: false, error: 'No file data provided' });
        }

        const file = JSON.parse(fileData);
        const fileId = generateFileId();
        const uploaderId = generateUserId();

        await pool.query(`
            INSERT INTO files (file_id, name, type, size, content, text_content, caption, uploader_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [fileId, file.name, file.type, file.size, file.content, file.textContent || null, caption || '', uploaderId]);

        res.json({ 
            success: true, 
            message: 'File uploaded successfully',
            fileId: fileId
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ success: false, error: 'Failed to upload file' });
    }
});

// Increment file views
app.post('/api/files/:fileId/view', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        await pool.query(`
            UPDATE files 
            SET views = views + 1 
            WHERE file_id = $1
        `, [fileId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error incrementing views:', error);
        res.status(500).json({ success: false, error: 'Failed to increment views' });
    }
});

// Handle like/dislike
app.post('/api/files/:fileId/reaction', async (req, res) => {
    try {
        const { fileId } = req.params;
        const { reaction, userId } = req.body;
        
        if (!['like', 'dislike'].includes(reaction)) {
            return res.status(400).json({ success: false, error: 'Invalid reaction' });
        }

        // Check existing reaction
        const existingReaction = await pool.query(`
            SELECT reaction FROM user_reactions 
            WHERE user_id = $1 AND file_id = $2
        `, [userId, fileId]);

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            if (existingReaction.rows.length > 0) {
                const currentReaction = existingReaction.rows[0].reaction;
                
                if (currentReaction === reaction) {
                    // Remove reaction
                    await client.query(`
                        DELETE FROM user_reactions 
                        WHERE user_id = $1 AND file_id = $2
                    `, [userId, fileId]);
                    
                    await client.query(`
                        UPDATE files 
                        SET ${reaction}s = ${reaction}s - 1 
                        WHERE file_id = $1
                    `, [fileId]);
                } else {
                    // Change reaction
                    await client.query(`
                        UPDATE user_reactions 
                        SET reaction = $1 
                        WHERE user_id = $2 AND file_id = $3
                    `, [reaction, userId, fileId]);
                    
                    // Update file counts
                    await client.query(`
                        UPDATE files 
                        SET ${currentReaction}s = ${currentReaction}s - 1,
                            ${reaction}s = ${reaction}s + 1
                        WHERE file_id = $1
                    `, [fileId]);
                }
            } else {
                // Add new reaction
                await client.query(`
                    INSERT INTO user_reactions (user_id, file_id, reaction)
                    VALUES ($1, $2, $3)
                `, [userId, fileId, reaction]);
                
                await client.query(`
                    UPDATE files 
                    SET ${reaction}s = ${reaction}s + 1 
                    WHERE file_id = $1
                `, [fileId]);
            }

            await client.query('COMMIT');
            res.json({ success: true });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error handling reaction:', error);
        res.status(500).json({ success: false, error: 'Failed to handle reaction' });
    }
});

// Get user reactions
app.get('/api/reactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(`
            SELECT file_id, reaction 
            FROM user_reactions 
            WHERE user_id = $1
        `, [userId]);
        
        const reactions = {};
        result.rows.forEach(row => {
            reactions[row.file_id] = row.reaction;
        });
        
        res.json({ success: true, reactions });
    } catch (error) {
        console.error('Error fetching reactions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch reactions' });
    }
});

// Get file statistics
app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_files,
                COALESCE(SUM(views), 0) as total_views,
                COALESCE(SUM(likes), 0) as total_likes
            FROM files
        `);
        
        res.json({ success: true, stats: result.rows[0] });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
async function startServer() {
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`FileShare server running on port ${PORT}`);
    });
}

startServer().catch(console.error);