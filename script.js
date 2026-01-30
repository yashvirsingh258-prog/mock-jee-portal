// INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// 3. AUTHENTICATION & PREMIUM UI LOGIC
window.handleLogin = async function() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    if (!emailInput || !passInput) return;
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    if (!email || !pass) { alert("Please enter credentials."); return; }
    
    const loginBtn = document.querySelector('.login-submit-btn');
    if(loginBtn) loginBtn.innerText = "AUTHENTICATING..."; 

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) {
        alert("Login failed: " + error.message);
        if(loginBtn) loginBtn.innerText = "ENTER PORTAL";
    } else if (data.user) { 
        currentUserEmail = data.user.email; 
        await fetchQuestionsAndStart(); // Preserve database fetching logic
    }
};

// INJECTING THE MINIMALIST UI WITH ALL FIELDS
document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        document.body.style.background = "#ffffff";
        loginScreen.style.cssText = `
            display: flex; align-items: center; justify-content: center;
            height: 100vh; width: 100vw; font-family: 'Inter', sans-serif;
        `;

        loginScreen.innerHTML = `
            <div style="width: 100%; max-width: 400px; padding: 40px; text-align: left;">
                <h2 style="font-size: 38px; font-weight: 800; color: #0b4a8f; margin-bottom: 8px; letter-spacing: -2px;">Portal.</h2>
                <p style="color: #64748b; font-size: 14px; margin-bottom: 45px; font-weight: 500;">Secure Assessment Access</p>

                <div style="margin-bottom: 25px;">
                    <input type="email" id="login-email" placeholder="Student Email" 
                        style="width: 100%; padding: 12px 0; border: none; border-bottom: 1.5px solid #e2e8f0; font-size: 16px; outline: none; transition: 0.3s; color: #1e293b;"
                        onfocus="this.style.borderBottomColor='#0b4a8f'" onblur="this.style.borderBottomColor='#e2e8f0'">
                </div>

                <div style="margin-bottom: 35px;">
                    <input type="password" id="login-pass" placeholder="Password" 
                        style="width: 100%; padding: 12px 0; border: none; border-bottom: 1.5px solid #e2e8f0; font-size: 16px; outline: none; transition: 0.3s; color: #1e293b;"
                        onfocus="this.style.borderBottomColor='#0b4a8f'" onblur="this.style.borderBottomColor='#e2e8f0'">
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Subject</label>
                    <select id="subject-select" onchange="updateTestNames()"
                        style="width: 100%; padding: 10px 0; border: none; border-bottom: 1.5px solid #e2e8f0; background: transparent; font-size: 15px; font-weight: 600; color: #1e293b; outline: none; cursor: pointer;">
                        <option value="mathematics">Mathematics</option>
                        <option value="physics">Physics</option>
                        <option value="chemistry">Chemistry</option>
                    </select>
                </div>

                <div style="margin-bottom: 45px;">
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Test Assignment</label>
                    <select id="test-name-select"
                        style="width: 100%; padding: 10px 0; border: none; border-bottom: 1.5px solid #e2e8f0; background: transparent; font-size: 15px; font-weight: 600; color: #1e293b; outline: none; cursor: pointer;">
                    </select>
                </div>

                <button class="login-submit-btn" onclick="handleLogin()" 
                    style="width: 100%; background: #0b4a8f; color: white; border: none; padding: 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: 2px; transition: 0.3s; box-shadow: 0 10px 20px rgba(11, 74, 143, 0.15);"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 30px rgba(11, 74, 143, 0.25)';" 
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 20px rgba(11, 74, 143, 0.15)';" >
                    ENTER PORTAL
                </button>
                
                <div style="margin-top: 50px; text-align: center;">
                    <span style="font-size: 10px; color: #cbd5e1; font-weight: 700; letter-spacing: 2px; border: 1px solid #f1f5f9; padding: 4px 12px; border-radius: 20px;">SYSTEM SECURE</span>
                </div>
            </div>
        `;
    }
    updateTestNames();
});

