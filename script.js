// INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// 3. HELPER: UNIVERSAL MATH TRIGGER
// This ensures MathJax scans the page even after the content is injected by JS.
function refreshMath() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().catch((err) => console.log('MathJax Error:', err));
    }
}

// 4. AUTHENTICATION (Logic preserved)
window.handleLogin = async function() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    const statusMsg = document.getElementById('auth-status-msg');
    
    if (!emailInput || !passInput) return;
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    
    if (!email || !pass) { 
        if(statusMsg) statusMsg.innerText = "Please enter credentials.";
        return; 
    }
    
    const testSelect = document.getElementById('test-name-select');
    const testName = testSelect ? testSelect.value : "";

    if (!testName || testName === "Loading..." || testName === "No tests available") {
        if(statusMsg) statusMsg.innerText = "Please select a test assignment.";
        return;
    }
    
    const loginBtn = document.querySelector('.login-submit-btn');
    if(loginBtn) loginBtn.innerText = "AUTHENTICATING..."; 

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    
    if (error) {
        if(statusMsg) statusMsg.innerText = "Login failed: Invalid credentials.";
        if(loginBtn) loginBtn.innerText = "ENTER PORTAL";
    } else if (data.user) { 
        currentUserEmail = data.user.email;
        const sub = document.getElementById('subject-select').value;
        const { data: progress } = await supabaseClient.from('student_progress')
            .select('is_finished').eq('username', currentUserEmail).eq('subject', sub).eq('test_name', testName).maybeSingle();

        if (progress && progress.is_finished) {
            if(statusMsg) statusMsg.innerText = "Test submission already happened.";
        } else {
            await fetchQuestionsAndStart(); 
        }
    }
};

// 5. LOADING QUESTIONS & RENDERING MATH
window.loadQuestion = function() {
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    
    // Applying 'tex2jax_process' allows MathJax to target this specific div
    area.innerHTML = `<div class="tex2jax_process" style="padding: 20px 50px;">
        <div style="margin-bottom: 20px;"><span style="background: #0b4a8f; color: white; padding: 5px 15px; border-radius: 4px;">Question ${currentIndex + 1}</span></div>
        <div style="font-size: 1.2rem; margin-bottom: 25px;">${qData.q}</div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            ${qData.options.map(opt => `
                <label style="padding: 15px; border: 1px solid ${userAnswers[currentIndex] === opt ? '#0b4a8f' : '#ddd'}; background: ${userAnswers[currentIndex] === opt ? '#f0f7ff' : '#fff'}; border-radius: 8px; cursor: pointer;">
                    <input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> ${opt}
                </label>`).join('')}
        </div>
    </div>`;
    
    updateStats(); 
    updatePaletteUI();
    refreshMath(); // Trigger rendering immediately after HTML is set
};

// 6. DETAILED SOLUTION (Fixing Newlines)
window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    
    // Replaces the double backslash \n from the DB with a real JS newline
    const cleanSolution = q.solution.replace(/\\n/g, '\n');

    solTab.document.write(`<html><head><title>Solution</title>
    <script>window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] } };</script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; line-height: 1.6; background: #ffffff; }
        .card { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .sol-box { 
            white-space: pre-line; /* Essential: browser will now respect the \n line breaks */
            background: #f8fafc; 
            padding: 25px; 
            border-radius: 12px; 
            border-left: 5px solid #0b4a8f; 
            margin: 20px 0; 
            font-size: 1.1rem;
        }
    </style></head>
    <body class="tex2jax_process">
        <div class="card">
            <div style="color:#0b4a8f; font-weight:800; text-transform:uppercase; font-size:0.8rem; margin-bottom:10px;">Question ${idx+1} Detailed Solution</div>
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:20px;">${q.q}</div>
            <div class="sol-box">${cleanSolution}</div>
            <div style="font-weight:800; color:#16a34a; background:#f0fdf4; padding:15px; border-radius:12px; display:inline-block;">Correct Key: ${q.correct}</div>
        </div>
    </body></html>`);
    solTab.document.close();
};

// ... [Rest of timer and palette functions remain as in your original script (1).js]

function showFinalResultOnly() {
    timerActive = false;
    const res = document.getElementById('result-screen');
    res.style.display = 'block';
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    res.innerHTML = `<div class="tex2jax_process" style="padding:50px; text-align:center;"><h2>Test Complete</h2><button onclick="openDetailedSolution(0)">View Solutions</button></div>`;
    triggerMath();
}
// Logic for Timer, Palette, and Submit remain as per your existing files.
