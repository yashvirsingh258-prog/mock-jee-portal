const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false, currentUserEmail = ""; 

// FIX: Targeting the vertical step issue specifically
function cleanMath(str) {
    if (!str) return "";
    return str
        .replace(/\\\\\\\\/g, '\\') 
        .replace(/\\\\/g, '\\')     
        .replace(/\\n/g, '<br>') // This forces the new line in the solution window
        .replace(/\n/g, '<br>');    
}

function refreshMath(element) {
    if (window.MathJax && window.MathJax.typesetPromise) {
        setTimeout(() => {
            window.MathJax.typesetPromise([element])
                .then(() => window.MathJax.typesetPromise([element]))
                .catch((err) => console.log('MathJax Error:', err));
        }, 300); 
    }
}

window.handleLogin = async function() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) {
        document.getElementById('auth-status-msg').innerText = "Login failed: " + error.message;
    } else { 
        currentUserEmail = data.user.email;
        await fetchQuestionsAndStart(); 
    }
};

async function fetchQuestionsAndStart() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data } = await supabaseClient.from('questions_table').select('question_data').eq('subject', sub).eq('test_name', testName).maybeSingle();

    if (data && data.question_data) {
        activeBank = data.question_data;
        userAnswers = new Array(activeBank.length).fill("");
        confirmedAnswered = new Array(activeBank.length).fill(false);
        markedForReview = new Array(activeBank.length).fill(false);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('exam-header').style.display = 'flex';
        document.getElementById('quiz-container').style.display = 'flex';
        renderPalette(); loadQuestion(); startTimer();
    }
}

window.loadQuestion = function() {
    const qData = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    area.innerHTML = `
        <div class="tex2jax_process" style="padding: 20px 50px;">
            <div style="font-size: 1.35rem; margin-bottom: 30px; line-height: 1.8;">${cleanMath(qData.q)}</div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${qData.options.map((opt, i) => `
                    <label style="padding: 16px; border: 1.5px solid ${userAnswers[currentIndex] === opt ? '#0b4a8f' : '#e2e8f0'}; background: ${userAnswers[currentIndex] === opt ? '#f0f7ff' : '#fff'}; border-radius: 12px; cursor: pointer;">
                        <input type="radio" name="answer" value="${opt}" onchange="saveAnswer(this.value); loadQuestion();" ${userAnswers[currentIndex] === opt ? 'checked' : ''}> 
                        <span style="margin-left: 10px;">${cleanMath(opt)}</span>
                    </label>
                `).join('')}
            </div>
        </div>`;
    updateStats(); updatePaletteUI(); refreshMath(area);
};

// ... REST OF THE ORIGINAL FUNCTIONS (saveAnswer, renderPalette, updateTestNames) ...
window.saveAnswer = (v) => { userAnswers[currentIndex] = v; saveToCloud(); };
window.saveAndNext = () => { if(userAnswers[currentIndex]) { confirmedAnswered[currentIndex] = true; markedForReview[currentIndex] = false; } if(currentIndex < activeBank.length -1) { currentIndex++; loadQuestion(); } saveToCloud(); };
window.prevQuestion = () => { if(currentIndex > 0) { currentIndex--; loadQuestion(); saveToCloud(); } };
window.markForReview = () => { markedForReview[currentIndex] = true; if(currentIndex < activeBank.length -1) { currentIndex++; loadQuestion(); } updatePaletteUI(); saveToCloud(); };
window.clearResponse = () => { userAnswers[currentIndex] = ""; confirmedAnswered[currentIndex] = false; markedForReview[currentIndex] = false; loadQuestion(); saveToCloud(); };

function startTimer() { timerActive = true; setInterval(() => { if(timerActive) { timeLeft--; document.getElementById('time').innerText = Math.floor(timeLeft/60) + ":" + (timeLeft%60).toString().padStart(2,'0'); }}, 1000); }

async function saveToCloud() {
    if(!currentUserEmail) return;
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    await supabaseClient.from('student_progress').upsert({
        username: currentUserEmail, subject: sub, test_name: testName,
        current_index: currentIndex, user_answers: [...userAnswers],
        confirmed_answered: [...confirmedAnswered], marked_for_review: [...markedForReview],
        time_left: timeLeft, is_finished: false
    }, { onConflict: 'username, subject, test_name' });
}

window.confirmSubmit = () => {
    timerActive = false;
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('exam-header').style.display = 'none';
    const res = document.getElementById('result-screen');
    res.style.display = 'block';
    res.innerHTML = `<div class="tex2jax_process" style="padding:100px; text-align:center;">
        <h2 style="font-size: 2rem; color: #0b4a8f; margin-bottom: 20px;">Examination Complete</h2>
        <button onclick="openDetailedSolution(0)" class="btn-pri">VIEW SOLUTIONS</button>
    </div>`;
};

window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    solTab.document.write(`
        <html><head><title>Solution</title>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        <style>body{font-family:sans-serif;padding:40px;line-height:1.6;}.card{background:#f1f5f9;padding:25px;border-radius:10px;line-height:2.2;}</style></head>
        <body class="tex2jax_process">
            <div class="card">${cleanMath(q.solution)}</div>
        </body></html>
    `);
    solTab.document.close();
};

window.renderPalette = () => { document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `<div id="dot-${i}" onclick="jumpTo(${i})" style="width:35px; height:35px; border:1px solid #ccc; display:inline-block; margin:2px; cursor:pointer; text-align:center; line-height:35px; border-radius:4px; font-weight:bold;">${i+1}</div>`).join(''); };
window.jumpTo = (i) => { currentIndex = i; loadQuestion(); saveToCloud(); };
function updatePaletteUI() { activeBank.forEach((_, i) => { const d = document.getElementById(`dot-${i}`); if(d) { d.style.background = markedForReview[i] ? "#6f42c1" : (confirmedAnswered[i] ? "#198754" : "#fff"); d.style.color = (markedForReview[i] || confirmedAnswered[i]) ? "#fff" : "#333"; } }); }
function updateStats() { document.getElementById('count-ans').innerText = confirmedAnswered.filter(x=>x).length; document.getElementById('count-not-ans').innerText = activeBank.length - confirmedAnswered.filter(x=>x).length; }

window.updateTestNames = async function() {
    const sub = document.getElementById('subject-select').value;
    const { data } = await supabaseClient.from('questions_table').select('test_name').eq('subject', sub);
    const select = document.getElementById('test-name-select');
    select.innerHTML = data && data.length ? data.map(d => `<option value="${d.test_name}">${d.test_name}</option>`).join('') : '<option>No tests</option>';
};
window.onload = updateTestNames;
