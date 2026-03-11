// Initialize Icons
lucide.createIcons();

// --- Elements ---
const heroBtn = document.getElementById('hero-cta');
const uploadContainer = document.getElementById('upload-container');
const resultsWrapper = document.getElementById('results-wrapper');

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const transcribeBtn = document.getElementById('transcribe-btn');

const dropContent = document.getElementById('drop-content');
const progressWrapper = document.getElementById('progress-wrapper');
const progressCircle = document.querySelector('.progress-ring__circle');
const progressText = document.getElementById('progress-text');
const statusText = document.getElementById('status-text');

const dashboardSection = document.getElementById('dashboard-section');
const transcriptContent = document.getElementById('transcript-content');

let selectedFile = null;

// --- 1. Hero Load Animation ---
function initHeroAnimation() {
    gsap.registerPlugin(TextPlugin);
    
    // Animate Words
    const words = document.querySelectorAll('.word');
    // Set initial state
    gsap.set(words, { y: "120%", skewY: 7, opacity: 0 });
    
    const tl = gsap.timeline();
    
    tl.to(words, {
        y: "0%",
        skewY: 0,
        opacity: 1,
        duration: 0.9,
        stagger: 0.1,
        ease: "power4.out",
        delay: 0.2
    })
    .to('.hero-subtitle', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out"
    }, "-=0.4")
    .to('.btn-primary', {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "back.out(1.5)"
    }, "-=0.4");
}

window.addEventListener('load', initHeroAnimation);

// --- Navigation ---
heroBtn.addEventListener('click', () => {
    // Show upload area and scroll
    uploadContainer.style.display = 'block';
    
    gsap.to(uploadContainer, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        onComplete: () => {
            uploadContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    // Ripple effect
    gsap.fromTo(heroBtn, {scale: 0.95}, {scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)"});
});

// --- 2. Drag & Drop Upload Logic ---
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-active'), false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-active'), false);
});

dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    if (files.length > 0) {
        selectedFile = files[0];
        
        // Update UI to show selection
        const title = dropZone.querySelector('.drop-title');
        const desc = dropZone.querySelector('.drop-desc');
        const icon = dropZone.querySelector('.upload-icon');
        
        // Morph Icon
        icon.setAttribute('data-lucide', 'file-audio-2');
        lucide.createIcons();
        gsap.fromTo(icon, {scale: 0}, {scale: 1, duration: 0.5, ease: 'back.out(2)'});
        
        title.innerText = selectedFile.name;
        desc.innerText = `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to transcribe`;
        
        // Enable CTA
        transcribeBtn.disabled = false;
        transcribeBtn.classList.add('ready');
        gsap.to(transcribeBtn, {scale: 1.05, duration: 0.2, yoyo: true, repeat: 1});
    }
}

// Setup Progress Circle Geometry
const radius = progressCircle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = circumference;

function updateProgress(percent) {
    const offset = circumference - percent / 100 * circumference;
    progressCircle.style.strokeDashoffset = offset;
    progressText.innerText = Math.floor(percent);
}

// Start Processing
transcribeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedFile) return;

    // Hide CTA
    gsap.to(transcribeBtn, {opacity: 0, y: 20, duration: 0.3, onComplete: () => {
        transcribeBtn.style.display = 'none';
    }});

    // Morph Dropzone to Loader
    gsap.to(dropContent, {opacity: 0, duration: 0.3, onComplete: () => {
        dropContent.style.visibility = 'hidden';
        
        progressWrapper.style.display = 'flex';
        gsap.fromTo(progressWrapper, {opacity: 0, scale: 0.8}, {opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.2)"});
        
        processAudioAPI();
    }});
});

let dashboardData = [];
let transcriptData = [];

