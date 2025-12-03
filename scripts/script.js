// --- Constants ---
const LUT_SIZE = 32;
const DEFAULT_IMAGE_SRC = "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=1000&auto=format&fit=crop";

const DEFAULT_PARAMS = {
    exposure: 0.0, contrast: 1.0, saturation: 1.0,
    temperature: 0.0, tint: 0.0,
    liftR: 0.0, liftG: 0.0, liftB: 0.0,
    gammaR: 1.0, gammaG: 1.0, gammaB: 1.0,
    gainR: 1.0, gainG: 1.0, gainB: 1.0,
    shadowTintR: 0.0, shadowTintG: 0.0, shadowTintB: 0.0,
    highlightTintR: 0.0, highlightTintG: 0.0, highlightTintB: 0.0,
};

// --- State ---
let state = {
    apiKey: '',
    prompt: '',
    isProcessing: false,
    currentParams: { ...DEFAULT_PARAMS },
    previewImage: null, // Holds Data URL
    showKeyInput: true
};

// --- DOM Elements ---
const els = {};

// --- Math Helpers ---
const clamp = (val) => Math.max(0, Math.min(1, val));
const safePow = (val, power) => (val < 0 ? 0 : Math.pow(val, power));

// --- Color Engine ---
const applyColorGrade = (r, g, b, p) => {
    // 1. Exposure
    const exposureMult = Math.pow(2, p.exposure);
    r *= exposureMult; g *= exposureMult; b *= exposureMult;

    // 2. White Balance
    if (p.temperature > 0) { r += p.temperature * 0.2; b -= p.temperature * 0.2; }
    else { r -= Math.abs(p.temperature) * 0.2; b += Math.abs(p.temperature) * 0.2; }
    
    if (p.tint > 0) { g += p.tint * 0.2; } 
    else { g -= Math.abs(p.tint) * 0.2; }

    // 3. ASC-CDL
    r = safePow(r * p.gainR + p.liftR, p.gammaR);
    g = safePow(g * p.gainG + p.liftG, p.gammaG);
    b = safePow(b * p.gainB + p.liftB, p.gammaB);

    // 4. Contrast
    r = (r - 0.5) * p.contrast + 0.5;
    g = (g - 0.5) * p.contrast + 0.5;
    b = (b - 0.5) * p.contrast + 0.5;

    // 5. Saturation
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = luma + (r - luma) * p.saturation;
    g = luma + (g - luma) * p.saturation;
    b = luma + (b - luma) * p.saturation;

    // 6. Split Toning
    const shadowStr = (1 - clamp(luma));
    const highStr = clamp(luma);
    
    r += p.shadowTintR * shadowStr + p.highlightTintR * highStr;
    g += p.shadowTintG * shadowStr + p.highlightTintG * highStr;
    b += p.shadowTintB * shadowStr + p.highlightTintB * highStr;

    return [clamp(r), clamp(g), clamp(b)];
};

const getVisualPercent = (key, value) => {
    if (key === 'exposure') return ((value + 2) / 4) * 100;
    if (key === 'contrast' || key === 'saturation' || key.includes('gain')) return (value / 2) * 100;
    if (key.includes('temperature') || key.includes('tint')) return ((value + 1) / 2) * 100;
    if (key.includes('lift') || key.includes('Tint')) return ((value + 0.5) / 1) * 100;
    if (key.includes('gamma')) return ((value - 0.5) / 1) * 100;
    return 50;
};

// --- Render Logic ---

const updateKeyStatus = () => {
    const btn = els.toggleKeyBtn;
    if (state.apiKey) {
        btn.classList.remove('border-red-800', 'text-red-500', 'bg-red-900/10', 'animate-pulse');
        btn.classList.add('border-green-800', 'text-green-500', 'bg-green-900/10');
        els.keyStatusText.textContent = "API KEY ACTIVE";
        els.apiKeySection.classList.add('hidden');
        els.promptInput.disabled = false;
        els.promptInput.placeholder = "Describe your vision (e.g. 'Bleak russian winter with crushed blacks and teal highlights')...";
        els.downloadBtn.disabled = false;
    } else {
        btn.classList.add('border-red-800', 'text-red-500', 'bg-red-900/10', 'animate-pulse');
        btn.classList.remove('border-green-800', 'text-green-500', 'bg-green-900/10');
        els.keyStatusText.textContent = "MISSING API KEY";
        els.apiKeySection.classList.remove('hidden');
        els.promptInput.disabled = true;
        els.promptInput.placeholder = "Please enter API Key above to start...";
        els.downloadBtn.disabled = true;
    }
    
    // Toggle generate button state based on key and prompt
    els.generateBtn.disabled = !state.apiKey || !state.prompt;
};

