// INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// HELPER: FORCE MATH RENDERING
function refreshMath() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().catch((err) => console.log('MathJax Error:', err));
    }
}

// 3. AUTHENTICATION & UI LOGIC
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
    if(statusMsg) statusMsg.innerText = ""; 

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    
    if (error) {
        if(statusMsg) statusMsg.innerText = "Login failed: Invalid credentials.";
        if(loginBtn) loginBtn.innerText = "ENTER PORTAL";
    } else if (data.user) { 
        currentUserEmail = data.user.email;
        const sub = document.getElementById('subject-select').value;
        const { data: progress } = await supabaseClient.from('student_progress')
            .select('is_finished')
            .eq('username', currentUserEmail)
            .eq('subject', sub)
            .eq('test_name', testName)
            .maybeSingle();

        if (progress && progress.is_finished) {
            if(loginBtn) loginBtn.innerText = "ENTER PORTAL";
            if(statusMsg) statusMsg.innerText = "Test submission already happened. Select another test.";
        } else {
            await fetchQuestionsAndStart(); 
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        document.body.style.background = "#ffffff";
        loginScreen.style.cssText = `display: flex; align-items: center; justify-content: center; height: 100vh; width: 100vw; font-family: 'Inter', sans-serif;`;
        loginScreen.innerHTML = `
            <div style="width: 100%; max-width: 400px; padding: 40px; text-align: left;">
                <h2 style="font-size: 38px; font-weight: 800; color: #0b4a8f; margin-bottom: 8px; letter-spacing: -2px;">Portal.</h2>
                <p style="color: #64748b; font-size: 14px; margin-bottom: 45px; font-weight: 500;">Secure Assessment Access</p>
                <div style="margin-bottom: 25px;"><input type="email" id="login-email" placeholder="Email Address" style="width: 100%; padding: 12px 0; border: none; border-bottom: 1.5px solid #e2e8f0; font-size: 16px; outline: none; transition: 0.3s;"></div>
                <div style="margin-bottom: 35px;"><input type="password" id="login-pass" placeholder="Password" style="width: 100%; padding: 12px 0; border: none; border-bottom: 1.5px solid #e2e8f0; font-size: 16px; outline: none; transition: 0.3s;"></div>
                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px;">Subject</label>
                    <select id="subject-select" onchange="updateTestNames()" style="width: 100%; padding: 10px 0; border: none; border-bottom: 1.5px solid #e2e8f0; background: transparent; font-size: 15px; font-weight: 600; outline: none; cursor: pointer;">
                        <option value="mathematics">Mathematics</option>
                        <option value="physics">Physics</option>
                        <option value="chemistry">Chemistry</option>
                    </select>
                </div>
                <div style="margin-bottom: 45px;">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px;">Test Assignment</label>
                    <select id="test-name-select" style="width: 100%; padding: 10px 0; border: none; border-bottom: 1.5px solid #e2e8f0; background: transparent; font-size: 15px; font-weight: 600; outline: none; cursor: pointer;">
                        <option>Loading...</option>
                    </select>
                </div>
                <button class="login-submit-btn" onclick="handleLogin()" style="width: 100%; background: #0b4a8f; color: white; border: none; padding: 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: 2px; transition: 0.3s;">ENTER PORTAL</button>
                <div id="auth-status-msg" style="margin-top: 20px; color: #e11d48; font-size: 13px; font-weight: 600; text-align: center; min-height: 20px;"></div>
            </div>`;
        updateTestNames();
    }
});

window.updateTestNames = async function() {
    const sub = document.getElementById('subject-select').value;
    const testSelect = document.getElementById('test-name-select');
    if (!testSelect) return;
    const { data, error } = await supabaseClient.from('questions_table').select('test_name').eq('subject', sub);
    if (error) {
        testSelect.innerHTML = `<option>Error loading tests</option>`;
    } else if (data && data.length > 0) {
        const uniqueTests = [...new Set(data.map(item => item.test_name))];
        testSelect.innerHTML = uniqueTests.map(name => `<option value="${name}">${name}</option>`).join('');
    } else {
        testSelect.innerHTML = `<option>No tests available</option>`;
    }
};

