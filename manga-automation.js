/**
 * MANGA-AUTOMATION.JS - Complete Automation Script
 * Handles: Generate manga.json, Sync chapters, Update views, Sync codes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================
// WIB TIMEZONE HELPER (GMT+7)
// ============================================

function getWIBTimestamp() {
    const date = new Date();
    const wibStr = date.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', 'T');
    return wibStr + '+07:00';
}

function convertToWIB(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    const wibStr = date.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', 'T');
    return wibStr + '+07:00';
}

// ============================================
// GENERATE MANGA.JSON
// ============================================

/**
 * Generate manga.json from manga-config.json and chapters
 */
async function generateMangaJson() {
    try {
        console.log('📚 Generating manga.json...');
        
        // Read manga-config.json
        if (!fs.existsSync('manga-config.json')) {
            throw new Error('manga-config.json not found!');
        }
        
        const mangaConfig = JSON.parse(fs.readFileSync('manga-config.json', 'utf8'));
        console.log('📖 Manga config loaded:', mangaConfig.title);
        
        // Get all chapter folders
        const chapterFolders = fs.readdirSync('.')
            .filter(item => {
                if (!fs.statSync(item).isDirectory()) return false;
                if (item.startsWith('.')) return false;
                if (['node_modules', 'assets', '.github'].includes(item)) return false;
                
                // Must have manifest.json
                return fs.existsSync(path.join(item, 'manifest.json'));
            })
            .sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                return numA - numB;
            });
        
        console.log(`📂 Found ${chapterFolders.length} chapters`);
        
        // Build chapters object
        const chapters = {};
        const now = getWIBTimestamp();
        
        for (const folder of chapterFolders) {
            const manifestPath = path.join(folder, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            const chapterNum = parseFloat(folder);
            const isLocked = mangaConfig.lockedChapters?.includes(folder) || false;
            
            // Get existing views from old manga.json if exists
            let existingViews = 0;
            if (fs.existsSync('manga.json')) {
                const oldData = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
                if (oldData.chapters && oldData.chapters[folder]) {
                    existingViews = oldData.chapters[folder].views || 0;
                }
            }
            
            // Get upload date from git or existing data
            let uploadDate = now;
            if (fs.existsSync('manga.json')) {
                const oldData = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
                if (oldData.chapters && oldData.chapters[folder]) {
                    uploadDate = oldData.chapters[folder].uploadDate || now;
                }
            }
            
            const chapterTitle = `Chapter ${folder}`;
            
            chapters[folder] = {
                title: chapterTitle,
                chapter: chapterNum,
                folder: folder,
                uploadDate: uploadDate,
                totalPages: manifest.pages.length,
                pages: manifest.pages.length,
                locked: isLocked,
                views: existingViews
            };
        }
        
        console.log(`✅ Processed ${Object.keys(chapters).length} chapters`);
        
        // ============================================
        // ✅ FIX: Handle endChapter based on status
        // LINE 103-118 (BAGIAN YANG DIUBAH)
        // ============================================
        let endChapterValue;
        
        if (mangaConfig.status === 'END') {
            // Jika status END, harus ada endChapter
            if (mangaConfig.endChapter) {
                endChapterValue = mangaConfig.endChapter;
                console.log(`🏁 Status: END - endChapter: ${endChapterValue}`);
            } else {
                console.warn('⚠️ Status is END but endChapter not set in manga-config.json!');
                endChapterValue = null;
            }
        } else {
            // Jika status ONGOING/HIATUS, set endChapter ke null
            endChapterValue = null;
            console.log(`📖 Status: ${mangaConfig.status} - endChapter: null`);
        }
        
        // Get existing views from old manga.json
        let existingMangaViews = 0;
        if (fs.existsSync('manga.json')) {
            const oldData = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
            if (oldData.manga && oldData.manga.views) {
                existingMangaViews = oldData.manga.views;
            }
        }
        
        // Build full manga.json structure
        const mangaJson = {
            manga: {
                title: mangaConfig.title,
                alternativeTitle: mangaConfig.alternativeTitle || '',
                cover: mangaConfig.cover,
                description: mangaConfig.description,
                author: mangaConfig.author,
                artist: mangaConfig.artist,
                genre: mangaConfig.genre || [],
                status: mangaConfig.status || 'ONGOING',
                views: existingMangaViews,
                links: mangaConfig.links || {},
                repoUrl: `https://raw.githubusercontent.com/${mangaConfig.repoOwner}/${mangaConfig.repoName}/main/`,
                imagePrefix: mangaConfig.imagePrefix || 'Image',
                imageFormat: mangaConfig.imageFormat || 'webp',
                lockedChapters: mangaConfig.lockedChapters || [],
                type: mangaConfig.type || 'manga'
            },
            chapters: chapters,
            lastUpdated: now,
            lastChapterUpdate: now
        };
        
        // ============================================
        // ✅ Add endChapter only if status is END
        // LINE 163-166 (BAGIAN YANG DITAMBAHKAN)
        // ============================================
        if (mangaConfig.status === 'END' && endChapterValue !== null) {
            mangaJson.manga.endChapter = endChapterValue;
        }
        
        // Write manga.json
        fs.writeFileSync('manga.json', JSON.stringify(mangaJson, null, 2));
        
        console.log('✅ manga.json generated successfully!');
        console.log(`   - Total chapters: ${Object.keys(chapters).length}`);
        console.log(`   - Status: ${mangaJson.manga.status}`);
        if (mangaJson.manga.endChapter) {
            console.log(`   - End Chapter: ${mangaJson.manga.endChapter}`);
        }
        console.log(`   - Type: ${mangaJson.manga.type}`);
        console.log(`   - Last updated: ${now}`);
        
    } catch (error) {
        console.error('❌ Error generating manga.json:', error);
        throw error;
    }
}