// 4. DYNAMIC DATA FETCHING (Unchanged logic)
window.updateTestNames = async function() {
    const sub = document.getElementById('subject-select').value;
    const testSelect = document.getElementById('test-name-select');
    const { data, error } = await supabaseClient.from('questions_table').select('test_name').eq('subject', sub);
    if (!error && testSelect) {
        testSelect.innerHTML = data.map(row => `<option value="${row.test_name}">${row.test_name}</option>`).join('');
    }
};

async function fetchQuestionsAndStart() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data, error } = await supabaseClient.from('questions_table').select('question_data').eq('subject', sub).eq('test_name', testName).single();
    if (error || !data) { alert("Could not load test questions."); return; }
    activeBank = data.question_data; 
    startExam();
}

// 5. CLOUD PERSISTENCE
async function saveToCloud() {
    if (!currentUserEmail) return;
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    await supabaseClient.from('student_progress').upsert({ 
        username: currentUserEmail, subject: sub, test_name: testName, current_index: currentIndex,
        user_answers: [...userAnswers], confirmed_answered: [...confirmedAnswered], marked_for_review: [...markedForReview],
        time_left: timeLeft, is_finished: false
    }, { onConflict: 'username, subject, test_name' });
}

// 6. EXAM LOGIC (Unchanged logic)
window.startExam = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data } = await supabaseClient.from('student_progress').select('*').eq('username', currentUserEmail).eq('subject', sub).eq('test_name', testName).maybeSingle();

    if (data && data.is_finished) {
        userAnswers = data.user_answers;
        showFinalResultOnly(); 
        return;
    }

    if (data && confirm("Resume existing progress?")) {
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
    area.innerHTML = `
        <div style="padding: 20px 50px;">
            <div style="margin-bottom: 20px;"><span style="background: #0b4a8f; color: white; padding: 5px 15px; border-radius: 4px;">Question ${currentIndex + 1}</span></div>
            <div style="font-size: 1.2rem; margin-bottom: 25px;">${qData.q}</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${qData.type === 'mcq' ? 
                    qData.options.map(opt => `
                        <label style="padding: 15px; border: 1px solid ${userAnswers[currentIndex] === opt ? '#0b4a8f' : '#ddd'}; background: ${userAnswers[currentIndex] === opt ? '#f0f7ff' : '#fff'}; border-radius: 8px; cursor: pointer;">
                            <input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> ${opt}
                        </label>`).join('') :
                    `<input type="text" style="padding: 15px; border-radius: 8px; border: 1px solid #ddd;" oninput="saveAnswer(this.value)" value="${userAnswers[currentIndex]}">`
                }
            </div>
        </div>`;
    updateStats(); updatePaletteUI();
    if (window.MathJax) MathJax.typesetPromise();
};

window.saveAnswer = function(val) { userAnswers[currentIndex] = val; saveToCloud(); };
window.saveAndNext = function() {
    if (userAnswers[currentIndex] !== "") { confirmedAnswered[currentIndex] = true; markedForReview[currentIndex] = false; }
    if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); }
    saveToCloud();
};

window.prevQuestion = function() {
    if (currentIndex > 0) { currentIndex--; loadQuestion(); saveToCloud(); }
};

window.markForReview = function() {
    markedForReview[currentIndex] = true;
    if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } else updatePaletteUI();
    saveToCloud();
};

window.clearResponse = function() {
    userAnswers[currentIndex] = ""; confirmedAnswered[currentIndex] = false; markedForReview[currentIndex] = false;
    loadQuestion(); saveToCloud();
};

function startTimer() {
    timerActive = true;
    const interval = setInterval(() => {
        if (!timerActive) { clearInterval(interval); return; }
        timeLeft--;
        document.getElementById('time').innerText = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
        if (timeLeft <= 0) finalSubmission();
    }, 1000);
}

window.confirmSubmit = function() { if (confirm("Submit examination?")) finalSubmission(); };

