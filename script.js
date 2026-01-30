// INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// 3. AUTHENTICATION
// UPDATED PREMIUM LOGIN SCREEN LOGIC
// Note: This replaces your previous handleLogin and adds the UI injection
window.handleLogin = async function() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    if (!emailInput || !passInput) return;
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    if (!email || !pass) { alert("Please enter both email and password."); return; }
    
    // UI Feedback: Disable button during login
    const loginBtn = document.querySelector('.premium-login-btn');
    if(loginBtn) { loginBtn.innerText = "Authenticating..."; loginBtn.style.opacity = "0.7"; }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    
    if (error) {
        alert("Login failed: " + error.message);
        if(loginBtn) { loginBtn.innerText = "Sign In"; loginBtn.style.opacity = "1"; }
    } else if (data.user) { 
        currentUserEmail = data.user.email; 
        await fetchQuestionsAndStart(); 
    }
};

// PRE-INJECTING THE PREMIUM LOOK (Run this on load)
document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        // Set Body style for login context
        document.body.style.margin = "0";
        document.body.style.background = "#f8fafc";
        
        loginScreen.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            width: 100vw;
            background: radial-gradient(circle at top right, #e2e8f0 0%, #f8fafc 100%);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        `;

        loginScreen.innerHTML = `
            <div style="width: 100%; max-width: 400px; padding: 40px; background: white; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 60px; height: 60px; background: #0b4a8f; border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0;">Portal Login</h1>
                    <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Enter your credentials to access the exam</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">Email Address</label>
                    <input type="email" id="login-email" placeholder="name@company.com" style="width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 15px; outline: none; transition: border-color 0.2s; box-sizing: border-box;" onfocus="this.style.borderColor='#0b4a8f'">
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">Password</label>
                    <input type="password" id="login-pass" placeholder="••••••••" style="width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 15px; outline: none; transition: border-color 0.2s; box-sizing: border-box;" onfocus="this.style.borderColor='#0b4a8f'">
                </div>

                <button class="premium-login-btn" onclick="handleLogin()" style="width: 100%; background: #0b4a8f; color: white; border: none; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(11, 74, 143, 0.2);" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 10px 15px -3px rgba(11, 74, 143, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(11, 74, 143, 0.2)'">
                    Sign In
                </button>
                
                <p style="text-align: center; font-size: 13px; color: #94a3b8; margin-top: 24px;">Secured by Supabase Identity</p>
            </div>
        `;
    }
    updateTestNames();
});

// 4. DYNAMIC DATA FETCHING
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

// 6. EXAM LOGIC
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

// UPDATED: PREMIUM SOLUTIONS PAGE WITH WHITE BACKGROUND
window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    solTab.document.write(`
        <html>
        <head>
            <title>Step-by-Step Solution</title>
            <script>
                window.MathJax = {
                    tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] },
                    svg: { fontCache: 'global' }
                };
            </script>
            <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                body { 
                    font-family: 'Inter', sans-serif; 
                    background: #ffffff; 
                    color: #1e293b; 
                    margin: 0; 
                    padding: 40px 20px; 
                    line-height: 1.6;
                }
                .premium-card {
                    max-width: 800px;
                    margin: 0 auto;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 24px;
                    padding: 40px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                }
                .header {
                    border-bottom: 2px solid #f1f5f9;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .badge {
                    background: #0b4a8f;
                    color: #ffffff;
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-weight: 800;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .q-text { font-size: 1.3rem; font-weight: 700; margin: 20px 0; color: #0f172a; }
                .sol-content { 
                    background: #f8fafc; 
                    padding: 25px; 
                    border-radius: 16px; 
                    border-left: 5px solid #0b4a8f;
                    font-size: 1.1rem;
                    color: #334155;
                }
                .correct-ans {
                    margin-top: 30px;
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: #16a34a;
                    background: #f0fdf4;
                    padding: 15px 25px;
                    border-radius: 12px;
                    display: inline-block;
                }
            </style>
        </head>
        <body>
            <div class="premium-card">
                <div class="header">
                    <span class="badge">Question ${idx + 1} Detailed Solution</span>
                    <div class="q-text">${q.q}</div>
                </div>
                <div style="font-size: 0.85rem; text-transform: uppercase; color: #64748b; margin-bottom: 12px; font-weight: 700; letter-spacing: 1px;">Explanation & Steps</div>
                <div class="sol-content">${q.solution}</div>
                <div class="correct-ans">
                    <span style="color: #64748b; font-size: 0.95rem; font-weight: 400; margin-right: 10px;">Final Answer:</span> ${q.correct}
                </div>
            </div>
        </body>
        </html>
    `);
    solTab.document.close();
};

