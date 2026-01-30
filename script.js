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

// 4. DYNAMIC FETCHING LOGIC
window.updateTestNames = async function() {
    const sub = document.getElementById('subject-select').value;
    const testSelect = document.getElementById('test-name-select');
    
    const { data, error } = await supabaseClient
        .from('questions_table')
        .select('test_name')
        .eq('subject', sub);

    if (error) {
        console.error("Error fetching test names:", error);
        return;
    }

    if (testSelect) {
        testSelect.innerHTML = data.map(row => 
            `<option value="${row.test_name}">${row.test_name}</option>`
        ).join('');
    }
};

async function fetchQuestionsAndStart() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;

    const { data, error } = await supabaseClient
        .from('questions_table')
        .select('question_data')
        .eq('subject', sub)
        .eq('test_name', testName)
        .single();

    if (error || !data) {
        alert("Could not load test questions. Please check database.");
        return;
    }

    activeBank = data.question_data; 
    startExam();
}

// 5. CLOUD PERSISTENCE
async function saveToCloud() {
    if (!currentUserEmail) return;
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const payload = { 
        username: currentUserEmail, subject: sub, test_name: testName, 
        current_index: currentIndex,
        user_answers: JSON.parse(JSON.stringify(userAnswers)),
        confirmed_answered: JSON.parse(JSON.stringify(confirmedAnswered)),
        marked_for_review: JSON.parse(JSON.stringify(markedForReview)),
        time_left: timeLeft, is_finished: false
    };
    await supabaseClient.from('student_progress').upsert(payload, { onConflict: 'username, subject, test_name' });
}

// 6. EXAM LOGIC
window.setView = function(view) {
    document.getElementById('login-screen').style.display = (view === 'login') ? 'flex' : 'none';
    document.getElementById('exam-header').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('quiz-container').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('result-screen').style.display = (view === 'result') ? 'block' : 'none';
};

window.startExam = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    
    const { data } = await supabaseClient.from('student_progress')
        .select('*')
        .eq('username', currentUserEmail)
        .eq('subject', sub)
        .eq('test_name', testName)
        .maybeSingle();

    if (data && data.is_finished === true) {
        alert("This test has already been submitted.");
        userAnswers = data.user_answers || [];
        showFinalResultOnly(); 
        return;
    }

    if (data && confirm("Resume existing progress?")) {
        currentIndex = data.current_index;
        userAnswers = data.user_answers || new Array(activeBank.length).fill("");
        confirmedAnswered = data.confirmed_answered || new Array(activeBank.length).fill(false);
        markedForReview = data.marked_for_review || new Array(activeBank.length).fill(false);
        timeLeft = data.time_left;
    } else {
        userAnswers = new Array(activeBank.length).fill("");
        confirmedAnswered = new Array(activeBank.length).fill(false);
        markedForReview = new Array(activeBank.length).fill(false);
        timeLeft = 40 * 60; currentIndex = 0;
    }
    
    document.getElementById('display-subject').innerText = `${sub.toUpperCase()} - ${testName}`;
    setView('exam'); renderPalette(); startTimer(); loadQuestion();
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
window.markForReview = function() {
    markedForReview[currentIndex] = true;
    if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); }
    else { updatePaletteUI(); }
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
        if (timeLeft % 30 === 0) saveToCloud();
        document.getElementById('time').innerText = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
        if (timeLeft <= 0) finalSubmission();
    }, 1000);
}

window.confirmSubmit = function() { if (confirm("Submit examination?")) finalSubmission(); };

// SOLUTION WINDOW LOGIC - Updated for MathJax Support
window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    const content = `
        <html>
        <head>
            <title>Solution - Q${idx+1}</title>
            <script>
                window.MathJax = {
                    tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
                };
            </script>
            <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            <style>
                body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; line-height: 1.6; }
                .container { max-width: 800px; margin: auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                h2 { color: #0b4a8f; margin-bottom: 24px; font-weight: 700; }
                .q-box { background:#f1f5f9; padding:20px; border-radius: 12px; border-left:6px solid #0b4a8f; font-weight: 500; margin-bottom: 30px;}
                .step { margin-bottom: 20px; padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
                .correct-ans { color:#10b981; font-size: 1.25rem; font-weight: 700; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Question ${idx+1} Detailed Solution</h2>
                <div class="q-box">${q.q}</div>
                <div>${q.solution.split('<br>').map(s => `<div class="step">${s}</div>`).join('')}</div>
                <div class="correct-ans">Correct Answer: ${q.correct}</div>
            </div>
        </body>
        </html>`;
    solTab.document.write(content);
    solTab.document.close();
};

