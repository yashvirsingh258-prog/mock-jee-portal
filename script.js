// INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// 3. AUTHENTICATION
window.handleLogin = async function() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    if (!emailInput || !passInput) return;
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    if (!email || !pass) { alert("Please enter both email and password."); return; }
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Login failed: " + error.message);
    else if (data.user) { 
        currentUserEmail = data.user.email; 
        await fetchQuestionsAndStart(); 
    }
};

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

// PREMIUM SOLUTIONS PAGE DESIGN
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
                    background: #020617; 
                    color: #f8fafc; 
                    margin: 0; 
                    padding: 40px 20px; 
                    line-height: 1.6;
                }
                .glass-card {
                    max-width: 800px;
                    margin: 0 auto;
                    background: rgba(15, 23, 42, 0.8);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 40px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .header {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .badge {
                    background: #38bdf8;
                    color: #020617;
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-weight: 800;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                }
                .q-text { font-size: 1.25rem; font-weight: 600; margin: 20px 0; color: #e2e8f0; }
                .sol-content { 
                    background: rgba(255, 255, 255, 0.03); 
                    padding: 25px; 
                    border-radius: 16px; 
                    border-left: 4px solid #38bdf8;
                    font-size: 1.1rem;
                    color: #cbd5e1;
                }
                .correct-ans {
                    margin-top: 30px;
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: #4ade80;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
            </style>
        </head>
        <body>
            <div class="glass-card">
                <div class="header">
                    <span class="badge">Question ${idx + 1} Analysis</span>
                    <div class="q-text">${q.q}</div>
                </div>
                <div style="font-size: 0.8rem; text-transform: uppercase; color: #64748b; margin-bottom: 10px; letter-spacing: 1px;">Detailed Explanation</div>
                <div class="sol-content">${q.solution}</div>
                <div class="correct-ans">
                    <span style="color: #64748b; font-size: 0.9rem; font-weight: 400;">Final Answer:</span> ${q.correct}
                </div>
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
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                <td style="padding:16px; font-weight:bold; color:#cbd5e1;">${i+1}</td>
                <td style="padding:16px; text-align:left; color:#f8fafc; font-size:0.95rem;">${q.q}</td>
                <td style="padding:16px;"><span style="padding:6px 14px; border-radius:30px; font-size:0.85rem; font-weight:700; background:${isCorrect ? '#22c55e33' : '#ef444433'}; color:${isCorrect ? '#4ade80' : '#f87171'}; border:1px solid ${isCorrect ? '#4ade8055' : '#f8717155'};">${userAnswers[i] || 'N/A'}</span></td>
                <td style="padding:16px; font-weight:bold; color:#38bdf8;">${q.correct}</td>
                <td style="padding:16px;">
                    <button onclick="openDetailedSolution(${i})" 
                        style="background:rgba(56, 189, 248, 0.1); border:1px solid #38bdf8; color:#38bdf8; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:600; transition:0.3s;" 
                        onmouseover="this.style.background='#38bdf8'; this.style.color='#020617'; this.style.boxShadow='0 0 15px rgba(56,189,248,0.4)'" 
                        onmouseout="this.style.background='rgba(56,189,248,0.1)'; this.style.color='#38bdf8'; this.style.boxShadow='none'">
                        Solution
                    </button>
                </td>
            </tr>`;
    }).join('');

    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    
    document.body.style.background = "#020617";
    document.getElementById('result-screen').innerHTML = `
        <div style="max-width: 1200px; margin: 40px auto; padding: 20px; font-family: 'Inter', system-ui, sans-serif;">
            <div style="background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 50px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); margin-bottom: 40px;">
                <h1 style="color:#f8fafc; font-size: 2.5rem; margin-bottom: 10px; font-weight: 800; letter-spacing: -1px;">Assessment Result</h1>
                <div style="display:flex; justify-content:center; gap:60px;">
                    <div><div style="font-size:4rem; font-weight:900; color:#38bdf8; line-height:1;">${score}</div><div style="color:#64748b; font-size:0.8rem; text-transform:uppercase; letter-spacing:2px; margin-top:10px;">Score / ${total}</div></div>
                    <div style="width:1px; background:rgba(255,255,255,0.1);"></div>
                    <div><div style="font-size:4rem; font-weight:900; color:#4ade80; line-height:1;">${((score/total)*100).toFixed(0)}%</div><div style="color:#64748b; font-size:0.8rem; text-transform:uppercase; letter-spacing:2px; margin-top:10px;">Accuracy</div></div>
                </div>
            </div>
            
            <div style="background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; overflow: hidden;">
                <table style="width:100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <th style="padding:20px; color:#94a3b8; font-size:0.75rem; text-transform:uppercase; letter-spacing:1.5px;">#</th>
                            <th style="padding:20px; color:#94a3b8; font-size:0.75rem; text-transform:uppercase; letter-spacing:1.5px; text-align:left;">Question Content</th>
                            <th style="padding:20px; color:#94a3b8; font-size:0.75rem; text-transform:uppercase; letter-spacing:1.5px;">Your Answer</th>
                            <th style="padding:20px; color:#94a3b8; font-size:0.75rem; text-transform:uppercase; letter-spacing:1.5px;">Reference</th>
                            <th style="padding:20px; color:#94a3b8; font-size:0.75rem; text-transform:uppercase; letter-spacing:1.5px;">Review</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            
            <div style="text-align:center; margin-top:50px;">
                <button onclick="location.reload()" style="background: #38bdf8; color: #020617; border: none; padding: 18px 45px; border-radius: 14px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: 0.2s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 10px 20px rgba(56, 189, 248, 0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">Exit to Portal</button>
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