async function processAudioAPI() {
    let progress = 0;
    
    const statusMessages = [
        "Analyzing audio profile...",
        "Identifying speakers...",
        "Transcribing speech...",
        "Extracting insights...",
        "Finalizing intelligent notes..."
    ];
    let statusIndex = 0;
    
    // Check if the file is large (over 22MB)
    const isLargeFile = selectedFile.size > 22 * 1024 * 1024;
    
    if (isLargeFile) {
        statusMessages.unshift("Large file detected. Chunking audio...");
        statusMessages.splice(2, 0, "Processing chunks sequentially (this may take time)...");
        statusMessages.push("Stitching transcripts...");
    }

    const interval = setInterval(() => {
        // Increment progress up to 90% (or 95% for large files) while waiting for API
        const maxProgress = isLargeFile ? 96 : 90;
        if (progress < maxProgress) {
            // Slower progress for large files
            const increment = isLargeFile ? (Math.random() * 2 + 0.5) : (Math.random() * 5 + 1);
            progress += increment; 
            updateProgress(progress);
        }
        
        // Pulsating Edge Glow on Box based on Progress
        gsap.to('.drop-zone', {
            boxShadow: `0 0 ${progress + 20}px rgba(0, 242, 254, ${progress/200})`,
            borderColor: `rgba(0, 242, 254, ${progress/100})`,
            duration: 0.2
        });

        // Update Text
        if (progress > (statusIndex + 1) * 20 && statusIndex < statusMessages.length - 1) {
            statusIndex++;
            gsap.to(statusText, {opacity: 0, duration: 0.2, onComplete: () => {
                statusText.innerText = statusMessages[statusIndex];
                gsap.to(statusText, {opacity: 1, duration: 0.2});
            }});
        }
    }, 400);

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('https://notesaid.onrender.com/upload-audio', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Populate the dynamic global arrays with real AI data
        dashboardData = data.dashboardCards || [];
        transcriptData = data.smartTranscript || [];

        // Force complete the loader
        clearInterval(interval);
        updateProgress(100);
        statusText.innerText = "Complete!";

        setTimeout(() => {
            transitionToDashboard();
        }, 600);

    } catch (error) {
        clearInterval(interval);
        statusText.innerText = "Error processing audio!";
        statusText.style.color = "#ff4444";
        console.error("API Error", error);
    }
}

// --- 3. Transition to Results Interface ---
function transitionToDashboard() {
    gsap.to(uploadContainer, {
        opacity: 0,
        y: -40,
        scale: 0.95,
        duration: 0.6,
        ease: "power2.in",
        onComplete: () => {
            uploadContainer.style.display = 'none';
            
            // Build and Reveal Dashboard
            resultsWrapper.style.display = 'grid';
            buildDashboardCards();
            buildTranscriptData();
            
            // Stagger Reveal Results Wrapper
            gsap.fromTo(resultsWrapper, 
                { opacity: 0, y: 50 }, 
                { opacity: 1, y: 0, duration: 1, ease: "power3.out", onComplete: () => {
                     // Ensure window has scrolled down completely to view it
                     resultsWrapper.scrollIntoView({behavior: 'smooth', block: 'start'});
                }}
            );
        }
    });
}

// --- Data Models (Populated dynamically) ---

// --- 4. Personalization & Dashboard Rendering ---
function getCardScores() {
    try {
        return JSON.parse(localStorage.getItem('notesaid_card_prefs')) || {};
    } catch {
        return {};
    }
}

function registerInteraction(cardId) {
    const scores = getCardScores();
    scores[cardId] = (scores[cardId] || 0) + 1;
    localStorage.setItem('notesaid_card_prefs', JSON.stringify(scores));
}

function buildDashboardCards() {
    dashboardSection.innerHTML = '';
    const scores = getCardScores();
    
    // Sort logic: higher score gets pushed to the top automatically
    const sortedData = [...dashboardData].sort((a, b) => {
        const scoreA = scores[a.id] || 0;
        const scoreB = scores[b.id] || 0;
        return scoreB - scoreA;
    });

    sortedData.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'ai-card';
        card.setAttribute('data-type', item.type);
        card.id = item.id;
        
        card.innerHTML = `
            <div class="ai-card-header">
                <div class="ai-card-icon"><i data-lucide="${item.icon}"></i></div>
                <h3 class="ai-card-title">${item.title}</h3>
            </div>
            <div class="ai-card-body">
                ${item.content}
            </div>
        `;

        // Micro-interaction + Tracking
        card.addEventListener('click', () => {
            registerInteraction(item.id);
            // Click Lift Animation
            gsap.timeline()
                .to(card, { scale: 0.98, duration: 0.1 })
                .to(card, { scale: 1.02, duration: 0.3, ease: 'back.out(2)' })
                .to(card, { scale: 1, duration: 0.2 });
        });

        dashboardSection.appendChild(card);

        // GSAP Staggered Entrance
        gsap.fromTo(card, 
            { opacity: 0, x: -30, filter: 'blur(10px)' }, 
            { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.8, delay: 0.5 + (index * 0.15), ease: "power3.out" }
        );
    });

    lucide.createIcons();
}

