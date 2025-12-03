// --- State ---
const state = {
    mode: 'image',
    canvas: document.getElementById('mainCanvas'),
    ctx: document.getElementById('mainCanvas').getContext('2d', { willReadFrequently: true }),
    video: document.getElementById('sourceVideo'),
    stream: null,
    facingMode: 'user', // 'user' or 'environment'
    animationId: null,
    staticImageData: null,
    params: {
        brightness: 0, contrast: 0, saturation: 0,
        warmth: 0, tint: 0,
        highlights: 0, shadows: 0, fade: 0, vibrance: 0,
        gamma: 1.0, posterize: 0,
        shadowR: 0, shadowG: 0, shadowB: 0,
        highlightR: 0, highlightG: 0, highlightB: 0,
        mono: false
    }
};

// --- Notification Logic ---
function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast-enter pointer-events-auto bg-[#1a1a1a] border ${type === 'error' ? 'border-red-500/50 text-red-500' : 'border-[#D71921]/50 text-white'} p-4 rounded-xl shadow-2xl font-mono text-xs flex items-center justify-between backdrop-blur-md`;
    
    const icon = type === 'error' ? '!' : '✓';
    
    el.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full ${type === 'error' ? 'bg-red-900/50' : 'bg-green-900/50'} flex items-center justify-center text-[10px]">${icon}</div>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="ml-4 opacity-50 hover:opacity-100">✕</button>
    `;
    
    container.appendChild(el);
    setTimeout(() => {
        el.style.transition = 'opacity 0.3s ease';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

// --- AI Logic ---
function toggleAIModal() {
    const el = document.getElementById('aiModal');
    el.classList.toggle('hidden');
}

async function runAIGeneration() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    const prompt = document.getElementById('aiPrompt').value.trim();
    
    if (!apiKey) {
        showToast("Please enter a valid Gemini API Key", 'error');
        document.getElementById('apiKeyInput').focus();
        return;
    }

    if (!prompt) {
        showToast("Please enter a filter description", 'error');
        document.getElementById('aiPrompt').focus();
        return;
    }

    toggleAIModal();
    document.getElementById('aiLoader').classList.remove('hidden');

    const systemPrompt = `You are a color grading expert. You output ONLY valid JSON.
    Map the user's description to these parameters (ranges shown):
    brightness (-50 to 50), contrast (-50 to 50), saturation (-50 to 50),
    warmth (-50 to 50), tint (-50 to 50),
    highlights (-50 to 50), shadows (-50 to 50), fade (0 to 50), vibrance (-50 to 50),
    gamma (0.5 to 1.5), posterize (0 to 0), 
    shadowR (-30 to 30), shadowG (-30 to 30), shadowB (-30 to 30),
    highlightR (-30 to 30), highlightG (-30 to 30), highlightB (-30 to 30),
    mono (boolean).
    
    Example response: {"brightness": 10, "contrast": 20, "saturation": -10, "warmth": 30, "shadowB": 15, "highlightR": 10}
    Return ONLY the JSON object. Do not explain.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
             throw new Error("AI blocked the request (Safety/Content filter).");
        }

        const text = data.candidates[0].content.parts[0].text;
        
        // Robust JSON Parsing
        // Find first '{' and last '}'
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error("AI did not return valid JSON");
        }

        const jsonStr = text.substring(firstBrace, lastBrace + 1);
        const newParams = JSON.parse(jsonStr);

        // Apply params
        Object.keys(newParams).forEach(key => {
            if (state.params.hasOwnProperty(key)) {
                state.params[key] = newParams[key];
            }
        });
        
        resetUIControls();
        updateFilter();
        showToast("Filter generated successfully", 'success');

    } catch (error) {
        console.error("AI Error:", error);
        showToast(error.message || "Generation failed", 'error');
        // Don't re-open modal immediately to avoid annoyance, user can click "Ask AI" again
    } finally {
        document.getElementById('aiLoader').classList.add('hidden');
    }
}

