// 1. INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// 3. CRITICAL FIX: ASYNCHRONOUS MATH RENDERING
// This ensures MathJax scans the content ONLY after the browser has finished painting the HTML.
function refreshMath(element) {
    if (window.MathJax && window.MathJax.typesetPromise) {
        // 100ms delay solves the "race condition" where math is triggered on empty/old content
        setTimeout(() => {
            window.MathJax.typesetPromise([element]).catch((err) => console.log('MathJax Error:', err));
        }, 100);
    }
}

// 4. AUTHENTICATION (Logic Preserved)
window.handleLogin = async function() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    const statusMsg = document.getElementById('auth-status-msg');
    if (!emailInput || !passInput) return;
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    if (!email || !pass) { if(statusMsg) statusMsg.innerText = "Please enter credentials."; return; }
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
        const { data: progress } = await supabaseClient.from('student_progress').select('is_finished').eq('username', currentUserEmail).eq('subject', sub).eq('test_name', testName).maybeSingle();
        if (progress && progress.is_finished) {
            if(statusMsg) statusMsg.innerText = "Test already submitted.";
        } else { await fetchQuestionsAndStart(); }
    }
};

// 5. LOADING QUESTIONS WITH RENDER TRIGGER
window.loadQuestion = function() {
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    
    // Applying 'tex2jax_process' is mandatory for MathJax 3.x scoped rendering
    area.innerHTML = `<div class="tex2jax_process" style="padding: 20px 50px;">
        <div style="margin-bottom: 20px;"><span style="background: #0b4a8f; color: white; padding: 5px 15px; border-radius: 4px;">Question ${currentIndex + 1}</span></div>
        <div style="font-size: 1.25rem; margin-bottom: 30px; line-height: 1.6;">${qData.q}</div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
            ${qData.options.map(opt => `
                <label style="padding: 16px; border: 1.5px solid ${userAnswers[currentIndex] === opt ? '#0b4a8f' : '#e2e8f0'}; background: ${userAnswers[currentIndex] === opt ? '#f0f7ff' : '#fff'}; border-radius: 10px; cursor: pointer;">
                    <input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> 
                    <span style="margin-left: 10px;">${opt}</span>
                </label>`).join('')}
        </div>
    </div>`;
    
    updateStats(); 
    updatePaletteUI();
    refreshMath(area); // Trigger rendering on the new container
};

// 6. DETAILED SOLUTION (FIXING LINE BREAKS)
window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    
    // CRITICAL: Handle the double-escaped backslashes from Supabase JSON
    const cleanSolution = q.solution.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

    solTab.document.write(`<html><head><title>Solution</title>
    <script>
        window.MathJax = { 
            tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$']] }
        };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; padding: 50px; background: #f8fafc; color: #1e293b; line-height: 1.6; }
        .card { max-width: 850px; margin: auto; background: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .sol-box { 
            white-space: pre-wrap; /* FORCES VERTICAL LAYOUT FOR STEPS */
            background: #f1f5f9; 
            padding: 30px; 
            border-radius: 16px; 
            border-left: 6px solid #0b4a8f; 
            margin: 25px 0; 
            font-size: 1.15rem;
            line-height: 1.8;
        }
    </style></head>
    <body class="tex2jax_process">
        <div class="card">
            <div style="color: #0b4a8f; font-weight: 800; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 10px;">Question ${idx+1} Explanation</div>
            <div style="font-size: 1.4rem; font-weight: 700; margin-bottom: 20px;">${q.q}</div>
            <div class="sol-box">${cleanSolution}</div>
            <div style="font-weight: 800; color: #16a34a; background: #f0fdf4; padding: 20px; border-radius: 15px;">Correct Answer: ${q.correct}</div>
        </div>
    </body></html>`);
    solTab.document.close();
};