const renderParams = () => {
    els.paramsContainer.innerHTML = '';
    
    // FIX: Iterate over DEFAULT_PARAMS keys only.
    // This ignores any extra junk keys (like "thought_process") the AI might send.
    Object.keys(DEFAULT_PARAMS).forEach((key) => {
        
        // Get value, defaulting to the default if missing
        let value = state.currentParams[key];

        // SAFETY: Force convert to number in case AI sent a string like "0.5"
        if (typeof value !== 'number') {
            value = parseFloat(value);
        }

        // Double check: if it's still not a number (NaN), use 0
        if (isNaN(value)) {
            value = DEFAULT_PARAMS[key] || 0;
        }

        const percent = getVisualPercent(key, value);
        const niceKey = key.replace(/[A-Z]/g, ' $&');
        
        const html = `
        <div class="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50 flex flex-col gap-2 group hover:border-red-900/30 transition-colors">
            <div class="flex justify-between items-center">
                <span class="text-[10px] uppercase text-zinc-500 font-bold truncate group-hover:text-zinc-300 transition-colors" title="${key}">
                    ${niceKey}
                </span>
                <span class="text-xs font-mono text-zinc-300">${value.toFixed(2)}</span>
            </div>
            <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-red-600 rounded-full transition-all duration-500" style="width: ${Math.max(0, Math.min(100, percent))}%"></div>
            </div>
        </div>`;
        
        els.paramsContainer.insertAdjacentHTML('beforeend', html);
    });
};
const updateCanvas = () => {
    const canvas = els.previewCanvas;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = state.previewImage || DEFAULT_IMAGE_SRC;
    
    img.onload = () => {
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            const [nR, nG, nB] = applyColorGrade(r, g, b, state.currentParams);
            
            data[i] = nR * 255;
            data[i + 1] = nG * 255;
            data[i + 2] = nB * 255;
        }
        
        ctx.putImageData(imageData, 0, 0);
    };
};

const setProcessing = (loading) => {
    state.isProcessing = loading;
    const icon = els.generateIcon;
    const text = els.generateText;
    
    if (loading) {
        icon.innerHTML = `<i data-lucide="refresh-cw" class="animate-spin" width="14" height="14"></i>`;
        text.textContent = 'Generating...';
        els.generateBtn.disabled = true;
    } else {
        icon.innerHTML = `<i data-lucide="zap" width="14" height="14" fill="currentColor"></i>`;
        text.textContent = 'Generate';
        els.generateBtn.disabled = false;
    }
    lucide.createIcons();
};

const showError = (msg) => {
    const errEl = document.getElementById('error-message');
    if (msg) {
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
    } else {
        errEl.classList.add('hidden');
    }
};

// --- Actions ---