// --- Camera Logic ---
async function toggleLiveCamera() {
    if (state.mode === 'camera') {
        stopCamera();
    } else {
        await startCamera(state.facingMode);
    }
}

function flipCamera() {
    state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
    stopCamera();
    startCamera(state.facingMode);
}

async function startCamera(facingMode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Camera not supported (requires HTTPS)", 'error');
        return;
    }

    try {
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        state.video.srcObject = state.stream;
        
        state.video.onloadedmetadata = () => {
            state.mode = 'camera';
            state.canvas.classList.remove('hidden');
            document.getElementById('emptyState').classList.add('hidden');
            document.getElementById('liveOverlay').classList.remove('hidden');
            
            state.canvas.width = state.video.videoWidth;
            state.canvas.height = state.video.videoHeight;
            
            liveLoop();
        };
    } catch (err) {
        console.error(err);
        if (err.name === 'NotAllowedError') {
            showToast("Camera permission denied", 'error');
        } else if (err.name === 'NotFoundError') {
            showToast("No camera device found", 'error');
        } else {
            showToast("Failed to start camera", 'error');
        }
    }
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(t => t.stop());
        state.stream = null;
    }
    state.mode = 'image';
    cancelAnimationFrame(state.animationId);
    document.getElementById('liveOverlay').classList.add('hidden');
    
    if (state.staticImageData) {
        state.canvas.width = state.staticImageData.width;
        state.canvas.height = state.staticImageData.height;
        updateFilter();
    } else {
        state.canvas.classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
    }
}

function captureFromLive() {
    try {
        state.staticImageData = state.ctx.getImageData(0,0, state.canvas.width, state.canvas.height);
        stopCamera();
        // Re-capture raw frame
        state.ctx.drawImage(state.video, 0, 0);
        state.staticImageData = state.ctx.getImageData(0,0, state.canvas.width, state.canvas.height);
        updateFilter();
        showToast("Image captured", 'success');
    } catch(e) {
        showToast("Capture failed", 'error');
    }
}

function liveLoop() {
    if (state.mode !== 'camera') return;
    state.ctx.drawImage(state.video, 0, 0, state.canvas.width, state.canvas.height);
    const imgData = state.ctx.getImageData(0, 0, state.canvas.width, state.canvas.height);
    applyEffectsToData(imgData.data, state.params);
    state.ctx.putImageData(imgData, 0, 0);
    state.animationId = requestAnimationFrame(liveLoop);
}

