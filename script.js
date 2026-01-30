// 1. INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// 3. MATHJAX CONFIGURATION
// This forces the browser to recognize the $ delimiter which is missing in standard configs
window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
    },
    options: {
        processHtmlClass: 'tex2jax_process'
    }
};

// 4. THE "MAGIC" CLEANER
// This function takes your Supabase data (\\\\\\\\int) and turns it into (\int)
function fixMathFormatting(str) {
    if (!str) return "";
    // Step 1: Replace quadruple/double backslashes with single ones
    let cleaned = str.replace(/\\\\\\\\/g, '\\').replace(/\\\\/g, '\\');
    // Step 2: Ensure \n is treated as a real newline for the solution box
    return cleaned;
}

function refreshMath(element) {
    if (window.MathJax && window.MathJax.typesetPromise) {
        setTimeout(() => {
            window.MathJax.typesetPromise([element]).catch((err) => console.log('MathJax Error:', err));
        }, 150);
    }
}

// 5. AUTHENTICATION
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
    if (!testName || testName === "Loading...") {
        if(statusMsg) statusMsg.innerText = "Please select a test.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) {
        if(statusMsg) statusMsg.innerText = "Login failed: Invalid credentials.";
    } else if (data.user) { 
        currentUserEmail = data.user.email;
        await fetchQuestionsAndStart(); 
    }
};

// 6. LOADING QUESTIONS
window.loadQuestion = function() {
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    
    // Applying the cleaner to the question and all options
    const cleanQuestion = fixMathFormatting(qData.q);
    const cleanOptions = qData.options.map(opt => fixMathFormatting(opt));

    area.innerHTML = `
        <div class="tex2jax_process" style="padding: 20px 50px;">
            <div style="margin-bottom: 20px;">
                <span style="background: #0b4a8f; color: white; padding: 5px 15px; border-radius: 4px;">
                    Question ${currentIndex + 1}
                </span>
            </div>
            <div style="font-size: 1.3rem; margin-bottom: 25px; line-height: 1.8;">${cleanQuestion}</div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${cleanOptions.map((opt, i) => `
                    <label style="padding: 15px; border: 1.5px solid ${userAnswers[currentIndex] === qData.options[i] ? '#0b4a8f' : '#e2e8f0'}; background: ${userAnswers[currentIndex] === qData.options[i] ? '#f0f7ff' : '#fff'}; border-radius: 10px; cursor: pointer;">
                        <input type="radio" name="answer" value="${qData.options[i]}" onchange="saveAnswer(this.value); loadQuestion();" ${userAnswers[currentIndex] === qData.options[i] ? 'checked' : ''}> 
                        <span style="margin-left: 10px;">${opt}</span>
                    </label>
                `).join('')}
            </div>
        </div>`;
    
    updateStats(); 
    updatePaletteUI();
    refreshMath(area);
};

// 7. DETAILED SOLUTION (FIXING VERTICAL STEPS)
window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    
    // We clean the math and then convert the \n string into a real browser line break
    const solutionContent = fixMathFormatting(q.solution).replace(/\\n/g, '\n');

    solTab.document.write(`
        <html><head>
        <script>window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] } };</script>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        <style>
            body { font-family: 'Inter', sans-serif; padding: 50px; background: #f8fafc; color: #1e293b; }
            .card { background: white; max-width: 850px; margin: auto; padding: 40px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .sol-box { 
                white-space: pre-wrap; /* THIS IS THE KEY FOR STEPS */
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
                <h2 style="color: #0b4a8f;">Step-by-Step Solution</h2>
                <div style="font-size: 1.3rem; margin-bottom: 20px;">${fixMathFormatting(q.q)}</div>
                <div class="sol-box">${solutionContent}</div>
                <div style="font-weight: 800; color: #16a34a; background: #f0fdf4; padding: 15px; border-radius: 10px; display: inline-block;">
                    Correct Answer: ${fixMathFormatting(q.correct)}
                </div>
            </div>
        </body></html>
    `);
    solTab.document.close();
};

// 8. FLOW LOGIC
async function fetchQuestionsAndStart() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data } = await supabaseClient.from('questions_table')
        .select('question_data').eq('subject', sub).eq('test_name', testName).maybeSingle();

    if (data && data.question_data) {
        activeBank = data.question_data;
        userAnswers = new Array(activeBank.length).fill("");
        confirmedAnswered = new Array(activeBank.length).fill(false);
        markedForReview = new Array(activeBank.length).fill(false);
        
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('exam-header').style.display = 'flex';
        document.getElementById('quiz-container').style.display = 'flex';
        
        renderPalette();
        loadQuestion();
        startTimer();
    }
}

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
