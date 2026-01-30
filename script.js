// 1. INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. STATE MANAGEMENT
let activeBank = [], 
    currentIndex = 0, 
    userAnswers = [], 
    confirmedAnswered = [], 
    markedForReview = [], 
    timeLeft = 40 * 60, 
    timerActive = false;
let currentUserEmail = ""; 

// 3. AUTHENTICATION & INITIALIZATION
window.handleLogin = async function() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    
    if (!email || !pass) { 
        alert("Please enter both email and password."); 
        return; 
    }
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    
    if (error) {
        alert("Login failed: " + error.message);
    } else if (data.user) { 
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

    if (error || !data) {
        alert("Could not load test questions.");
        return;
    }
    activeBank = data.question_data; 
    startExam();
}

// 5. PERSISTENCE
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

// 6. EXAM LOGIC & UI (RESTORED ALIGNMENT)
window.startExam = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    
    const { data } = await supabaseClient.from('student_progress').select('*')
        .eq('username', currentUserEmail).eq('subject', sub).eq('test_name', testName).maybeSingle();

    if (data && data.is_finished) {
        userAnswers = data.user_answers;
        showFinalResultOnly(); 
        return;
    }

    if (data && confirm("Resume progress?")) {
        currentIndex = data.current_index; userAnswers = data.user_answers;
        confirmedAnswered = data.confirmed_answered; markedForReview = data.marked_for_review;
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
    
    // Using internal flex column to keep Question, Options, and Nav in order
    area.innerHTML = `
        <div class="question-container-inner" style="display:flex; flex-direction:column; height:100%;">
            <div style="margin-bottom: 20px;">
                <span class="q-type-label">Question ${currentIndex + 1}</span>
            </div>
            
            <div class="question-text" style="font-size: 1.2rem; margin-bottom: 30px; line-height: 1.6;">
                ${qData.q}
            </div>

            <div class="options-list" style="flex-grow: 1; display: flex; flex-direction: column; gap: 12px;">
                ${qData.type === 'mcq' ? 
                    qData.options.map((opt, idx) => `
                        <label class="option-box ${userAnswers[currentIndex] === opt ? 'selected' : ''}" 
                               style="display:flex; align-items:center; gap:15px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; cursor: pointer;">
                            <input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}>
                            <span>${opt}</span>
                        </label>`).join('') :
                    `<input type="text" class="num-input" placeholder="Type Answer Here" oninput="saveAnswer(this.value)" value="${userAnswers[currentIndex]}">`
                }
            </div>

            <div class="nav-bar" style="margin-top: 30px; display: flex; gap: 10px; border-top: 1px solid #eee; padding-top: 20px;">
                <button class="btn-sec" onclick="prevQuestion()">Previous</button>
                <button class="btn-rev" onclick="markForReview()">Mark for Review</button>
                <button class="btn-clear" onclick="clearResponse()">Clear Response</button>
                <button class="btn-pri" onclick="saveAndNext()">Save & Next</button>
            </div>
        </div>`;
    
    updateStats(); 
    updatePaletteUI();
    if (window.MathJax) MathJax.typesetPromise();
};

window.saveAnswer = (val) => { userAnswers[currentIndex] = val; saveToCloud(); };
window.prevQuestion = () => { if (currentIndex > 0) { currentIndex--; loadQuestion(); saveToCloud(); } };
window.saveAndNext = () => {
    if (userAnswers[currentIndex] !== "") { confirmedAnswered[currentIndex] = true; markedForReview[currentIndex] = false; }
    if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); }
    saveToCloud();
};
window.markForReview = () => {
    markedForReview[currentIndex] = true;
    if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } else updatePaletteUI();
    saveToCloud();
};
window.clearResponse = () => {
    userAnswers[currentIndex] = ""; confirmedAnswered[currentIndex] = false; markedForReview[currentIndex] = false;
    loadQuestion(); saveToCloud();
};

// 7. TIMER & SUBMISSION
function startTimer() {
    timerActive = true;
    const interval = setInterval(() => {
        if (!timerActive) { clearInterval(interval); return; }
        timeLeft--;
        document.getElementById('time').innerText = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
        if (timeLeft <= 0) finalSubmission();
    }, 1000);
}

window.confirmSubmit = () => { if (confirm("Final Submit?")) finalSubmission(); };

async function finalSubmission() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    await supabaseClient.from('student_progress').upsert({ 
        username: currentUserEmail, subject: sub, test_name: testName, is_finished: true, 
        user_answers: [...userAnswers], time_left: 0
    }, { onConflict: 'username, subject, test_name' });
    showFinalResultOnly();
}

// 8. RESULTS (PREMIUM CARD DESIGN)
function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const total = activeBank.length;
    
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:15px; text-align:center; font-weight:bold;">${i+1}</td>
                <td style="padding:15px;">${q.q}</td>
                <td style="padding:15px; text-align:center; color:${isCorrect ? 'green':'red'}; font-weight:bold;">${userAnswers[i] || 'N/A'}</td>
                <td style="padding:15px; text-align:center; font-weight:bold;">${q.correct}</td>
                <td style="padding:15px; text-align:center;"><button class="btn-pri" onclick="openDetailedSolution(${i})">Solution</button></td>
            </tr>`;
    }).join('');

    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    document.getElementById('result-screen').innerHTML = `
        <div style="max-width: 900px; margin: 50px auto; background:white; padding:40px; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
            <div style="text-align:center; margin-bottom:40px;">
                <h1 style="color:var(--primary);">Test Completed</h1>
                <div style="font-size:3rem; font-weight:800;">Score: ${score} / ${total}</div>
            </div>
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background:#f8fafc;">
                    <tr><th>#</th><th style="text-align:left;">Question</th><th>Your Ans</th><th>Correct</th><th>Action</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
    if (window.MathJax) MathJax.typesetPromise();
}

// 9. PALETTE UI (STRICT JEE SHAPES)
function renderPalette() {
    document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `
        <div id="dot-${i}" class="dot" onclick="jumpTo(${i})">${i+1}</div>`).join('');
}

window.jumpTo = (i) => { currentIndex = i; loadQuestion(); saveToCloud(); };

function updatePaletteUI() {
    activeBank.forEach((_, i) => {
        const dot = document.getElementById(`dot-${i}`);
        if (!dot) return;
        dot.className = "dot";
        if (markedForReview[i]) dot.classList.add("review");
        else if (confirmedAnswered[i]) dot.classList.add("answered");
        if (i === currentIndex) dot.classList.add("active");
    });
}

function updateStats() {
    document.getElementById('count-ans').innerText = confirmedAnswered.filter(x => x).length;
    document.getElementById('count-not-ans').innerText = activeBank.length - confirmedAnswered.filter(x => x).length;
}

document.addEventListener('DOMContentLoaded', updateTestNames);