// --- Core Math ---
function applyEffectsToData(data, p) {
    const len = data.length;
    const contrastF = (p.contrast + 100) / 100;
    const contrastSq = contrastF * contrastF;
    const brightness = p.brightness / 255;
    const satMult = (p.saturation + 100) / 100;
    const warmth = p.warmth / 200;
    const tint = p.tint / 200;
    const fade = p.fade / 255;
    const shadows = p.shadows / 100;
    const highlights = p.highlights / 100;
    const gammaInv = 1 / p.gamma;
    
    // Split Toning Colors
    const sR = p.shadowR/200, sG = p.shadowG/200, sB = p.shadowB/200;
    const hR = p.highlightR/200, hG = p.highlightG/200, hB = p.highlightB/200;

    for (let i = 0; i < len; i += 4) {
        let r = data[i] / 255;
        let g = data[i+1] / 255;
        let b = data[i+2] / 255;

        // 1. Brightness
        r += brightness; g += brightness; b += brightness;

        // 2. Contrast
        r = (r - 0.5) * contrastSq + 0.5;
        g = (g - 0.5) * contrastSq + 0.5;
        b = (b - 0.5) * contrastSq + 0.5;

        // 3. Gamma
        if (p.gamma !== 1.0 && r > 0 && g > 0 && b > 0) {
            r = Math.pow(r, gammaInv); g = Math.pow(g, gammaInv); b = Math.pow(b, gammaInv);
        }

        // 4. Fade
        if (fade > 0) {
            r = r + (1 - r) * (fade * 0.4);
            g = g + (1 - g) * (fade * 0.4);
            b = b + (1 - b) * (fade * 0.4);
        }

        // 5. Shadows/Highlights Adjustment
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        if (shadows !== 0) {
            const sMask = Math.pow(Math.max(0, 1 - luma), 3);
            r += shadows * 0.3 * sMask; g += shadows * 0.3 * sMask; b += shadows * 0.3 * sMask;
        }
        if (highlights !== 0) {
            const hMask = Math.pow(Math.max(0, luma), 3);
            r += highlights * 0.3 * hMask; g += highlights * 0.3 * hMask; b += highlights * 0.3 * hMask;
        }
        
        // 6. Split Toning
        if (sR||sG||sB||hR||hG||hB) {
            // Shadows apply more to low luma, Highlights to high luma
            const sStr = Math.pow(1 - luma, 2); 
            const hStr = Math.pow(luma, 2);
            
            r += (sR * sStr) + (hR * hStr);
            g += (sG * sStr) + (hG * hStr);
            b += (sB * sStr) + (hB * hStr);
        }

        // 7. Posterize
        if (p.posterize > 0) {
            const steps = 2 + (1 - p.posterize/100) * 20; 
            r = Math.floor(r * steps) / steps;
            g = Math.floor(g * steps) / steps;
            b = Math.floor(b * steps) / steps;
        }

        // Clamp
        r = Math.max(0, Math.min(1, r));
        g = Math.max(0, Math.min(1, g));
        b = Math.max(0, Math.min(1, b));

        // 8. Warmth/Tint
        r += warmth; b -= warmth; g += tint;

        // 9. Saturation / Vibrance / Mono
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (p.saturation !== 0) {
            r = lum + (r - lum) * satMult;
            g = lum + (g - lum) * satMult;
            b = lum + (b - lum) * satMult;
        }

        if (p.vibrance !== 0) {
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = max - min;
            if (p.vibrance > 0) {
                const vib = (1 - sat) * 2 * (p.vibrance/100);
                r += (r - lum) * vib; g += (g - lum) * vib; b += (b - lum) * vib;
            } else {
                const desat = 1 + p.vibrance/100;
                r = lum + (r - lum) * desat; g = lum + (g - lum) * desat; b = lum + (b - lum) * desat;
            }
        }

        if (p.mono) {
             const max = Math.max(r, g, b);
             const min = Math.min(r, g, b);
             const d = max - min;
             let hVal = 0;
             if (d > 0) {
                if (max === r) hVal = (g - b) / d + (g < b ? 6 : 0);
                else if (max === g) hVal = (b - r) / d + 2;
                else hVal = (r - g) / d + 4;
                hVal /= 6;
             }
             const isRed = (hVal > 0.96 || hVal < 0.04) && d > 0.15 && max > 0.2;
             if (!isRed) {
                 const monoLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                 const cMono = (monoLum - 0.5) * 1.3 + 0.5;
                 r = g = b = cMono;
             } else {
                 r = r * 1.1; g = g * 0.1; b = b * 0.1;
             }
        }

        data[i] = r * 255;
        data[i+1] = g * 255;
        data[i+2] = b * 255;
    }
}