// --- 5. Categorized Transcript Accordion Experience ---
function buildTranscriptData() {
    transcriptContent.innerHTML = '';

    transcriptData.forEach((group, groupIdx) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'topic-group';
        
        groupEl.innerHTML = `
            <div class="topic-header" id="topic-header-${groupIdx}">
                <div class="topic-meta">
                    <h4 class="topic-title">${group.title}</h4>
                    <span class="topic-time-badge">${group.timeRange}</span>
                </div>
                <p class="topic-summary">${group.summary}</p>
                <i data-lucide="chevron-down" class="topic-toggle-icon"></i>
            </div>
            <div class="topic-content" id="topic-content-${groupIdx}">
                <div class="segments-container" id="segments-container-${groupIdx}"></div>
                <button class="load-more-btn" id="load-more-${groupIdx}" style="display: none;"></button>
            </div>
        `;
        
        transcriptContent.appendChild(groupEl);
        
        const header = groupEl.querySelector('.topic-header');
        const container = groupEl.querySelector('.segments-container');
        const loadMoreBtn = groupEl.querySelector('.load-more-btn');
        const icon = groupEl.querySelector('.topic-toggle-icon');
        
        let visibleCount = 0;
        const CHUNK_SIZE = 5;
        
        function renderNextSegments() {
            const nextBatch = group.segments.slice(visibleCount, visibleCount + CHUNK_SIZE);
            
            nextBatch.forEach((item, idx) => {
                const block = document.createElement('div');
                block.className = `speaker-block ${item.role}`;
                
                // Initial letter for Avatar
                const avatarInitial = item.speaker.split(' ').map(n => n.charAt(0)).join('').substring(0, 2);

                block.innerHTML = `
                    <div class="speaker-meta">
                        <div class="speaker-avatar">${avatarInitial}</div>
                        <span class="speaker-name">${item.speaker}</span>
                        <span class="speaker-time" aria-label="Timestamp ${item.time}">${item.time}</span>
                    </div>
                    <div class="speaker-dialogue" title="Click to copy text">
                        <span class="dialogue-text">${item.text}</span>
                        <div class="copy-toast"><i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> Copied</div>
                    </div>
                `;
                
                container.appendChild(block);
                
                // Copy micro-interaction
                const dialogueContainer = block.querySelector('.speaker-dialogue');
                const toast = block.querySelector('.copy-toast');
                
                dialogueContainer.addEventListener('click', () => {
                    navigator.clipboard.writeText(item.text);
                    gsap.timeline()
                        .to(dialogueContainer, { color: '#00ff88', duration: 0.2 })
                        .to(toast, { opacity: 1, y: -5, duration: 0.3 }, "<")
                        .to(toast, { opacity: 0, y: -10, duration: 0.3 }, "+=1")
                        .to(dialogueContainer, { color: 'rgba(255, 255, 255, 0.85)', duration: 0.3 }, "<");
                });
                
                // Reveal animation for newly loaded blocks
                gsap.fromTo(block, 
                    { opacity: 0, y: 15 }, 
                    { opacity: 1, y: 0, duration: 0.4, delay: idx * 0.1 }
                );
            });
            
            visibleCount += nextBatch.length;
            
            if (visibleCount >= group.segments.length) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.innerText = `View More (${group.segments.length - visibleCount} remaining)`;
            }
            
            lucide.createIcons();
        }
        
        // Setup initial accordion state (collapsed)
        let isExpanded = false;
        
        header.addEventListener('click', () => {
            isExpanded = !isExpanded;
            
            if (isExpanded) {
                groupEl.classList.add('expanded');
                // Lazy load first batch of lines if empty
                if (visibleCount === 0) {
                    renderNextSegments();
                }
            } else {
                groupEl.classList.remove('expanded');
            }
        });
        
        loadMoreBtn.addEventListener('click', renderNextSegments);
        
        // Staggered entrance animation for category cards
        gsap.fromTo(groupEl, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5, delay: 1.5 + (groupIdx * 0.15) }
        );
    });

    lucide.createIcons();
}
