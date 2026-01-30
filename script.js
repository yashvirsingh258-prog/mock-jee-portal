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
    if (data) testSelect.innerHTML = data.map(row => `<option value="${row.test_name}">${row.test_name}</option>`).join('');
};

async function fetchQuestionsAndStart() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data } = await supabaseClient.from('questions_table').select('question_data').eq('subject', sub).eq('test_name', testName).single();
    if (data) { activeBank = data.question_data; startExam(); }
}

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
    const q = activeBank[currentIndex];
    document.getElementById('question-area').innerHTML = `
        <div class="question-card">
            <span class="q-num-badge">Question ${currentIndex + 1}</span>
            <div style="font-size: 1.15rem; line-height: 1.6; margin-bottom: 25px;">${q.q}</div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${q.type === 'mcq' ? q.options.map(opt => `
                    <label style="padding: 15px; border: 1px solid ${userAnswers[currentIndex] === opt ? 'var(--primary)' : '#e2e8f0'}; border-radius: 8px; cursor: pointer; background: ${userAnswers[currentIndex] === opt ? '#f0f7ff' : '#fff'}; transition: 0.2s;">
                        <input type="radio" name="answer" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> ${opt}
                    </label>`).join('') :
                    `<input type="text" style="padding:15px; border-radius:8px; border:1px solid #ccc;" oninput="saveAnswer(this.value)" value="${userAnswers[currentIndex]}">`
                }
            </div>
        </div>`;
    updateStats(); updatePaletteUI();
    if (window.MathJax) MathJax.typesetPromise();
};

window.saveAnswer = (val) => { userAnswers[currentIndex] = val; saveToCloud(); };

window.saveAndNext = () => {
    if (userAnswers[currentIndex] !== "") { confirmedAnswered[currentIndex] = true; markedForReview[currentIndex] = false; }
    if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); }
    saveToCloud();
};

window.prevQuestion = () => {
    if (currentIndex > 0) { currentIndex--; loadQuestion(); saveToCloud(); }
};

window.markForReview = () => {
    markedForReview[currentIndex] = true;
    if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); }
    else updatePaletteUI();
    saveToCloud();
};

window.clearResponse = () => {
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

window.confirmSubmit = () => { if (confirm("Submit?")) finalSubmission(); };

function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const rows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i] == q.correct;
        if (isCorrect) score++;
        return `<tr>
            <td style="font-weight:bold;">${i+1}</td>
            <td>${q.q}</td>
            <td><span style="color:${isCorrect ? 'green' : 'red'}; font-weight:bold;">${userAnswers[i] || 'N/A'}</span></td>
            <td style="font-weight:bold; color:var(--primary);">${q.correct}</td>
            <td><button class="btn-pri" style="height:35px; padding:0 15px;" onclick="openDetailedSolution(${i})">Solution</button></td>
        </tr>`;
    }).join('');

    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    document.getElementById('score-val').innerHTML = `<div class="score-circle"><span class="num">${score}</span><span style="font-size:0.8rem; color:#64748b;">Out of ${activeBank.length}</span></div>`;
    document.getElementById('review-panel').innerHTML = `<table class="result-table"><thead><tr><th>Q.No</th><th>Question</th><th>Your Ans</th><th>Correct</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
    if (window.MathJax) MathJax.typesetPromise();
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

document.addEventListener('DOMContentLoaded', updateTestNames);