// UPDATED: PREMIUM SUMMARY VIEW WITH WHITE BACKGROUND
function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const total = activeBank.length;
    
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding:18px; font-weight:700; color:#64748b;">${i+1}</td>
                <td style="padding:18px; text-align:left; color:#1e293b; font-size:0.95rem; font-weight:500;">${q.q}</td>
                <td style="padding:18px;"><span style="padding:6px 16px; border-radius:30px; font-size:0.85rem; font-weight:700; background:${isCorrect ? '#dcfce7' : '#fee2e2'}; color:${isCorrect ? '#166534' : '#991b1b'}; border:1px solid ${isCorrect ? '#b9f6ca' : '#ffcdd2'};">${userAnswers[i] || 'N/A'}</span></td>
                <td style="padding:18px; font-weight:800; color:#0b4a8f;">${q.correct}</td>
                <td style="padding:18px;">
                    <button onclick="openDetailedSolution(${i})" 
                        style="background:transparent; border:2px solid #0b4a8f; color:#0b4a8f; padding:8px 18px; border-radius:10px; cursor:pointer; font-weight:700; transition:0.3s; font-size: 0.85rem;" 
                        onmouseover="this.style.background='#0b4a8f'; this.style.color='#ffffff'; this.style.boxShadow='0 4px 12px rgba(11,74,143,0.2)'" 
                        onmouseout="this.style.background='transparent'; this.style.color='#0b4a8f'; this.style.boxShadow='none'">
                        View Solution
                    </button>
                </td>
            </tr>`;
    }).join('');

    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    
    document.body.style.background = "#ffffff";
    document.getElementById('result-screen').innerHTML = `
        <div style="max-width: 1200px; margin: 40px auto; padding: 20px; font-family: 'Inter', system-ui, sans-serif;">
            <div style="background: #0b4a8f; border-radius: 24px; padding: 50px; text-align: center; box-shadow: 0 20px 40px rgba(11,74,143,0.15); margin-bottom: 40px; color: #ffffff;">
                <h1 style="font-size: 2.6rem; margin-bottom: 10px; font-weight: 800; letter-spacing: -1px;">Assessment Report</h1>
                <div style="display:flex; justify-content:center; gap:80px; margin-top: 30px;">
                    <div><div style="font-size:4.2rem; font-weight:900; line-height:1;">${score}</div><div style="color:rgba(255,255,255,0.7); font-size:0.85rem; text-transform:uppercase; letter-spacing:2px; margin-top:10px;">Score / ${total}</div></div>
                    <div style="width:1px; background:rgba(255,255,255,0.2);"></div>
                    <div><div style="font-size:4.2rem; font-weight:900; line-height:1;">${((score/total)*100).toFixed(0)}%</div><div style="color:rgba(255,255,255,0.7); font-size:0.85rem; text-transform:uppercase; letter-spacing:2px; margin-top:10px;">Accuracy</div></div>
                </div>
            </div>
            
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                <table style="width:100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding:22px; color:#64748b; font-size:0.8rem; text-transform:uppercase; letter-spacing:1.5px;">#</th>
                            <th style="padding:22px; color:#64748b; font-size:0.8rem; text-transform:uppercase; letter-spacing:1.5px; text-align:left;">Question</th>
                            <th style="padding:22px; color:#64748b; font-size:0.8rem; text-transform:uppercase; letter-spacing:1.5px;">User Response</th>
                            <th style="padding:22px; color:#64748b; font-size:0.8rem; text-transform:uppercase; letter-spacing:1.5px;">Key</th>
                            <th style="padding:22px; color:#64748b; font-size:0.8rem; text-transform:uppercase; letter-spacing:1.5px;">Review</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            
            <div style="text-align:center; margin-top:50px;">
                <button onclick="location.reload()" style="background: #0b4a8f; color: #ffffff; border: none; padding: 20px 50px; border-radius: 16px; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: 0.3s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 12px 24px rgba(11,74,143,0.25)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">Finish & Exit</button>
            </div>
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

document.addEventListener('DOMContentLoaded', updateTestNames);