// --- Helpers ---
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File Validation
    if (!file.type.match('image.*')) {
        showToast("Please select a valid image file", 'error');
        return;
    }
    if (file.size > 20 * 1024 * 1024) { // 20MB limit
         showToast("Image is too large (Max 20MB)", 'error');
         return;
    }

    stopCamera();
    const reader = new FileReader();
    
    reader.onerror = () => {
        showToast("Error reading file", 'error');
    };

    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const maxDim = 1500;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim/w, maxDim/h);
                w *= ratio; h *= ratio;
            }
            state.canvas.width = w; state.canvas.height = h;
            state.ctx.drawImage(img, 0, 0, w, h);
            state.staticImageData = state.ctx.getImageData(0, 0, w, h);
            document.getElementById('emptyState').classList.add('hidden');
            state.canvas.classList.remove('hidden');
            updateFilter();
            showToast("Image loaded", 'success');
        };
        img.onerror = () => {
             showToast("Failed to parse image data", 'error');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

function updateFilter(changedParam) {
    if (changedParam) {
        const el = document.getElementById(changedParam);
        const val = el.type === 'checkbox' ? el.checked : parseFloat(el.value);
        state.params[changedParam] = val;
        const label = document.getElementById(`val-${changedParam}`);
        if (label) label.innerText = val;
    }

    if (state.mode === 'image' && state.staticImageData) {
        if (window.frameRequest) cancelAnimationFrame(window.frameRequest);
        window.frameRequest = requestAnimationFrame(() => {
            const imgData = new ImageData(
                new Uint8ClampedArray(state.staticImageData.data),
                state.staticImageData.width, state.staticImageData.height
            );
            applyEffectsToData(imgData.data, state.params);
            state.ctx.putImageData(imgData, 0, 0);
        });
    }
}

function resetUIControls() {
     Object.keys(state.params).forEach(k => {
        const el = document.getElementById(k === 'mono' ? 'monoMode' : k);
        if(el) {
            if(el.type === 'checkbox') el.checked = state.params[k];
            else el.value = state.params[k];
        }
        const label = document.getElementById(`val-${k}`);
        if(label) label.innerText = state.params[k];
     });
}

function resetFilters() {
     Object.keys(state.params).forEach(k => {
        state.params[k] = (k === 'gamma') ? 1.0 : (k === 'mono' ? false : 0);
     });
     resetUIControls();
     updateFilter();
     showToast("Filters reset", 'success');
}

function switchTab(t) {
    ['basic', 'color', 'advanced', 'export'].forEach(x => {
        document.getElementById(`tab-${x}`).className = "flex-1 py-2 rounded-full font-ndot text-xs uppercase tracking-wider text-gray-400 hover:text-white transition-all";
        document.getElementById(`panel-${x}`).classList.add('hidden');
    });
    document.getElementById(`tab-${t}`).className = "flex-1 py-2 rounded-full font-ndot text-xs uppercase tracking-wider text-black bg-white shadow-lg transition-all";
    document.getElementById(`panel-${t}`).classList.remove('hidden');
}

function downloadImage() {
    if (document.getElementById('emptyState').classList.contains('hidden') === false && state.mode !== 'camera') {
        showToast("No image to save", 'error');
        return;
    }
    try {
        const a = document.createElement('a');
        a.download = `NothingLut_${Date.now()}.png`;
        a.href = state.canvas.toDataURL('image/png');
        a.click();
        showToast("Image saved", 'success');
    } catch (e) {
        showToast("Failed to save image", 'error');
    }
}

function downloadLUT() {
    try {
        const size = 33;
        const title = (document.getElementById('lutName').value || "NothingLut").replace(/\s+/g, '_');
        let content = `TITLE "${title}"\nLUT_3D_SIZE ${size}\nDOMAIN_MIN 0.0 0.0 0.0\nDOMAIN_MAX 1.0 1.0 1.0\n`;
        
        const totalPixels = size * size * size;
        const data = new Float32Array(totalPixels * 4);
        let idx = 0;
        for (let b = 0; b < size; b++) {
            for (let g = 0; g < size; g++) {
                for (let r = 0; r < size; r++) {
                    data[idx] = (r / (size - 1)) * 255;
                    data[idx+1] = (g / (size - 1)) * 255;
                    data[idx+2] = (b / (size - 1)) * 255;
                    data[idx+3] = 255;
                    idx += 4;
                }
            }
        }
        applyEffectsToData(data, state.params);
        idx = 0;
        for (let i = 0; i < totalPixels; i++) {
            content += `${(data[idx]/255).toFixed(6)} ${(data[idx+1]/255).toFixed(6)} ${(data[idx+2]/255).toFixed(6)}\n`;
            idx += 4;
        }
        const blob = new Blob([content], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.cube`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("LUT generated successfully", 'success');
    } catch (e) {
        console.error(e);
        showToast("Failed to generate LUT", 'error');
    }
}