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
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    if (!email || !pass) { alert("Please enter credentials."); return; }
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Login failed.");
    else if (data.user) { 
        currentUserEmail = data.user.email; 
        await fetchQuestionsAndStart(); 
    }
};

window.updateTestNames = async function() {
    const sub = document.getElementById('subject-select').value;
    const testSelect = document.getElementById('test-name-select');
    const { data } = await supabaseClient.from('questions_table').select('test_name').eq('subject', sub);
    if (data && testSelect) {
        testSelect.innerHTML = data.map(row => `<option value="${row.test_name}">${row.test_name}</option>`).join('');
    }
};

async function fetchQuestionsAndStart() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data, error } = await supabaseClient.from('questions_table').select('question_data').eq('subject', sub).eq('test_name', testName).single();

    if (error || !data) { alert("Could not load questions."); return; }
    activeBank = data.question_data; 
    startExam();
}

// 4. PERSISTENCE
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

// 5. EXAM UI LOGIC
window.startExam = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    
    const { data } = await supabaseClient.from('student_progress').select('*')
        .eq('username', currentUserEmail).eq('subject', sub).eq('test_name', testName).maybeSingle();

    if (data && data.is_finished) { userAnswers = data.user_answers; showFinalResultOnly(); return; }

    if (data && confirm("Resume existing progress?")) {
        currentIndex = data.current_index; userAnswers = data.user_answers;
        confirmedAnswered = data.confirmed_answered; markedForReview = data.marked_for_review;
        timeLeft = data.time_left;
    } else {
        userAnswers = new Array(activeBank.length).fill("");
        confirmedAnswered = new Array(activeBank.length).fill(false);
        markedForReview = new Array(activeBank.length).fill(false);
    }
    
    document.getElementById('exam-header').style.display = 'flex';
    document.getElementById('quiz-container').style.display = 'flex'; // Uses .main-layout from CSS
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('display-subject').innerText = `${sub.toUpperCase()} - ${testName}`;
    
    renderPalette(); 
    startTimer(); 
    loadQuestion();
};

window.loadQuestion = function() {
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    
    // Clean structure using your CSS classes for proper alignment
    area.innerHTML = `
        <div class="question-wrapper">
            <span class="q-type-label">Question ${currentIndex + 1}</span>
            <div class="question-text" style="font-size: 1.2rem; margin: 20px 0;">${qData.q}</div>
            
            <div class="options-container">
                ${qData.type === 'mcq' ? 
                    qData.options.map(opt => `
                        <label class="option-box" style="border-color: ${userAnswers[currentIndex] === opt ? 'var(--primary)' : '#eee'}; background: ${userAnswers[currentIndex] === opt ? '#f0f7ff' : '#fff'};">
                            <input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> ${opt}
                        </label>`).join('') :
                    `<input type="text" class="num-input" placeholder="Type answer..." oninput="saveAnswer(this.value)" value="${userAnswers[currentIndex]}">`
                }
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

// 6. TIMER & PALETTE
function startTimer() {
    timerActive = true;
    setInterval(() => {
        if (!timerActive) return;
        timeLeft--;
        document.getElementById('time').innerText = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
        if (timeLeft <= 0) finalSubmission();
    }, 1000);
}

function renderPalette() {
    document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `<div id="dot-${i}" class="dot" onclick="jumpTo(${i})">${i+1}</div>`).join('');
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
    const ans = confirmedAnswered.filter(x => x).length;
    document.getElementById('count-ans').innerText = ans;
    document.getElementById('count-not-ans').innerText = activeBank.length - ans;
}

window.confirmSubmit = () => { if (confirm("Submit test?")) finalSubmission(); };

async function finalSubmission() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    await supabaseClient.from('student_progress').upsert({ 
        username: currentUserEmail, subject: sub, test_name: testName, 
        is_finished: true, user_answers: [...userAnswers], time_left: 0
    }, { onConflict: 'username, subject, test_name' });
    location.reload(); // Or trigger result view
}

document.addEventListener('DOMContentLoaded', updateTestNames);