async function fetchQuestionsAndStart() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data, error } = await supabaseClient.from('questions_table').select('question_data').eq('subject', sub).eq('test_name', testName).single();
    if (error || !data) { alert("Load error."); return; }
    activeBank = data.question_data; 
    startExam();
}

window.startExam = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data } = await supabaseClient.from('student_progress').select('*').eq('username', currentUserEmail).eq('subject', sub).eq('test_name', testName).maybeSingle();
    
    if (data && data.is_finished) { userAnswers = data.user_answers; showFinalResultOnly(); return; }
    if (data && confirm("Resume progress?")) {
        currentIndex = data.current_index; userAnswers = data.user_answers;
        confirmedAnswered = data.confirmed_answered; markedForReview = data.marked_for_review; timeLeft = data.time_left;
    } else {
        userAnswers = new Array(activeBank.length).fill("");
        confirmedAnswered = new Array(activeBank.length).fill(false);
        markedForReview = new Array(activeBank.length).fill(false);
    }
    document.getElementById('exam-header').style.display = 'flex';
    document.getElementById('quiz-container').style.display = 'flex';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('display-subject').innerText = `${sub.toUpperCase()} - ${testName}`;
    renderPalette(); startTimer(); loadQuestion();
};

window.loadQuestion = function() {
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    area.innerHTML = `<div style="padding: 20px 50px;">
        <div style="margin-bottom: 20px;"><span style="background: #0b4a8f; color: white; padding: 5px 15px; border-radius: 4px;">Question ${currentIndex + 1}</span></div>
        <div class="tex2jax_process" style="font-size: 1.2rem; margin-bottom: 25px;">${qData.q}</div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            ${qData.type === 'mcq' ? qData.options.map(opt => `<label style="padding: 15px; border: 1px solid ${userAnswers[currentIndex] === opt ? '#0b4a8f' : '#ddd'}; background: ${userAnswers[currentIndex] === opt ? '#f0f7ff' : '#fff'}; border-radius: 8px; cursor: pointer;"><input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> <span class="tex2jax_process">${opt}</span></label>`).join('') : `<input type="text" class="tex2jax_process" style="padding: 15px; border-radius: 8px; border: 1px solid #ddd;" oninput="saveAnswer(this.value)" value="${userAnswers[currentIndex]}">`}
        </div>
    </div>`;
    updateStats(); updatePaletteUI();
    refreshMath();
};

window.saveAnswer = function(val) { userAnswers[currentIndex] = val; saveToCloud(); };
window.saveAndNext = function() { if (userAnswers[currentIndex] !== "") { confirmedAnswered[currentIndex] = true; markedForReview[currentIndex] = false; } if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } saveToCloud(); };
window.prevQuestion = function() { if (currentIndex > 0) { currentIndex--; loadQuestion(); saveToCloud(); } };
window.markForReview = function() { markedForReview[currentIndex] = true; if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } else updatePaletteUI(); saveToCloud(); };
window.clearResponse = function() { userAnswers[currentIndex] = ""; confirmedAnswered[currentIndex] = false; markedForReview[currentIndex] = false; loadQuestion(); saveToCloud(); };

