const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

window.handleLogin = async function() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
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

async function saveToCloud() {
    if (!currentUserEmail) return;
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const payload = { 
        username: currentUserEmail, subject: sub, test_name: testName, current_index: currentIndex,
        user_answers: JSON.parse(JSON.stringify(userAnswers)),
        confirmed_answered: JSON.parse(JSON.stringify(confirmedAnswered)),
        marked_for_review: JSON.parse(JSON.stringify(markedForReview)),
        time_left: timeLeft, is_finished: false
    };
    await supabaseClient.from('student_progress').upsert(payload, { onConflict: 'username, subject, test_name' });
}

window.setView = function(view) {
    document.getElementById('login-screen').style.display = (view === 'login') ? 'flex' : 'none';
    document.getElementById('exam-header').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('quiz-container').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('result-screen').style.display = (view === 'result') ? 'block' : 'none';
};

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
    
    document.getElementById('display-subject').innerText = `${sub.toUpperCase()} - ${testName}`;
    setView('exam'); renderPalette(); startTimer(); loadQuestion();
};

window.loadQuestion = function() {
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    area.innerHTML = `
        <div style="padding: 20px 50px;">
            <div style="margin-bottom: 20px;"><span style="background: var(--primary); color: white; padding: 5px 15px; border-radius: 4px;">Question ${currentIndex + 1}</span></div>
            <div style="font-size: 1.2rem; margin-bottom: 25px;">${qData.q}</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${qData.type === 'mcq' ? 
                    qData.options.map(opt => `
                        <label class="option-box" style="border-color: ${userAnswers[currentIndex] === opt ? 'var(--primary)' : '#eee'}">
                            <input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> ${opt}
                        </label>`).join('') :
                    `<input type="text" class="num-input" oninput="saveAnswer(this.value)" value="${userAnswers[currentIndex]}">`
                }
            </div>
        </div>`;
    updateStats(); updatePaletteUI();
    if (window.MathJax) MathJax.typesetPromise();
};

window.saveAnswer = function(val) { userAnswers[currentIndex] = val; saveToCloud(); };
window.saveAndNext = function() {
    if (userAnswers[currentIndex] !== "") { confirmedAnswered[currentIndex] = true; markedForReview[currentIndex] = false; }
    else { confirmedAnswered[currentIndex] = false; }
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
        document.getElementById('time').innerText = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
        if (timeLeft <= 0) finalSubmission();
    }, 1000);
}

window.confirmSubmit = function() { if (confirm("Submit examination?")) finalSubmission(); };

function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `<tr><td>${i+1}</td><td>${q.q}</td><td>${userAnswers[i] || 'N/A'}</td><td>${q.correct}</td><td><button class="btn-pri" style="padding:5px 10px; font-size:0.8rem;" onclick="openDetailedSolution(${i})">Solution</button></td></tr>`;
    }).join('');

    setView('result');
    document.getElementById('score-val').innerHTML = `<h2>Your Score: ${score} / ${activeBank.length}</h2>`;
    document.getElementById('review-panel').innerHTML = `<table class="result-table"><thead><tr><th>Q.No</th><th>Question</th><th>Your Ans</th><th>Correct</th><th>Action</th></tr></thead><tbody>${tableRows}</tbody></table>`;
}

window.finalSubmission = async function() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    await supabaseClient.from('student_progress').upsert({ username: currentUserEmail, subject: sub, test_name: testName, is_finished: true, user_answers: [...userAnswers], time_left: 0 }, { onConflict: 'username, subject, test_name' });
    showFinalResultOnly();
};

function renderPalette() {
    document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `<div id="dot-${i}" class="dot" onclick="jumpTo(${i})">${i+1}</div>`).join('');
}
window.jumpTo = function(i) { currentIndex = i; loadQuestion(); saveToCloud(); };

function updatePaletteUI() {
    activeBank.forEach((_, i) => {
        const dot = document.getElementById(`dot-${i}`);
        if (!dot) return;
        dot.className = "dot";
        if (markedForReview[i]) dot.classList.add("review");
        else if (confirmedAnswered[i]) dot.classList.add("answered");
        else if (userAnswers[i] === "" && confirmedAnswered[i] === false) { /* Not Visited */ }
        if (i === currentIndex) dot.classList.add("active");
    });
}

function updateStats() {
    const ans = confirmedAnswered.filter(x => x).length;
    document.getElementById('count-ans').innerText = ans;
    document.getElementById('count-not-ans').innerText = activeBank.length - ans;
}

document.addEventListener('DOMContentLoaded', updateTestNames);