// SOLUTIONS & SUMMARY (Unchanged logic)
window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    solTab.document.write(`
        <html>
        <head>
            <title>Solution</title>
            <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            <style>
                body { font-family: 'Inter', sans-serif; background: #ffffff; padding: 40px; color: #1e293b; }
                .premium-card { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
                .q-text { font-size: 1.3rem; font-weight: 700; margin-bottom: 20px; }
                .sol-content { background: #f8fafc; padding: 25px; border-radius: 16px; border-left: 5px solid #0b4a8f; }
            </style>
        </head>
        <body>
            <div class="premium-card">
                <div class="q-text">${q.q}</div>
                <div class="sol-content">${q.solution}</div>
                <div style="margin-top: 20px; font-weight: 800; color: #16a34a;">Key: ${q.correct}</div>
            </div>
        </body>
        </html>
    `);
    solTab.document.close();
};

function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const total = activeBank.length;
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:18px; font-weight:700;">${i+1}</td>
                <td style="padding:18px; text-align:left;">${q.q}</td>
                <td style="padding:18px;"><span style="padding:6px 16px; border-radius:30px; font-weight:700; background:${isCorrect ? '#dcfce7' : '#fee2e2'}; color:${isCorrect ? '#166534' : '#991b1b'};">${userAnswers[i] || 'N/A'}</span></td>
                <td style="padding:18px; font-weight:800; color:#0b4a8f;">${q.correct}</td>
                <td style="padding:18px;"><button onclick="openDetailedSolution(${i})" style="border:2px solid #0b4a8f; background:none; color:#0b4a8f; padding:8px 18px; border-radius:10px; cursor:pointer; font-weight:700;">Solution</button></td>
            </tr>`;
    }).join('');

    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    document.body.style.background = "#ffffff";
    document.getElementById('result-screen').innerHTML = `
        <div style="max-width: 1200px; margin: 40px auto; text-align:center; font-family: 'Inter', sans-serif;">
            <div style="background:#0b4a8f; color:#fff; padding:60px; border-radius:24px; margin-bottom:40px;">
                <h1>Assessment Summary</h1>
                <div style="font-size:4rem; font-weight:900;">${score} / ${total}</div>
            </div>
            <table style="width:100%; border-collapse:collapse; background:#fff; border:1px solid #e2e8f0; border-radius:12px;">
                <thead><tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;"><th>#</th><th>Question</th><th>Result</th><th>Key</th><th>Review</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
    if (window.MathJax) MathJax.typesetPromise();
}

window.finalSubmission = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    await supabaseClient.from('student_progress').upsert({ 
        username: currentUserEmail, subject: sub, test_name: testName, is_finished: true, 
        user_answers: [...userAnswers], time_left: 0
    }, { onConflict: 'username, subject, test_name' });
    showFinalResultOnly();
};

function renderPalette() {
    document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `<div id="dot-${i}" onclick="jumpTo(${i})" style="width:35px; height:35px; border:1px solid #ccc; display:inline-block; margin:2px; cursor:pointer; text-align:center; line-height:35px; border-radius:4px; font-weight:bold;">${i+1}</div>`).join('');
}
window.jumpTo = function(i) { currentIndex = i; loadQuestion(); saveToCloud(); };
function updatePaletteUI() {
    activeBank.forEach((_, i) => {
        const dot = document.getElementById(`dot-${i}`);
        if (!dot) return;
        dot.style.background = markedForReview[i] ? "#6f42c1" : (confirmedAnswered[i] ? "#198754" : "#fff");
        dot.style.color = (markedForReview[i] || confirmedAnswered[i]) ? "#fff" : "#333";
        dot.style.border = (i === currentIndex) ? "2.5px solid #0b4a8f" : "1px solid #ccc";
    });
}
function updateStats() {
    const ans = confirmedAnswered.filter(x => x).length;
    document.getElementById('count-ans').innerText = ans;
    document.getElementById('count-not-ans').innerText = activeBank.length - ans;
}