// 7. MODERN SUMMARY VIEW
function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const totalQuestions = activeBank.length;
    
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:18px; text-align:center; color:#64748b; font-weight:600;">${i+1}</td>
                <td style="padding:18px; text-align:left; color:#334155; font-size:0.95rem;">${q.q}</td>
                <td style="padding:18px; text-align:center;">
                    <span style="padding:6px 14px; border-radius:20px; font-weight:700; font-size:0.85rem; background:${isCorrect ? '#d1fae5' : '#fee2e2'}; color:${isCorrect ? '#065f46' : '#991b1b'};">
                        ${userAnswers[i] || 'N/A'}
                    </span>
                </td>
                <td style="padding:18px; text-align:center; font-weight:700; color:#0b4a8f;">${q.correct}</td>
                <td style="padding:18px; text-align:center;">
                    <button onclick="openDetailedSolution(${i})" style="border:1.5px solid #0b4a8f; color:#0b4a8f; padding:8px 16px; border-radius:8px; cursor:pointer; background:white; font-weight:600; font-size:0.8rem; transition: all 0.2s ease;" onmouseover="this.style.background='#0b4a8f'; this.style.color='white'">View Solution</button>
                </td>
            </tr>`;
    }).join('');

    const percentage = ((score / totalQuestions) * 100).toFixed(2);
    setView('result');

    // Retaining your premium sticker design
    document.getElementById('score-val').innerHTML = `
        <div style="display: flex; justify-content: center; margin-bottom: 40px;">
            <div style="background: linear-gradient(135deg, #0b4a8f 0%, #1e3a5f 100%); color: white; padding: 30px 60px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); text-align: center; min-width: 320px;">
                <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; font-weight:600; opacity: 0.8;">Test Performance</div>
                <div style="font-size: 3.5rem; font-weight: 800; margin: 0; line-height: 1;">${score} <span style="font-size: 1.5rem; opacity: 0.6;">/ ${totalQuestions}</span></div>
                <div style="margin-top: 20px; font-size: 1.1rem; background: rgba(255,255,255,0.1); display: inline-block; padding: 10px 24px; border-radius: 50px; font-weight:600;">
                    Accuracy: ${percentage}%
                </div>
            </div>
        </div>`;

    document.getElementById('review-panel').innerHTML = `
        <div style="background: white; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
            <table style="width:100%; border-collapse:collapse; font-family: 'Inter', sans-serif;">
                <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding:20px; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Q.No</th>
                        <th style="padding:20px; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; text-align:left;">Question Description</th>
                        <th style="padding:20px; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Your Response</th>
                        <th style="padding:20px; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Correct</th>
                        <th style="padding:20px; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">Action</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;

    if (window.MathJax) setTimeout(() => { MathJax.typesetPromise([document.getElementById('review-panel')]); }, 200);
}

window.finalSubmission = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { error } = await supabaseClient.from('student_progress').upsert({ 
        username: currentUserEmail, subject: sub, test_name: testName, is_finished: true, 
        user_answers: [...userAnswers], time_left: 0
    }, { onConflict: 'username, subject, test_name' });
    if (!error) showFinalResultOnly();
};

// UI HELPERS
function renderPalette() {
    document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `
        <div id="dot-${i}" onclick="jumpTo(${i})" style="width:35px; height:35px; border:1px solid #ccc; display:inline-block; margin:2px; cursor:pointer; text-align:center; line-height:35px; border-radius:4px; font-weight:600; font-size:0.8rem;">${i+1}</div>`).join('');
}
window.jumpTo = function(i) { currentIndex = i; loadQuestion(); saveToCloud(); };
function updatePaletteUI() {
    activeBank.forEach((_, i) => {
        const dot = document.getElementById(`dot-${i}`);
        if (!dot) return;
        dot.style.background = markedForReview[i] ? "#6f42c1" : (confirmedAnswered[i] ? "#198754" : "#fff");
        dot.style.color = (markedForReview[i] || confirmedAnswered[i]) ? "#fff" : "#333";
        dot.style.border = (i === currentIndex) ? "2px solid #0b4a8f" : "1px solid #ccc";
    });
}
function updateStats() {
    const ans = confirmedAnswered.filter(x => x).length;
    document.getElementById('count-ans').innerText = ans;
    document.getElementById('count-not-ans').innerText = activeBank.length - ans;
}

document.addEventListener('DOMContentLoaded', () => { 
    updateTestNames(); 
});
