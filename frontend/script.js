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
        
        simulateMockAPI();
    }});
});

function simulateMockAPI() {
    let progress = 0;
    
    const statusMessages = [
        "Analyzing audio profile...",
        "Identifying speakers...",
        "Transcribing speech...",
        "Extracting insights...",
        "Finalizing intelligent notes..."
    ];
    let statusIndex = 0;

    const interval = setInterval(() => {
        // Increment progress (approx 4 seconds to completion)
        progress += Math.random() * 5 + 2; 
        if (progress > 100) progress = 100;
        updateProgress(progress);
        
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

        if (progress === 100) {
            clearInterval(interval);
            setTimeout(() => {
                transitionToDashboard();
            }, 600);
        }
    }, 150); // 150ms * roughly 30 ticks = 4.5 seconds
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

// --- Data Models ---
const mockDashboardData = [
    { 
        id: 'card-summary', type: 'summary', title: 'Executive Summary', icon: 'zap', 
        content: 'Design review completed for the AI Notes App. The team agreed on using a dark glassmorphism aesthetic with bright neon accents. GSAP will power the motion design layout.'
    },
    { 
        id: 'card-action', type: 'action', title: 'Action Items', icon: 'check-circle', 
        content: '<div class="card-list-item">Frontend Team: Finalize GSAP scroll animations</div><div class="card-list-item">Design: Export SVG assets for particles</div><div class="card-list-item">Backend: Establish API mock threshold delays</div>'
    },
    { 
        id: 'card-decision', type: 'decision', title: 'Key Decisions', icon: 'git-commit', 
        content: '<div class="card-list-item">Drop React complexity in favor of Vanilla JS for absolute performance control.</div><div class="card-list-item">Adopt Mobile-first spacing scheme.</div>'
    },
    { 
        id: 'card-important', type: 'important', title: 'Session Highlights', icon: 'clock', 
        content: '<div class="card-list-item"><strong>01:14</strong> - Discussion on accessibility implementation</div><div class="card-list-item"><strong>04:22</strong> - Final tech stack confirmation</div>'
    }
];

const mockTranscriptData = [
    { speaker: 'Design Lead', role: 'role-s1', time: '00:03', text: "Welcome everyone. Today we are signing off on the UI specs for the AI Notes interface. I want to emphasize that motion is critical here." },
    { speaker: 'Frontend Architect', role: 'role-s2', time: '00:15', text: "Understood. We are utilizing GSAP for buttery smooth rendering. The glassmorphism layers are mapped using custom CSS variables to hit the 60fps target." },
    { speaker: 'Product Manager', role: 'role-s3', time: '00:32', text: "That sounds excellent. What about user personalization?" },
    { speaker: 'Frontend Architect', role: 'role-s2', time: '00:38', text: "We're implementing LocalStorage trackers on the dashboard cards. If a user interacts heavily with tasks, the Action Items card automatically floats to the top of the hierarchy." },
    { speaker: 'Design Lead', role: 'role-s1', time: '00:54', text: "Perfect. It makes the SaaS feel ALIVE and intelligent. Let's get this shipped." },
];

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
    const sortedData = [...mockDashboardData].sort((a, b) => {
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

// --- 5. Transcript Typing Experience ---
function buildTranscriptData() {
    transcriptContent.innerHTML = '';

    mockTranscriptData.forEach((item, index) => {
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
            <div class="speaker-dialogue" id="dialog-${index}" title="Click to copy text">
                <span class="dialogue-text"></span>
                <div class="copy-toast"><i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> Copied</div>
            </div>
        `;
        
        transcriptContent.appendChild(block);

        // Logic for GSAP Typing Effect
        // We will stagger the rendering of each block so it feels like a live conversation
        const targetElement = block.querySelector('.dialogue-text');
        
        const tl = gsap.timeline({delay: 1.5 + (index * 2)}); // sequential reveal
        
        tl.fromTo(block, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5 }
        )
        .to(targetElement, {
            text: item.text,
            duration: item.text.length * 0.02, // speed of typing
            ease: "none",
            onUpdate: () => {
                // Keep scroll at bottom during generation
                transcriptContent.scrollTop = transcriptContent.scrollHeight;
            }
        });

        // Copy micro-interaction
        const dialogueContainer = block.querySelector('.speaker-dialogue');
        const toast = block.querySelector('.copy-toast');
        
        dialogueContainer.addEventListener('click', () => {
            navigator.clipboard.writeText(item.text);
            
            // GSAP pulse green text and show toast
            gsap.timeline()
                .to(dialogueContainer, { color: '#00ff88', duration: 0.2 })
                .to(toast, { opacity: 1, y: -5, duration: 0.3 }, "<")
                .to(toast, { opacity: 0, y: -10, duration: 0.3 }, "+=1")
                .to(dialogueContainer, { color: 'rgba(255, 255, 255, 0.85)', duration: 0.3 }, "<");
        });
    });

    lucide.createIcons();
}