// ============================================
// SYNC CHAPTERS
// ============================================

async function syncChapters() {
    try {
        console.log('🔄 Syncing chapters...');
        
        if (!fs.existsSync('manga.json')) {
            console.log('⚠️ manga.json not found, generating first...');
            await generateMangaJson();
            return;
        }
        
        const mangaData = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
        const mangaConfig = JSON.parse(fs.readFileSync('manga-config.json', 'utf8'));
        
        // Get all chapter folders
        const chapterFolders = fs.readdirSync('.')
            .filter(item => {
                if (!fs.statSync(item).isDirectory()) return false;
                if (item.startsWith('.')) return false;
                if (['node_modules', 'assets', '.github'].includes(item)) return false;
                return fs.existsSync(path.join(item, 'manifest.json'));
            });
        
        let hasChanges = false;
        const now = getWIBTimestamp();
        
        // Check for new chapters
        for (const folder of chapterFolders) {
            if (!mangaData.chapters[folder]) {
                console.log(`✨ New chapter detected: ${folder}`);
                
                const manifestPath = path.join(folder, 'manifest.json');
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                
                const chapterNum = parseFloat(folder);
                const isLocked = mangaConfig.lockedChapters?.includes(folder) || false;
                
                mangaData.chapters[folder] = {
                    title: `Chapter ${folder}`,
                    chapter: chapterNum,
                    folder: folder,
                    uploadDate: now,
                    totalPages: manifest.pages.length,
                    pages: manifest.pages.length,
                    locked: isLocked,
                    views: 0
                };
                
                hasChanges = true;
                mangaData.lastChapterUpdate = now;
            }
        }
        
        // Check for deleted chapters
        for (const folder in mangaData.chapters) {
            if (!chapterFolders.includes(folder)) {
                console.log(`🗑️ Chapter deleted: ${folder}`);
                delete mangaData.chapters[folder];
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            mangaData.lastUpdated = now;
            fs.writeFileSync('manga.json', JSON.stringify(mangaData, null, 2));
            console.log('✅ Chapters synced successfully!');
        } else {
            console.log('ℹ️ No changes detected');
        }
        
    } catch (error) {
        console.error('❌ Error syncing chapters:', error);
        throw error;
    }
}

// ============================================
// UPDATE VIEWS FROM PENDING-VIEWS.JSON
// ============================================

async function updateViews() {
    try {
        console.log('📊 Updating manga views...');
        
        if (!fs.existsSync('pending-views.json')) {
            console.log('ℹ️ No pending views to process');
            return;
        }
        
        if (!fs.existsSync('manga.json')) {
            console.log('⚠️ manga.json not found!');
            return;
        }
        
        const pendingViews = JSON.parse(fs.readFileSync('pending-views.json', 'utf8'));
        const mangaData = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
        
        if (!pendingViews.views || pendingViews.views === 0) {
            console.log('ℹ️ No pending views to add');
            return;
        }
        
        const currentViews = mangaData.manga.views || 0;
        const newViews = currentViews + pendingViews.views;
        
        mangaData.manga.views = newViews;
        mangaData.lastUpdated = getWIBTimestamp();
        
        fs.writeFileSync('manga.json', JSON.stringify(mangaData, null, 2));
        
        // Reset pending views
        fs.writeFileSync('pending-views.json', JSON.stringify({ views: 0 }, null, 2));
        
        console.log(`✅ Added ${pendingViews.views} views`);
        console.log(`   Total views: ${currentViews} → ${newViews}`);
        
    } catch (error) {
        console.error('❌ Error updating views:', error);
        throw error;
    }
}

// ============================================
// UPDATE CHAPTER VIEWS
// ============================================

async function updateChapterViews() {
    try {
        console.log('📖 Updating chapter views...');
        
        if (!fs.existsSync('pending-chapter-views.json')) {
            console.log('ℹ️ No pending chapter views to process');
            return;
        }
        
        if (!fs.existsSync('manga.json')) {
            console.log('⚠️ manga.json not found!');
            return;
        }
        
        const pendingChapterViews = JSON.parse(fs.readFileSync('pending-chapter-views.json', 'utf8'));
        const mangaData = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
        
        if (!pendingChapterViews.chapters || Object.keys(pendingChapterViews.chapters).length === 0) {
            console.log('ℹ️ No pending chapter views to add');
            return;
        }
        
        let totalAdded = 0;
        
        for (const [chapter, count] of Object.entries(pendingChapterViews.chapters)) {
            if (mangaData.chapters[chapter]) {
                const oldViews = mangaData.chapters[chapter].views || 0;
                const newViews = oldViews + count;
                mangaData.chapters[chapter].views = newViews;
                
                console.log(`   Chapter ${chapter}: ${oldViews} → ${newViews} (+${count})`);
                totalAdded += count;
            } else {
                console.warn(`   ⚠️ Chapter ${chapter} not found in manga.json`);
            }
        }
        
        if (totalAdded > 0) {
            mangaData.lastUpdated = getWIBTimestamp();
            fs.writeFileSync('manga.json', JSON.stringify(mangaData, null, 2));
            
            // Reset pending chapter views
            fs.writeFileSync('pending-chapter-views.json', JSON.stringify({ chapters: {} }, null, 2));
            
            console.log(`✅ Added ${totalAdded} chapter views total`);
        } else {
            console.log('ℹ️ No valid chapter views to add');
        }
        
    } catch (error) {
        console.error('❌ Error updating chapter views:', error);
        throw error;
    }
}

// ============================================
// SYNC CODES FROM CLOUDFLARE KV (WEBTOON ONLY)
// ============================================

async function syncCodesFromCloudflare() {
    try {
        console.log('🔄 Syncing codes from Cloudflare KV...');
        
        // Check manga type
        if (!fs.existsSync('manga-config.json')) {
            console.log('⚠️ manga-config.json not found!');
            return;
        }
        
        const mangaConfig = JSON.parse(fs.readFileSync('manga-config.json', 'utf8'));
        
        if (mangaConfig.type !== 'webtoon') {
            console.log(`ℹ️ Type is ${mangaConfig.type}, skipping code sync`);
            return;
        }
        
        // Check if chapter-codes-local.json is empty
        if (fs.existsSync('chapter-codes-local.json')) {
            const localCodes = JSON.parse(fs.readFileSync('chapter-codes-local.json', 'utf8'));
            if (Object.keys(localCodes).length > 0) {
                console.log('✅ chapter-codes-local.json already has data, skipping sync');
                return;
            }
        }
        
        const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
        if (!workerUrl) {
            console.log('⚠️ CLOUDFLARE_WORKER_URL not set, skipping code sync');
            return;
        }
        
        console.log(`📡 Fetching codes from: ${workerUrl}`);
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${workerUrl}?action=getAllCodes&repoName=${mangaConfig.repoName}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.codes) {
            fs.writeFileSync('chapter-codes-local.json', JSON.stringify(data.codes, null, 2));
            console.log(`✅ Synced ${Object.keys(data.codes).length} codes from Cloudflare KV`);
        } else {
            console.log('ℹ️ No codes found in Cloudflare KV');
        }
        
    } catch (error) {
        console.error('❌ Error syncing codes:', error);
        // Don't throw - this is optional functionality
    }
}

// ============================================
// MAIN CLI
// ============================================

const command = process.argv[2];

(async () => {
    try {
        switch (command) {
            case 'generate':
                await generateMangaJson();
                break;
            
            case 'sync':
                await syncChapters();
                break;
            
            case 'update-views':
                await updateViews();
                break;
            
            case 'update-chapters':
                await updateChapterViews();
                break;
            
            case 'sync-codes':
                await syncCodesFromCloudflare();
                break;
            
            default:
                console.log('Usage:');
                console.log('  node manga-automation.js generate        - Generate manga.json');
                console.log('  node manga-automation.js sync            - Sync chapters');
                console.log('  node manga-automation.js update-views    - Update manga views');
                console.log('  node manga-automation.js update-chapters - Update chapter views');
                console.log('  node manga-automation.js sync-codes      - Sync codes from Cloudflare KV');
                process.exit(1);
        }
        
        console.log('✅ Done!');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
})();
