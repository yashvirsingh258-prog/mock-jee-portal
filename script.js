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

// 4. DYNAMIC FETCHING LOGIC (STRICTLY FROM TABLE)
window.updateTestNames = async function() {
    const sub = document.getElementById('subject-select').value;
    const testSelect = document.getElementById('test-name-select');
    
    const { data, error } = await supabaseClient
        .from('questions_table')
        .select('test_name')
        .eq('subject', sub);

    if (!error && testSelect) {
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
        alert("Could not load test questions.");
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
        username: currentUserEmail, 
        subject: sub, 
        test_name: testName, 
        current_index: currentIndex,
        user_answers: [...userAnswers],
        confirmed_answered: [...confirmedAnswered],
        marked_for_review: [...markedForReview],
        time_left: timeLeft, 
        is_finished: false
    };

    await supabaseClient.from('student_progress').upsert(payload, { 
        onConflict: 'username, subject, test_name' 
    });
}

// 6. EXAM LOGIC
window.startExam = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    
    const { data } = await supabaseClient.from('student_progress')
        .select('*')
        .eq('username', currentUserEmail)
        .eq('subject', sub)
        .eq('test_name', testName)
        .maybeSingle();

    if (data && data.is_finished) {
        userAnswers = data.user_answers;
        showFinalResultOnly(); 
        return;
    }

    if (data && confirm("Resume existing progress?")) {
        currentIndex = data.current_index;
        userAnswers = data.user_answers;
        confirmedAnswered = data.confirmed_answered;
        markedForReview = data.marked_for_review;
        timeLeft = data.time_left;
    } else {
        userAnswers = new Array(activeBank.length).fill("");
        confirmedAnswered = new Array(activeBank.length).fill(false);
        markedForReview = new Array(activeBank.length).fill(false);
    }
    
    document.getElementById('exam-header').style.display = 'flex';
    document.getElementById('quiz-container').style.display = 'flex';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('display-subject').innerText = `${sub.toUpperCase()} - ${testName}`;
    
    renderPalette(); 
    startTimer(); 
    loadQuestion();
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
    updateStats(); 
    updatePaletteUI();
    if (window.MathJax) MathJax.typesetPromise();
};

window.saveAnswer = function(val) { userAnswers[currentIndex] = val; saveToCloud(); };

window.saveAndNext = function() {
    if (userAnswers[currentIndex] !== "") { 
        confirmedAnswered[currentIndex] = true; 
        markedForReview[currentIndex] = false; 
    }
    if (currentIndex < activeBank.length - 1) { 
        currentIndex++; 
        loadQuestion(); 
    }
    saveToCloud();
};

// FIXED: Previous button logic
window.prevQuestion = function() {
    if (currentIndex > 0) {
        currentIndex--;
        loadQuestion();
        saveToCloud();
    }
};

window.markForReview = function() {
    markedForReview[currentIndex] = true;
    if (currentIndex < activeBank.length - 1) { 
        currentIndex++; 
        loadQuestion(); 
    } else { 
        updatePaletteUI(); 
    }
    saveToCloud();
};

window.clearResponse = function() {
    userAnswers[currentIndex] = ""; 
    confirmedAnswered[currentIndex] = false; 
    markedForReview[currentIndex] = false;
    loadQuestion(); 
    saveToCloud();
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

// UPDATED: Solutions window with MathJax support (Strict Layout)
window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    solTab.document.write(`
        <html>
        <head>
            <title>Detailed Solution - Q${idx+1}</title>
            <script>
                window.MathJax = { tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] } };
            </script>
            <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; background: #f4f7f9; }
                .container { max-width: 800px; margin: auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #ccc; }
                .q-box { background: #f0f4f8; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 5px solid #0b4a8f; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Question ${idx+1} Solution</h2>
                <div class="q-box"><strong>Question:</strong><br>${q.q}</div>
                <div><strong>Step-by-Step Solution:</strong><br>${q.solution}</div>
                <div style="margin-top:20px; color: #198754; font-weight: bold;">Correct Answer: ${q.correct}</div>
            </div>
        </body>
        </html>
    `);
    solTab.document.close();
};

// RESTORED: Original Summary Look and Feel
function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const total = activeBank.length;
    
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `
            <tr style="border-bottom: 1px solid #ccc;">
                <td style="padding:10px; text-align:center;">${i+1}</td>
                <td style="padding:10px; text-align:left;">${q.q}</td>
                <td style="padding:10px; text-align:center; font-weight:bold; color:${isCorrect ? '#198754' : '#d32f2f'};">${userAnswers[i] || 'N/A'}</td>
                <td style="padding:10px; text-align:center; font-weight:bold; color:#0b4a8f;">${q.correct}</td>
                <td style="padding:10px; text-align:center;">
                    <button onclick="openDetailedSolution(${i})" style="cursor:pointer; padding:5px 10px;">View Solution</button>
                </td>
            </tr>`;
    }).join('');

    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    document.getElementById('result-screen').innerHTML = `
        <div style="max-width: 1000px; margin: 20px auto; padding: 20px; border: 1px solid #ccc; background: #fff;">
            <h1 style="text-align:center; color:#0b4a8f;">Test Summary</h1>
            <h2 style="text-align:center;">Final Score: ${score} / ${total}</h2>
            <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                <thead>
                    <tr style="background:#eee;">
                        <th style="padding:10px; border:1px solid #ccc;">#</th>
                        <th style="padding:10px; border:1px solid #ccc; text-align:left;">Question</th>
                        <th style="padding:10px; border:1px solid #ccc;">Your Answer</th>
                        <th style="padding:10px; border:1px solid #ccc;">Correct Answer</th>
                        <th style="padding:10px; border:1px solid #ccc;">Action</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div style="text-align:center; margin-top:30px;">
                <button onclick="location.reload()" style="padding:10px 20px; font-size:1rem; cursor:pointer;">Back to Dashboard</button>
            </div>
        </div>`;
    if (window.MathJax) MathJax.typesetPromise();
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
        <div id="dot-${i}" onclick="jumpTo(${i})" style="width:35px; height:35px; border:1px solid #ccc; display:inline-block; margin:2px; cursor:pointer; text-align:center; line-height:35px; border-radius:4px; font-weight:bold;">${i+1}</div>`).join('');
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

document.addEventListener('DOMContentLoaded', updateTestNames);
