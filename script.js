const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false, currentUserEmail = ""; 

// THE UPDATED CLEANER
function cleanMath(str) {
    if (!str) return "";
    return str
        .replace(/\\\\\\\\/g, '\\') // Fixes quadruple slashes
        .replace(/\\\\/g, '\\')     // Fixes double slashes
        .replace(/\\n/g, '<br>')    // CONVERTS \n TEXT TO HTML NEWLINES
        .replace(/\n/g, '<br>');    // CONVERTS REAL NEWLINES TO HTML NEWLINES
}

function refreshMath(element) {
    if (window.MathJax && window.MathJax.typesetPromise) {
        setTimeout(() => {
            window.MathJax.typesetPromise([element])
                .then(() => window.MathJax.typesetPromise([element])) // Double pass for safety
                .catch((err) => console.log('MathJax Error:', err));
        }, 300);
    }
}

window.handleLogin = async function() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) {
        document.getElementById('auth-status-msg').innerText = "Login failed.";
    } else { 
        currentUserEmail = data.user.email;
        await fetchQuestionsAndStart(); 
    }
};

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
    updateStats(); 
    updatePaletteUI();
    refreshMath(area);
};

window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    solTab.document.write(`
        <html><head>
        <title>Solution</title>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        <style>
            body { font-family: sans-serif; padding: 50px; line-height: 1.6; }
            .sol-box { background: #f1f5f9; padding: 25px; border-radius: 10px; margin: 20px 0; font-size: 1.1rem; line-height: 2.2; }
        </style></head>
        <body class="tex2jax_process">
            <h2>Solution</h2>
            <div>${cleanMath(q.q)}</div>
            <div class="sol-box">${cleanMath(q.solution)}</div>
            <div style="color: green; font-weight: bold;">Correct: ${cleanMath(q.correct)}</div>
        </body></html>
    `);
    solTab.document.close();
};

// ... (fetchQuestionsAndStart, renderPalette, updateStats, etc. remain unchanged from your working version) ...
async function fetchQuestionsAndStart() {
    const sub = document.getElementById('subject-select').value;
    const testName = document.getElementById('test-name-select').value;
    const { data } = await supabaseClient.from('questions_table').select('question_data').eq('subject', sub).eq('test_name', testName).maybeSingle();
    if (data) {
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
function startTimer() { timerActive = true; setInterval(() => { if(timerActive) { timeLeft--; document.getElementById('time').innerText = Math.floor(timeLeft/60) + ":" + (timeLeft%60).toString().padStart(2,'0'); }}, 1000); }
window.saveAnswer = (v) => { userAnswers[currentIndex] = v; };
window.saveAndNext = () => { if(userAnswers[currentIndex]) confirmedAnswered[currentIndex] = true; if(currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); } };
window.renderPalette = () => { document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `<div id="dot-${i}" onclick="jumpTo(${i})" class="dot">${i+1}</div>`).join(''); };
window.jumpTo = (i) => { currentIndex = i; loadQuestion(); };
function updatePaletteUI() { activeBank.forEach((_, i) => { const d = document.getElementById(`dot-${i}`); if(d) d.style.background = confirmedAnswered[i] ? "green" : "white"; }); }
function updateStats() { document.getElementById('count-ans').innerText = confirmedAnswered.filter(x=>x).length; }
window.confirmSubmit = () => { timerActive = false; document.getElementById('quiz-container').style.display = 'none'; document.getElementById('result-screen').style.display = 'block'; document.getElementById('result-screen').innerHTML = `<button onclick="openDetailedSolution(0)">View Solutions</button>`; };
window.updateTestNames = async function() {
    const sub = document.getElementById('subject-select').value;
    const { data } = await supabaseClient.from('questions_table').select('test_name').eq('subject', sub);
    const select = document.getElementById('test-name-select');
    select.innerHTML = data && data.length ? data.map(d => `<option value="${d.test_name}">${d.test_name}</option>`).join('') : '<option>No tests</option>';
};
window.onload = updateTestNames;
