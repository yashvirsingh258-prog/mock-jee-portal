// INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// HELPER: TRIGGER MATHJAX
function triggerMath() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().catch((err) => console.log(err));
    }
}

// 3. AUTHENTICATION (UNTOUCHED LOGIC)
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

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.style.cssText = `display: flex; align-items: center; justify-content: center; height: 100vh; width: 100vw; font-family: 'Inter', sans-serif;`;
        loginScreen.innerHTML = `
            <div style="width: 100%; max-width: 400px; padding: 40px; text-align: left;">
                <h2 style="font-size: 38px; font-weight: 800; color: #0b4a8f; margin-bottom: 8px; letter-spacing: -2px;">Portal.</h2>
                <p style="color: #64748b; font-size: 14px; margin-bottom: 45px; font-weight: 500;">Secure Assessment Access</p>
                <div style="margin-bottom: 25px;"><input type="email" id="login-email" placeholder="Email Address" style="width: 100%; padding: 12px 0; border: none; border-bottom: 1.5px solid #e2e8f0; font-size: 16px; outline: none;"></div>
                <div style="margin-bottom: 35px;"><input type="password" id="login-pass" placeholder="Password" style="width: 100%; padding: 12px 0; border: none; border-bottom: 1.5px solid #e2e8f0; font-size: 16px; outline: none;"></div>
                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Subject</label>
                    <select id="subject-select" onchange="updateTestNames()" style="width: 100%; padding: 10px 0; border: none; border-bottom: 1.5px solid #e2e8f0; background: transparent; font-size: 15px; outline: none;">
                        <option value="mathematics">Mathematics</option>
                        <option value="physics">Physics</option>
                        <option value="chemistry">Chemistry</option>
                    </select>
                </div>
                <div style="margin-bottom: 45px;">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Test Assignment</label>
                    <select id="test-name-select" style="width: 100%; padding: 10px 0; border: none; border-bottom: 1.5px solid #e2e8f0; background: transparent; font-size: 15px; outline: none;">
                        <option>Loading...</option>
                    </select>
                </div>
                <button class="login-submit-btn" onclick="handleLogin()" style="width: 100%; background: #0b4a8f; color: white; border: none; padding: 18px; border-radius: 8px; font-weight: 700; cursor: pointer; letter-spacing: 2px;">ENTER PORTAL</button>
                <div id="auth-status-msg" style="margin-top: 20px; color: #e11d48; font-size: 13px; font-weight: 600; text-align: center;"></div>
            </div>`;
        updateTestNames();
    }
});

window.updateTestNames = async function() {
    const sub = document.getElementById('subject-select').value;
    const { data } = await supabaseClient.from('questions_table').select('test_name').eq('subject', sub);
    const testSelect = document.getElementById('test-name-select');
    if (data && data.length > 0) {
        const uniqueTests = [...new Set(data.map(item => item.test_name))];
        testSelect.innerHTML = uniqueTests.map(name => `<option value="${name}">${name}</option>`).join('');
    } else { testSelect.innerHTML = `<option>No tests available</option>`; }
};

async function fetchQuestionsAndStart() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data } = await supabaseClient.from('questions_table').select('question_data').eq('subject', sub).eq('test_name', testName).single();
    if (data) { activeBank = data.question_data; startExam(); }
}

window.startExam = function() {
    document.getElementById('exam-header').style.display = 'flex';
    document.getElementById('quiz-container').style.display = 'flex';
    document.getElementById('login-screen').style.display = 'none';
    userAnswers = new Array(activeBank.length).fill("");
    confirmedAnswered = new Array(activeBank.length).fill(false);
    markedForReview = new Array(activeBank.length).fill(false);
    renderPalette(); startTimer(); loadQuestion();
};

window.loadQuestion = function() {
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    area.innerHTML = `
        <div class="tex2jax_process" style="padding: 20px 50px;">
            <div style="margin-bottom: 20px;"><span style="background: #0b4a8f; color: white; padding: 5px 15px; border-radius: 4px;">Question ${currentIndex + 1}</span></div>
            <div style="font-size: 1.2rem; margin-bottom: 25px;">${qData.q}</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${qData.options.map(opt => `
                    <label style="padding: 15px; border: 1px solid ${userAnswers[currentIndex] === opt ? '#0b4a8f' : '#ddd'}; background: ${userAnswers[currentIndex] === opt ? '#f0f7ff' : '#fff'}; border-radius: 8px; cursor: pointer;">
                        <input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> ${opt}
                    </label>
                `).join('')}
            </div>
        </div>`;
    updatePaletteUI();
    triggerMath();
};

window.saveAnswer = (val) => { userAnswers[currentIndex] = val; };
window.saveAndNext = () => { if (userAnswers[currentIndex] !== "") confirmedAnswered[currentIndex] = true; if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } };

window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    solTab.document.write(`
        <html><head>
        <script>window.MathJax = { tex: { inlineMath: [['$', '$']] } };</script>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; }
            .card { background: white; max-width: 800px; margin: auto; padding: 40px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .step-container { white-space: pre-line; background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0; line-height: 1.8; font-size: 1.1rem; }
        </style>
        </head><body>
            <div class="card tex2jax_process">
                <h2 style="color:#0b4a8f">Solution for Question ${idx+1}</h2>
                <div style="font-size:1.2rem; margin-bottom:20px;">${q.q}</div>
                <div class="step-container">${q.solution.replace(/\\n/g, '\n')}</div>
                <div style="color: #16a34a; font-weight: 800; font-size: 1.2rem;">Correct Key: ${q.correct}</div>
            </div>
        </body></html>
    `);
    solTab.document.close();
};

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
