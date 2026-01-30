const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

window.handleLogin = async function() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    if (!email || !pass) { alert("Enter credentials"); return; }
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Login failed.");
    else if (data.user) { currentUserEmail = data.user.email; await fetchQuestionsAndStart(); }
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
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    
    area.innerHTML = `
        <div class="question-card">
            <div style="margin-bottom: 20px;">
                <span style="background: var(--primary); color: white; padding: 5px 12px; border-radius: 4px; font-weight: bold;">Question ${currentIndex + 1}</span>
            </div>
            <div style="font-size: 1.2rem; margin-bottom: 25px; line-height: 1.6;">${qData.q}</div>
            <div style="display: flex; flex-direction: column;">
                ${qData.type === 'mcq' ? 
                    qData.options.map(opt => `
                        <label class="option-box ${userAnswers[currentIndex] === opt ? 'selected' : ''}">
                            <input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> ${opt}
                        </label>`).join('') :
                    `<input type="text" class="num-input" style="padding:15px; border-radius:6px; border:1px solid #ccc;" placeholder="Enter numeric value" oninput="saveAnswer(this.value)" value="${userAnswers[currentIndex]}">`
                }
            </div>
        </div>`;
    
    updateStats(); updatePaletteUI();
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

function startTimer() {
    timerActive = true;
    const interval = setInterval(() => {
        if (!timerActive) { clearInterval(interval); return; }
        timeLeft--;
        document.getElementById('time').innerText = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
        if (timeLeft <= 0) finalSubmission();
    }, 1000);
}

window.confirmSubmit = () => { if (confirm("Submit exam?")) finalSubmission(); };

function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const total = activeBank.length;
    
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i] == q.correct;
        if (isCorrect) score++;
        return `
            <tr>
                <td style="font-weight:bold; color:var(--primary);">${i+1}</td>
                <td style="max-width:400px;">${q.q}</td>
                <td><span style="color:${isCorrect ? 'var(--success)' : 'var(--danger)'}; font-weight:bold;">${userAnswers[i] || 'N/A'}</span></td>
                <td style="font-weight:bold; color:var(--primary);">${q.correct}</td>
                <td><button class="btn-pri" style="padding:8px 15px; font-size:0.8rem;" onclick="openDetailedSolution(${i})">Solution</button></td>
            </tr>`;
    }).join('');

    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    document.getElementById('result-screen').innerHTML = `
        <div class="summary-container">
            <div class="result-header-card">
                <h1 style="margin:0;">Test Summary</h1>
                <div style="font-size:3rem; font-weight:800; margin-top:15px;">Score: ${score} / ${total}</div>
                <p>Accuracy: ${((score/total)*100).toFixed(1)}%</p>
            </div>
            <table class="result-table">
                <thead><tr><th>#</th><th>Question</th><th>Your Ans</th><th>Correct</th><th>Action</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
            <button class="btn-sec" style="width:100%; padding:15px; margin-top:20px;" onclick="location.reload()">Back to Home</button>
        </div>`;
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