// 7. REMAINING EXAM LOGIC (Preserved from original)
window.saveAnswer = (val) => { userAnswers[currentIndex] = val; saveToCloud(); };
window.saveAndNext = () => { if (userAnswers[currentIndex] !== "") { confirmedAnswered[currentIndex] = true; markedForReview[currentIndex] = false; } if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } saveToCloud(); };
window.prevQuestion = () => { if (currentIndex > 0) { currentIndex--; loadQuestion(); saveToCloud(); } };
window.markForReview = () => { markedForReview[currentIndex] = true; if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } else updatePaletteUI(); saveToCloud(); };
window.clearResponse = () => { userAnswers[currentIndex] = ""; confirmedAnswered[currentIndex] = false; markedForReview[currentIndex] = false; loadQuestion(); saveToCloud(); };

function startTimer() { timerActive = true; const interval = setInterval(() => { if (!timerActive) { clearInterval(interval); return; } timeLeft--; document.getElementById('time').innerText = \`\${Math.floor(timeLeft/60)}:\${(timeLeft%60).toString().padStart(2,'0')}\`; if (timeLeft <= 0) finalSubmission(); }, 1000); }
window.confirmSubmit = () => { if (confirm("Submit examination?")) finalSubmission(); };

async function saveToCloud() { 
    if (!currentUserEmail) return; 
    const sub = document.getElementById('subject-select').value; 
    const testName = document.getElementById('test-name-select').value; 
    await supabaseClient.from('student_progress').upsert({ 
        username: currentUserEmail, subject: sub, test_name: testName, 
        current_index: currentIndex, user_answers: [...userAnswers], 
        confirmed_answered: [...confirmedAnswered], marked_for_review: [...markedForReview], 
        time_left: timeLeft, is_finished: false 
    }, { onConflict: 'username, subject, test_name' }); 
}

async function finalSubmission() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    await supabaseClient.from('student_progress').upsert({ 
        username: currentUserEmail, subject: sub, test_name: testName, 
        is_finished: true, user_answers: [...userAnswers], time_left: 0 
    }, { onConflict: 'username, subject, test_name' });
    showFinalResultOnly();
}

function showFinalResultOnly() {
    timerActive = false;
    const res = document.getElementById('result-screen');
    res.style.display = 'block';
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    res.innerHTML = `<div class="tex2jax_process" style="padding:100px; text-align:center;">
        <h2 style="font-size: 2rem; color: #0b4a8f; margin-bottom: 20px;">Examination Complete</h2>
        <p style="margin-bottom: 40px; color: #64748b;">Your responses have been recorded successfully.</p>
        <button onclick="openDetailedSolution(0)" style="background: #0b4a8f; color: white; border: none; padding: 15px 40px; border-radius: 8px; cursor: pointer; font-weight: 700;">VIEW SOLUTIONS</button>
    </div>`;
    refreshMath(res);
}

function renderPalette() { document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `<div id="dot-\${i}" onclick="jumpTo(\${i})" style="width:35px; height:35px; border:1px solid #ccc; display:inline-block; margin:2px; cursor:pointer; text-align:center; line-height:35px; border-radius:4px; font-weight:bold;">\${i+1}</div>\`).join(''); }
window.jumpTo = (i) => { currentIndex = i; loadQuestion(); saveToCloud(); };
function updatePaletteUI() { activeBank.forEach((_, i) => { const dot = document.getElementById(\`dot-\${i}\`); if (!dot) return; dot.style.background = markedForReview[i] ? "#6f42c1" : (confirmedAnswered[i] ? "#198754" : "#fff"); dot.style.color = (markedForReview[i] || confirmedAnswered[i]) ? "#fff" : "#333"; dot.style.border = (i === currentIndex) ? "2.5px solid #0b4a8f" : "1px solid #ccc"; }); }
function updateStats() { const ans = confirmedAnswered.filter(x => x).length; document.getElementById('count-ans').innerText = ans; document.getElementById('count-not-ans').innerText = activeBank.length - ans; }
