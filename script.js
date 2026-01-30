// 1. INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// 3. FORCE MATHJAX CONFIGURATION (Must be at the top)
window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true
    },
    options: {
        // This ensures only specific areas are scanned, which is faster and more reliable
        processHtmlClass: 'tex2jax_process'
    },
    startup: {
        pageReady: () => {
            return MathJax.startup.defaultPageReady();
        }
    }
};

// 4. DATA CLEANING (Removes database over-escaping)
function cleanMath(str) {
    if (!str) return "";
    // Replaces \\\\ (4 slashes) or \\ (2 slashes) with \ (1 slash)
    return str.replace(/\\\\\\\\/g, '\\').replace(/\\\\/g, '\\');
}

// 5. AGGRESSIVE RENDERING (Solves the "No Luck" timing issue)
function triggerMath() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        // Try immediately, then again at 200ms and 500ms
        // This handles cases where the DOM isn't ready yet
        const render = () => window.MathJax.typesetPromise().catch(e => console.log(e));
        render();
        setTimeout(render, 200);
        setTimeout(render, 500);
    }
}

// 6. AUTHENTICATION
window.handleLogin = async function() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    const statusMsg = document.getElementById('auth-status-msg');
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    const testName = document.getElementById('test-name-select').value;

    if (!email || !pass || testName === "Loading...") {
        if(statusMsg) statusMsg.innerText = "Check credentials and test selection.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) {
        if(statusMsg) statusMsg.innerText = "Login failed.";
    } else {
        currentUserEmail = data.user.email;
        await fetchQuestionsAndStart();
    }
};

// 7. LOADING QUESTIONS
window.loadQuestion = function() {
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    
    // We use the "tex2jax_process" class to tell MathJax "Look Here!"
    area.innerHTML = `
        <div class="tex2jax_process" style="padding: 20px 50px;">
            <div style="margin-bottom: 20px;">
                <span style="background: #0b4a8f; color: white; padding: 5px 15px; border-radius: 4px; font-weight: bold;">
                    Question ${currentIndex + 1}
                </span>
            </div>
            <div style="font-size: 1.35rem; margin-bottom: 30px; line-height: 1.8;">
                ${cleanMath(qData.q)}
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${qData.options.map((opt, i) => `
                    <label style="padding: 16px; border: 1.5px solid ${userAnswers[currentIndex] === opt ? '#0b4a8f' : '#e2e8f0'}; background: ${userAnswers[currentIndex] === opt ? '#f0f7ff' : '#fff'}; border-radius: 12px; cursor: pointer;">
                        <input type="radio" name="answer" value="${opt}" onchange="saveAnswer(this.value); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> 
                        <span style="margin-left: 10px; font-size: 1.1rem;">${cleanMath(opt)}</span>
                    </label>
                `).join('')}
            </div>
        </div>`;
    
    updateStats(); 
    updatePaletteUI();
    triggerMath();
};

// 8. SOLUTIONS (VERTICAL STEPS FIX)
window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    
    solTab.document.write(`
        <html><head>
        <title>Solution</title>
        <script>window.MathJax = { tex: { inlineMath: [['$', '$']] } };</script>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        <style>
            body { font-family: 'Inter', sans-serif; padding: 50px; background: #f8fafc; }
            .card { background: white; max-width: 800px; margin: auto; padding: 40px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .sol-box { 
                white-space: pre-wrap; /* THIS PRESERVES LINE BREAKS */
                background: #f1f5f9; 
                padding: 30px; 
                border-radius: 12px; 
                border-left: 6px solid #0b4a8f; 
                margin: 20px 0; 
                line-height: 2;
                font-size: 1.1rem;
            }
        </style></head>
        <body class="tex2jax_process">
            <div class="card">
                <h2>Detailed Solution</h2>
                <div>${cleanMath(q.q)}</div>
                <div class="sol-box">${cleanMath(q.solution).replace(/\\n/g, '\n')}</div>
                <div style="color: green; font-weight: bold;">Correct Answer: ${cleanMath(q.correct)}</div>
            </div>
        </body></html>
    `);
    solTab.document.close();
};

// 9. EXAM NAVIGATION & UTILITIES
window.saveAnswer = (val) => { userAnswers[currentIndex] = val; saveToCloud(); };
window.saveAndNext = () => { if (userAnswers[currentIndex] !== "") { confirmedAnswered[currentIndex] = true; markedForReview[currentIndex] = false; } if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } saveToCloud(); };
window.prevQuestion = () => { if (currentIndex > 0) { currentIndex--; loadQuestion(); saveToCloud(); } };
window.markForReview = () => { markedForReview[currentIndex] = true; if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } updatePaletteUI(); saveToCloud(); };
window.clearResponse = () => { userAnswers[currentIndex] = ""; confirmedAnswered[currentIndex] = false; markedForReview[currentIndex] = false; loadQuestion(); saveToCloud(); };

function startTimer() { timerActive = true; const interval = setInterval(() => { if (!timerActive) { clearInterval(interval); return; } timeLeft--; document.getElementById('time').innerText = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`; if (timeLeft <= 0) finalSubmission(); }, 1000); }
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
        <button onclick="openDetailedSolution(0)" style="background: #0b4a8f; color: white; border: none; padding: 15px 40px; border-radius: 8px; cursor: pointer; font-weight: 700;">VIEW SOLUTIONS</button>
    </div>`;
    refreshMath(res);
}

function renderPalette() { document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `<div id="dot-${i}" onclick="jumpTo(${i})" style="width:35px; height:35px; border:1px solid #ccc; display:inline-block; margin:2px; cursor:pointer; text-align:center; line-height:35px; border-radius:4px; font-weight:bold;">${i+1}</div>`).join(''); }
window.jumpTo = (i) => { currentIndex = i; loadQuestion(); saveToCloud(); };
function updatePaletteUI() { activeBank.forEach((_, i) => { const dot = document.getElementById(`dot-${i}`); if (!dot) return; dot.style.background = markedForReview[i] ? "#6f42c1" : (confirmedAnswered[i] ? "#198754" : "#fff"); dot.style.color = (markedForReview[i] || confirmedAnswered[i]) ? "#fff" : "#333"; dot.style.border = (i === currentIndex) ? "2.5px solid #0b4a8f" : "1px solid #ccc"; }); }
function updateStats() { const ans = confirmedAnswered.filter(x => x).length; document.getElementById('count-ans').innerText = ans; document.getElementById('count-not-ans').innerText = activeBank.length - ans; }
