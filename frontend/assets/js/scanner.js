// Session State Trackers
const sessionCache = new Set();
let hasSeenHibernationModal = false;

// LOCG Database Dictionary
function getComicDataFromFilename(filename) {
    if(filename.includes('batman')) return { 
        title: "Absolute Batman Annual #1", 
        url: "https://leagueofcomicgeeks.com/comic/6092062/absolute-batman-2025-annual-1" 
    };
    if(filename.includes('betaraybill')) return { 
        title: "Beta Ray Bill: Argent Star (Trade Paperback - 2025 Edition)", 
        url: "https://leagueofcomicgeeks.com/comic/8509698/beta-ray-bill-argent-star-tp?variant=8271107" 
    };
    if(filename.includes('martianmanhunter')) return { 
        title: "Absolute Martian Manhunter #8 (Cover A)", 
        url: "https://leagueofcomicgeeks.com/comic/1616741/absolute-martian-manhunter-8" 
    };
    if(filename.includes('nightwing')) return { 
        title: "Nightwing: A Knight in Blüdhaven (Compendium 3)", 
        url: "https://leagueofcomicgeeks.com/comic/3717786/nightwing-a-knight-in-bluedhaven-compendium-book-3-tp" 
    };
    if(filename.includes('tf4')) return { 
        title: "Transformers #4 (Cover E: Milana Variant)", 
        url: "https://leagueofcomicgeeks.com/comic/4294159/transformers-4?variant=9647505" 
    };
    return { title: "Comic Identified", url: "https://leagueofcomicgeeks.com" };
}

function previewAndUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 1. UI Reset
    const previewImg = document.getElementById('preview-img');
    const placeholder = document.getElementById('preview-placeholder');
    const resultsDiv = document.getElementById('scan-results');
    const terminal = document.getElementById('system-terminal');
    const metrics = document.getElementById('hardware-metrics');
    const locgLink = document.getElementById('comic-locg-link');
    
    previewImg.src = URL.createObjectURL(file);
    previewImg.style.display = 'inline-block';
    placeholder.style.display = 'none';
    resultsDiv.innerHTML = '';
    
    // Hide LOCG link initially
    locgLink.style.display = 'none';
    locgLink.href = '#';
    
    // Reset Terminal UI (Remove red error spotlights)
    terminal.style.display = 'block';
    terminal.innerHTML = '';
    terminal.style.border = '1px solid #222';
    terminal.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.8)';
    metrics.style.display = 'block';

    // 2. Terminal Boot Sequence
    logToTerminal(`[SYSTEM] Received payload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    logToTerminal(`[C++ GATEKEEPER] Initializing geometric spatial filter...`);

    const filename = file.name.toLowerCase();
    
    // 3. Stateful Routing Logic
    if (filename.includes('success')) {
        if (sessionCache.has(filename)) {
            simulateCacheHit(filename);
        } else {
            simulateInitialInference(filename);
        }
    } else {
        simulateCacheMiss(filename);
    }
}

function logToTerminal(message) {
    const terminal = document.getElementById('system-terminal');
    const time = new Date().toISOString().substring(11, 23);
    terminal.innerHTML += `<div style="margin-bottom: 4px;">[${time}] ${message}</div>`;
    terminal.scrollTop = terminal.scrollHeight;
}

// Route 1: Instant Cache Hit (Already seen this session)
function simulateCacheHit(filename) {
    setTimeout(() => {
        logToTerminal(`[C++ GATEKEEPER] Generated pHash: ${Math.random().toString(16).substr(2, 16)}`);
        logToTerminal(`[SPRING GATEWAY] Querying PostGIS Spatial Index...`);
        logToTerminal(`[SPRING GATEWAY] MATCH FOUND. Distance: 0.`);
        
        document.getElementById('metric-latency').style.width = '5%';
        document.getElementById('metric-latency').style.background = '#a3e635';
        document.getElementById('metric-latency-text').innerText = '45ms (C++ Native)';
        
        document.getElementById('metric-vram').style.width = '2%';
        document.getElementById('metric-vram').style.background = '#0ea5e9';
        document.getElementById('metric-vram-text').innerText = '14 MB / 4096 MB';

        const comicData = getComicDataFromFilename(filename);
        const resultsDiv = document.getElementById('scan-results');
        resultsDiv.innerHTML = `
            <span style="color: #a3e635;">⚡ CACHE HIT: Compute Bypassed</span><br>
            <span style="color: #fff; font-size: 1.2em;">${comicData.title}</span>
        `;
        
        // Reveal LOCG Link
        const locgLink = document.getElementById('comic-locg-link');
        locgLink.href = comicData.url;
        locgLink.style.display = 'block';
    }, 800);
}

// Route 2: First Time Success (Simulate ML, then cache)
function simulateInitialInference(filename) {
    setTimeout(() => {
        logToTerminal(`[C++ GATEKEEPER] Generated pHash: ${Math.random().toString(16).substr(2, 16)}`);
        logToTerminal(`[SPRING GATEWAY] Querying PostGIS Spatial Index...`);
        logToTerminal(`<span style="color: #facc15;">[SPRING GATEWAY] CACHE MISS. Geometry not found.</span>`);
        logToTerminal(`[SPRING GATEWAY] Forwarding payload to Python FastAPI...`);
        
        document.getElementById('metric-latency').style.width = '85%';
        document.getElementById('metric-latency').style.background = '#facc15';
        document.getElementById('metric-latency-text').innerText = '1,850ms (PyTorch Cold Start)';
        
        document.getElementById('metric-vram').style.width = '45%';
        document.getElementById('metric-vram').style.background = '#facc15';
        document.getElementById('metric-vram-text').innerText = '845 MB / 4096 MB';
    }, 800);

    setTimeout(() => {
        logToTerminal(`[FASTAPI] Initializing PyTorch INT8 MobileNetV3...`);
        logToTerminal(`[FASTAPI] Inference complete. Confidence: 96.4%`);
        logToTerminal(`<span style="color: #0ea5e9;">[SYSTEM] Adding geometry to local cache...</span>`);
        
        sessionCache.add(filename);

        const comicData = getComicDataFromFilename(filename);
        const resultsDiv = document.getElementById('scan-results');
        resultsDiv.innerHTML = `
            <span style="color: #facc15;">🧠 EDGE INFERENCE: Successful</span><br>
            <span style="color: #fff; font-size: 1.2em;">${comicData.title}</span><br>
            <span style="color: #888; font-size: 0.8em; font-weight: normal;">(Image geometry added to local cache)</span>
        `;
        
        // Reveal LOCG Link
        const locgLink = document.getElementById('comic-locg-link');
        locgLink.href = comicData.url;
        locgLink.style.display = 'block';
    }, 2800);
}

// Route 3: True Cache Miss (Edge Case Failures)
function simulateCacheMiss(filename) {
    setTimeout(() => {
        logToTerminal(`[C++ GATEKEEPER] Generated pHash: ${Math.random().toString(16).substr(2, 16)}`);
        logToTerminal(`[SPRING GATEWAY] Querying PostGIS Spatial Index...`);
        logToTerminal(`<span style="color: #dc3545;">[SPRING GATEWAY] CACHE MISS. No exact geometry found.</span>`);
        logToTerminal(`[SPRING GATEWAY] Forwarding tensor payload to Python FastAPI...`);
        
        document.getElementById('metric-latency').style.width = '85%';
        document.getElementById('metric-latency').style.background = '#dc3545';
        document.getElementById('metric-latency-text').innerText = 'Timeout (Hibernation)';
        
        document.getElementById('metric-vram').style.width = '0%';
        document.getElementById('metric-vram-text').innerText = '0 MB / 4096 MB';
    }, 800);

    setTimeout(() => {
        // Spotlight the terminal in red
        const terminal = document.getElementById('system-terminal');
        terminal.style.border = '1px solid #dc3545';
        terminal.style.boxShadow = 'inset 0 0 15px rgba(220, 53, 69, 0.4)';
        
        // Determine exact failure reason based on filename
        let failureReason = "Unrecognized geometric distortion.";
        if(filename.includes('hdscan')) failureReason = "HD Digital Scans lack physical depth/lighting cues required by edge model.";
        if(filename.includes('angled')) failureReason = "Perspective skew exceeds acceptable spatial threshold (>15 degrees).";
        if(filename.includes('noisy')) failureReason = "High background clutter intersecting with primary bounding box.";

        logToTerminal(`<span style="color: #dc3545; font-weight: bold;">[VISION PIPELINE] PAYLOAD REJECTED: ${failureReason}</span>`);
        logToTerminal(`[FASTAPI] CONNECTION REFUSED: Engine Hibernating.`);
        
        const resultsDiv = document.getElementById('scan-results');
        resultsDiv.innerHTML = `<span style="color: #dc3545;">⚠️ EDGE PIPELINE REJECTED</span>`;

        if (!hasSeenHibernationModal) {
            showHibernationModal();
            hasSeenHibernationModal = true;
        } else {
            logToTerminal(`<span style="color: #888;">[INFO] Skipping warning modal. ML Engine remains asleep.</span>`);
        }
    }, 2200);
}

function showHibernationModal() {
    let modal = document.getElementById('hibernation-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'hibernation-modal';
        modal.style.cssText = 'position: fixed; z-index: 20000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        modal.innerHTML = `
            <div style="background-color: #111; max-width: 500px; width: 100%; border: 1px solid #dc3545; border-radius: 12px; padding: 30px; text-align: left; position: relative;">
                <span style="position: absolute; top: 10px; right: 15px; color: #888; font-size: 28px; font-weight: bold; cursor: pointer;" onclick="document.getElementById('hibernation-modal').style.display='none'">&times;</span>
                <h2 style="color: #dc3545; margin-top: 0;">⚠️ ML Engine Hibernating</h2>
                <p style="color: #eee; font-size: 1.05em; line-height: 1.6;">
                    To strictly enforce the Green AI mandate and eliminate idle cloud compute costs, the heavy PyTorch inference cluster is currently spun down.
                </p>
                <p style="color: #aaa; font-size: 0.95em; line-height: 1.5; margin-top: 15px;">
                    <strong>Next Steps:</strong><br>
                    • Use a pre-verified image from the <b>Resource Kit</b> to observe the architecture in action.<br>
                    • Watch the <b>Pipeline Demonstration video</b> below to see the ML classification engine run.
                </p>
                <button onclick="document.getElementById('hibernation-modal').style.display='none'" class="btn" style="margin-top: 20px; width: 100%; text-align: center;">Acknowledge</button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }
}