const handleGenerate = async () => {
    if (!state.apiKey) return;
    
    setProcessing(true);
    showError(null);
    
    const systemPrompt = `
      You are an expert Senior Colorist working in DaVinci Resolve.
      Your task is to translate the user's natural language description into a precise JSON configuration for a color grading engine.

      ### INSTRUCTIONS
      1. Analyze the user's mood, lighting, and style request.
      2. Map this to the specific parameters below.
      3. **Return ONLY valid JSON.**

      ### PARAMETER GUIDE (Strict Ranges)
      
      **1. Primary Corrections**
      - "exposure": -2.0 to 2.0 (0.0 is Neutral).
      - "contrast": 0.5 to 1.5 (1.0 is Neutral).
      - "saturation": 0.0 to 2.0 (1.0 is Neutral).
      
      **2. White Balance**
      - "temperature": -1.0 (Blue/Cool) to 1.0 (Orange/Warm).
      - "tint": -1.0 (Green) to 1.0 (Magenta).

      **3. ASC-CDL (The "Soul" of the look)**
      - "liftR", "liftG", "liftB": -0.2 to 0.2 (Shadows). 
      - "gammaR", "gammaG", "gammaB": 0.8 to 1.2 (Midtones). 
      - "gainR", "gainG", "gainB": 0.8 to 1.2 (Highlights).
      
      **4. Split Toning**
      - "shadowTintR", "shadowTintG", "shadowTintB": -0.2 to 0.2.
      - "highlightTintR", "highlightTintG", "highlightTintB": -0.2 to 0.2.

      User Request: "${state.prompt}"
    `;
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
        });
        
        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        
        const text = data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const newParams = JSON.parse(jsonStr);
        
        state.currentParams = { ...DEFAULT_PARAMS, ...newParams };
        renderParams();
        updateCanvas();
        
    } catch (err) {
        showError("AI Generation Failed: " + err.message);
    } finally {
        setProcessing(false);
    }
};

const handleDownloadLUT = () => {
    let content = `TITLE "LUTai_${state.prompt.replace(/\s+/g, '_').substring(0, 15)}"\n`;
    content += `LUT_3D_SIZE ${LUT_SIZE}\n`;
    content += `DOMAIN_MIN 0.0 0.0 0.0\n`;
    content += `DOMAIN_MAX 1.0 1.0 1.0\n`;

    for (let b = 0; b < LUT_SIZE; b++) {
        for (let g = 0; g < LUT_SIZE; g++) {
            for (let r = 0; r < LUT_SIZE; r++) {
                const normR = r / (LUT_SIZE - 1);
                const normG = g / (LUT_SIZE - 1);
                const normB = b / (LUT_SIZE - 1);

                const [finalR, finalG, finalB] = applyColorGrade(normR, normG, normB, state.currentParams);
                
                content += `${finalR.toFixed(6)} ${finalG.toFixed(6)} ${finalB.toFixed(6)}\n`;
            }
        }
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LUTai_${state.prompt.replace(/\s+/g, '_').substring(0, 15) || 'grade'}.cube`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Map Elements
    els.toggleKeyBtn = document.getElementById('toggle-key-btn');
    els.keyStatusText = document.getElementById('key-status-text');
    els.apiKeySection = document.getElementById('api-key-section');
    els.apiKeyInput = document.getElementById('api-key-input');
    els.saveKeyBtn = document.getElementById('save-key-btn');
    els.promptInput = document.getElementById('prompt-input');
    els.generateBtn = document.getElementById('generate-btn');
    els.generateIcon = document.getElementById('generate-icon');
    els.generateText = document.getElementById('generate-text');
    els.paramsContainer = document.getElementById('params-container');
    els.downloadBtn = document.getElementById('download-btn');
    els.imageUpload = document.getElementById('image-upload');
    els.previewCanvas = document.getElementById('preview-canvas');

    // Setup Icons
    lucide.createIcons();

    // Initial Render
    renderParams();
    updateCanvas();

    // Event Listeners
    els.toggleKeyBtn.addEventListener('click', () => {
        state.showKeyInput = !state.showKeyInput;
        els.apiKeySection.classList.toggle('hidden', !state.showKeyInput);
    });

    els.apiKeyInput.addEventListener('input', (e) => {
        els.saveKeyBtn.disabled = !e.target.value;
    });

    els.saveKeyBtn.addEventListener('click', () => {
        state.apiKey = els.apiKeyInput.value;
        state.showKeyInput = false;
        updateKeyStatus();
    });

    els.promptInput.addEventListener('input', (e) => {
        state.prompt = e.target.value;
        els.generateBtn.disabled = !state.apiKey || !state.prompt;
    });

    els.generateBtn.addEventListener('click', handleGenerate);
    els.downloadBtn.addEventListener('click', handleDownloadLUT);

    els.imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                state.previewImage = event.target.result;
                updateCanvas();
            };
            reader.readAsDataURL(file);
        }
    });
});