function startTimer() { timerActive = true; const interval = setInterval(() => { if (!timerActive) { clearInterval(interval); return; } timeLeft--; document.getElementById('time').innerText = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`; if (timeLeft <= 0) finalSubmission(); }, 1000); }
window.confirmSubmit = function() { if (confirm("Submit examination?")) finalSubmission(); };
async function saveToCloud() { if (!currentUserEmail) return; const sub = document.getElementById('subject-select').value; const testName = document.getElementById('test-name-select').value; await supabaseClient.from('student_progress').upsert({ username: currentUserEmail, subject: sub, test_name: testName, current_index: currentIndex, user_answers: [...userAnswers], confirmed_answered: [...confirmedAnswered], marked_for_review: [...markedForReview], time_left: timeLeft, is_finished: false }, { onConflict: 'username, subject, test_name' }); }

window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    // Formats solution so every step (identified by \n or a period) is on a new line
    const formattedSol = q.solution.split(/\\n|\.\s+/).map(step => `<div style="margin-bottom:10px;">${step.trim()}</div>`).join('');
    
    const solTab = window.open('', '_blank');
    solTab.document.write(`<html><head><title>Solution</title>
    <script>window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], processEscapes: true } };</script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <style>body { font-family: 'Inter', sans-serif; padding: 40px; line-height: 1.6; }.card { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }.sol-box { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #0b4a8f; margin: 20px 0; }</style>
    </head><body class="tex2jax_process"><div class="card"><h3>Question ${idx+1} Solution</h3><div>${q.q}</div><div class="sol-box">${formattedSol}</div><div style="font-weight:bold; color:#16a34a;">Correct Answer: ${q.correct}</div></div></body></html>`);
    solTab.document.close();
};

function showFinalResultOnly() {
    timerActive = false; let score = 0; const total = activeBank.length;
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding:15px;">${i+1}</td><td style="padding:15px; text-align:left;">${q.q}</td><td style="padding:15px;">${userAnswers[i] || 'N/A'}</td><td style="padding:15px; font-weight:bold; color:#0b4a8f;">${q.correct}</td><td style="padding:15px;"><button onclick="openDetailedSolution(${i})" style="border:1px solid #0b4a8f; background:none; color:#0b4a8f; padding:5px 10px; border-radius:5px; cursor:pointer;">Solution</button></td></tr>`;
    }).join('');
    const percentage = ((score / total) * 100).toFixed(0);
    const resultScreen = document.getElementById('result-screen');
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    resultScreen.style.display = 'block';
    resultScreen.innerHTML = `<div class="tex2jax_process" style="max-width: 1000px; margin: 40px auto; font-family: 'Inter', sans-serif; text-align:center;">
        <div style="background: #0b4a8f; color: white; padding: 40px; border-radius: 15px;"><h2>Score: ${score} / ${total} (${percentage}%)</h2></div>
        <table style="width:100%; border-collapse: collapse; margin-top: 30px;"><thead><tr style="background:#f8fafc;"><th>#</th><th style="text-align:left;">Question</th><th>Your Ans</th><th>Key</th><th>Review</th></tr></thead><tbody>${tableRows}</tbody></table>
        <button onclick="window.location.reload()" style="margin-top:30px; background:#0b4a8f; color:white; border:none; padding:15px 30px; border-radius:8px; cursor:pointer; font-weight:bold;">RESTART</button>
    </div>`;
    refreshMath();
}

window.finalSubmission = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    await supabaseClient.from('student_progress').upsert({ username: currentUserEmail, subject: sub, test_name: testName, is_finished: true, user_answers: [...userAnswers], time_left: 0 }, { onConflict: 'username, subject, test_name' });
    showFinalResultOnly();
};

function renderPalette() { document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `<div id="dot-${i}" onclick="jumpTo(${i})" style="width:35px; height:35px; border:1px solid #ccc; display:inline-block; margin:2px; cursor:pointer; text-align:center; line-height:35px; border-radius:4px; font-weight:bold;">${i+1}</div>`).join(''); }
window.jumpTo = function(i) { currentIndex = i; loadQuestion(); saveToCloud(); };
function updatePaletteUI() { activeBank.forEach((_, i) => { const dot = document.getElementById(`dot-${i}`); if (!dot) return; dot.style.background = markedForReview[i] ? "#6f42c1" : (confirmedAnswered[i] ? "#198754" : "#fff"); dot.style.color = (markedForReview[i] || confirmedAnswered[i]) ? "#fff" : "#333"; dot.style.border = (i === currentIndex) ? "2.5px solid #0b4a8f" : "1px solid #ccc"; }); }
function updateStats() { const ans = confirmedAnswered.filter(x => x).length; document.getElementById('count-ans').innerText = ans; document.getElementById('count-not-ans').innerText = activeBank.length - ans; }
