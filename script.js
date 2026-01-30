
// INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 1. DATA (MATHEMATICS with Step-wise Solutions)
const questionBanks = {
    mathematics: [
        { 
            type: "mcq", 
            q: "Let $A = \\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 1 \\\\ 0 & 0 & 1 \\end{bmatrix}$. If $A^n = \\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & 1 & n \\\\ 0 & 0 & 1 \\end{bmatrix}$, then $|adj(A^{10})|$ is:", 
            options: ["1", "10", "100", "0"], 
            correct: "1", 
            solution: "Step 1: Calculate the determinant of matrix $A$. $|A| = 1(1-0) - 0 + 0 = 1$.<br>Step 2: Use the property $|A^n| = |A|^n$. Therefore, $|A^{10}| = |A|^{10} = 1^{10} = 1$.<br>Step 3: Apply the Adjoint property: $|adj(M)| = |M|^{n-1}$, where $n$ is the order of the matrix.<br>Step 4: Here, $M = A^{10}$ and $n=3$. So, $|adj(A^{10})| = |A^{10}|^{3-1} = |A^{10}|^2$.<br>Step 5: Substitute the value: $1^2 = 1$. Final Answer is 1." 
        },
        { 
            type: "mcq", 
            q: "If $S_n = 3n^2 + 4n$, then the $n^{th}$ term $a_n$ is:", 
            options: ["$6n + 1$", "$6n - 1$", "$3n + 1$", "$3n - 1$"], 
            correct: "$6n + 1$", 
            solution: "Step 1: Recall the formula $a_n = S_n - S_{n-1}$.<br>Step 2: We have $S_n = 3n^2 + 4n$.<br>Step 3: Find $S_{n-1} = 3(n-1)^2 + 4(n-1) = 3(n^2 - 2n + 1) + 4n - 4$.<br>Step 4: Simplify $S_{n-1} = 3n^2 - 2n - 1$.<br>Step 5: $a_n = (3n^2 + 4n) - (3n^2 - 2n - 1) = 6n + 1$." 
        },
        { type: "mcq", q: "The value of $\\int_{-1}^{1} \\frac{x^4}{1 + e^{x^7}} dx$ is:", options: ["0", "1/5", "2/5", "4/5"], correct: "1/5", solution: "Step 1: Use property $\\int_a^b f(x)dx = \\int_a^b f(a+b-x)dx$.<br>Step 2: $I = \\int_{-1}^{1} \\frac{x^4}{1 + e^{x^7}} dx$.<br>Step 3: $I = \\int_{-1}^{1} \\frac{x^4}{1 + e^{-x^7}} dx$.<br>Step 4: Adding both: $2I = \\int_{-1}^1 x^4 dx$.<br>Step 5: $2I = [x^5/5]_{-1}^1 = 2/5 \\Rightarrow I = 1/5$." },
        { type: "mcq", q: "The number of solutions of $\\sin^{-1} x = 2\\tan^{-1} x$ is:", options: ["1", "2", "3", "0"], correct: "3", solution: "Step 1: Let $\\tan^{-1} x = \\theta$. Then $x = \\tan \\theta$.<br>Step 2: $\\sin^{-1}(\\tan \\theta) = 2\\theta \\Rightarrow \\tan \\theta = \\sin 2\\theta$.<br>Step 3: $\\frac{\\sin\\theta}{\\cos\\theta} = 2\\sin\\theta\\cos\\theta$.<br>Step 4: $\\sin\\theta(1 - 2\\cos^2\\theta) = 0$.<br>Step 5: Solutions are $x=0, 1, -1$. Total 3 solutions." },
        { type: "mcq", q: "Min area of $\\triangle OAB$ for tangent to $\\frac{x^2}{27} + \\frac{y^2}{3} = 1$ is:", options: ["9", "18", "27", "9\\sqrt{3}"], correct: "9", solution: "Step 1: Parametric tangent is $\\frac{x\\cos\\theta}{a} + \\frac{y\\sin\\theta}{b} = 1$.<br>Step 2: Intercepts are $a/\\cos\\theta$ and $b/\\sin\\theta$.<br>Step 3: Area $= \\frac{ab}{\\sin 2\\theta}$.<br>Step 4: Min area $= ab = 3\\sqrt{3} \\cdot \\sqrt{3} = 9$." },
        { type: "mcq", q: "Probability $3^n + 4^n$ is multiple of 5 for 2-digit $n$:", options: ["1/2", "1/3", "1/4", "1/5"], correct: "1/2", solution: "Step 1: $3^n + 4^n$ is a multiple of 5 when $n$ is even.<br>Step 2: 2-digit numbers are 10 to 99 (90 total).<br>Step 3: Even 2-digit numbers are 45 total.<br>Step 4: Probability $= 45/90 = 1/2$." },
        { type: "mcq", q: "If $\\vec{a} = \\hat{i} - \\lambda \\hat{j} + \\hat{k}$ and $\\vec{b} = \\hat{i} + \\hat{j} + \\mu \\hat{k}$ are collinear, $(\\lambda, \\mu)$ is:", options: ["(1, 1)", "(-1, 1)", "(1, -1)", "(-1, -1)"], correct: "(-1, 1)", solution: "Step 1: Components must be proportional: $1/1 = -\\lambda/1 = 1/\\mu$.<br>Step 2: $-\\lambda = 1 \\Rightarrow \\lambda = -1$.<br>Step 3: $1/\\mu = 1 \\Rightarrow \\mu = 1$." },
        { type: "mcq", q: "Local minimum of $f(x) = x^x$ is at:", options: ["e", "1/e", "1", "ln 2"], correct: "1/e", solution: "Step 1: $f'(x) = x^x(1 + \\ln x)$.<br>Step 2: Set $f'(x) = 0 \\Rightarrow \\ln x = -1$.<br>Step 3: $x = 1/e$." },
        { type: "num", q: "Subsets of $\\{1, 2, \\dots, 10\\}$ with at least one odd number:", correct: "992", solution: "Step 1: Total subsets $= 2^{10} = 1024$.<br>Step 2: Even subsets (no odds) $= 2^5 = 32$.<br>Step 3: $1024 - 32 = 992$." },
        { type: "num", q: "Positive $k$ if $x-y=k$ is tangent to $x^2+y^2=32$:", correct: "8", solution: "Step 1: Radius $r = 4\\sqrt{2}$.<br>Step 2: Distance from center (0,0) to line $x-y-k=0$ is $|-k|/\\sqrt{2}$.<br>Step 3: $|k|/\\sqrt{2} = 4\\sqrt{2} \\Rightarrow k = 8$." },
        { type: "num", q: "Intersection points of $y=\\cos x$ and $y=\\ln x$ in $(0, 2\\pi)$:", correct: "1", solution: "Step 1: $\\cos x$ decreases, $\\ln x$ increases.<br>Step 2: They cross exactly once in $(0, \\pi/2)$." },
        { type: "num", q: "Find $a$ if coefficients of $x^2$ and $x^3$ in $(3+ax)^9$ are equal:", correct: "1", solution: "Step 1: $^9C_2 3^7 a^2 = ^9C_3 3^6 a^3$.<br>Step 2: Simplify to find $a=1$." },
        { type: "num", q: "Variance of first 10 natural numbers:", correct: "8.25", solution: "Step 1: Variance $= (n^2 - 1)/12 = (100 - 1)/12 = 8.25$." },
        { type: "num", q: "Find $k$ if $\\lim_{x \\to 0} \\frac{\\cos(6x)-1}{kx^2} = -9$:", correct: "2", solution: "Step 1: Use L'Hopital or expansion: $-36x^2 / 2kx^2 = -18/k$.<br>Step 2: $-18/k = -9 \\Rightarrow k=2$." },
        { type: "num", q: "Area bounded by $y^2=4x$ and $x^2=4y$:", correct: "5.33", solution: "Step 1: Intersection at (4,4).<br>Step 2: $\\int_0^4 (2\\sqrt{x} - x^2/4) dx = 16/3 = 5.33$." }
    ]
};

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
    else if (data.user) { currentUserEmail = data.user.email; startExam(); }
};

// 4. CLOUD PERSISTENCE
async function saveToCloud() {
    if (!currentUserEmail) return;
    const sub = document.getElementById('subject-select').value;
    const payload = { 
        username: currentUserEmail, subject: sub, current_index: currentIndex,
        user_answers: JSON.parse(JSON.stringify(userAnswers)),
        confirmed_answered: JSON.parse(JSON.stringify(confirmedAnswered)),
        marked_for_review: JSON.parse(JSON.stringify(markedForReview)),
        time_left: timeLeft, is_finished: false
    };
    await supabaseClient.from('student_progress').upsert(payload, { onConflict: 'username' });
}

// 5. EXAM LOGIC
window.updateTestNames = function() {
    const sub = document.getElementById('subject-select').value;
    const testSelect = document.getElementById('test-name-select');
    if (testSelect) testSelect.innerHTML = `<option value="test1">${sub.toUpperCase()} Mock Test 1</option>`;
};

window.setView = function(view) {
    document.getElementById('login-screen').style.display = (view === 'login') ? 'flex' : 'none';
    document.getElementById('exam-header').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('quiz-container').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('result-screen').style.display = (view === 'result') ? 'block' : 'none';
};

window.startExam = async function() {
    const sub = document.getElementById('subject-select').value;
    activeBank = questionBanks[sub] || questionBanks['mathematics'];
    const { data } = await supabaseClient.from('student_progress').select('*').eq('username', currentUserEmail).eq('subject', sub).maybeSingle();

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
    
    document.getElementById('display-subject').innerText = sub.toUpperCase();
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

// NEW: SOLUTION WINDOW LOGIC
window.openDetailedSolution = function(idx) {
    const q = activeBank[idx];
    const solTab = window.open('', '_blank');
    solTab.document.write(`
        <html>
        <head>
            <title>Detailed Solution - Q${idx+1}</title>
            <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; background: #f4f7f9; color: #333; line-height: 1.7; }
                .container { max-width: 800px; margin: auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                h1 { color: #0b4a8f; border-bottom: 2px solid #0b4a8f; padding-bottom: 10px; }
                .q-box { background: #f0f4f8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #0b4a8f; font-size: 1.1rem; }
                .step { margin-bottom: 15px; padding: 12px; border-bottom: 1px dashed #e2e8f0; }
                .final { font-weight: bold; color: #198754; font-size: 1.2rem; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Step-by-Step Solution</h1>
                <div class="q-box"><strong>Question ${idx+1}:</strong><br>${q.q}</div>
                <div>${q.solution.split('<br>').map(s => `<div class="step">${s}</div>`).join('')}</div>
                <div class="final">Correct Answer: ${q.correct}</div>
            </div>
        </body>
        </html>
    `);
    solTab.document.close();
};

// 6. MODERN SUMMARY VIEW
function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const totalQuestions = activeBank.length;
    
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `
            <tr style="border-bottom: 1px solid #edf2f7;">
                <td style="padding:15px; text-align:center; color:#718096; font-weight:600;">${i+1}</td>
                <td style="padding:15px; text-align:left; color:#2d3748;">${q.q}</td>
                <td style="padding:15px; text-align:center;">
                    <span style="padding:4px 12px; border-radius:12px; font-weight:bold; font-size:0.85rem; 
                        background:${isCorrect ? '#c6f6d5' : '#fed7d7'}; color:${isCorrect ? '#22543d' : '#822727'};">
                        ${userAnswers[i] || 'N/A'}
                    </span>
                </td>
                <td style="padding:15px; text-align:center; font-weight:bold; color:#0b4a8f;">${q.correct}</td>
                <td style="padding:15px; text-align:center;">
                    <button onclick="openDetailedSolution(${i})" style="background:none; border:1.5px solid #0b4a8f; color:#0b4a8f; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.75rem; transition: 0.2s;" onmouseover="this.style.background='#0b4a8f'; this.style.color='white'" onmouseout="this.style.background='none'; this.style.color='#0b4a8f'">View Solution</button>
                </td>
            </tr>`;
    }).join('');

    const percentage = ((score / totalQuestions) * 100).toFixed(2);
    setView('result');

    document.getElementById('score-val').innerHTML = `
        <div style="display: flex; justify-content: center; margin-bottom: 40px;">
            <div style="background: linear-gradient(135deg, #0b4a8f 0%, #1e3a5f 100%); color: white; padding: 30px 60px; border-radius: 20px; box-shadow: 0 10px 30px rgba(11, 74, 143, 0.3); text-align: center; min-width: 320px;">
                <div style="font-size: 1rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; opacity: 0.9;">Score Report</div>
                <div style="font-size: 3.5rem; font-weight: 800; margin: 0; line-height: 1;">${score} <span style="font-size: 1.5rem; opacity: 0.7;">/ ${totalQuestions}</span></div>
                <div style="margin-top: 20px; font-size: 1.4rem; background: rgba(255,255,255,0.15); display: inline-block; padding: 8px 25px; border-radius: 50px;">
                    Accuracy: ${percentage}%
                </div>
            </div>
        </div>`;

    document.getElementById('review-panel').innerHTML = `
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            <table style="width:100%; border-collapse:collapse; font-family: sans-serif;">
                <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding:18px; color:#4a5568; text-transform:uppercase; font-size:0.75rem; letter-spacing:1px;">Q.No</th>
                        <th style="padding:18px; color:#4a5568; text-transform:uppercase; font-size:0.75rem; letter-spacing:1px; text-align:left;">Question</th>
                        <th style="padding:18px; color:#4a5568; text-transform:uppercase; font-size:0.75rem; letter-spacing:1px;">Your Response</th>
                        <th style="padding:18px; color:#4a5568; text-transform:uppercase; font-size:0.75rem; letter-spacing:1px;">Correct</th>
                        <th style="padding:18px; color:#4a5568; text-transform:uppercase; font-size:0.75rem; letter-spacing:1px;">Solution</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;

    if (window.MathJax) setTimeout(() => { MathJax.typesetPromise([document.getElementById('review-panel')]); }, 200);
}

window.finalSubmission = async function() {
    const sub = document.getElementById('subject-select').value;
    const { error } = await supabaseClient.from('student_progress').upsert({ 
        username: currentUserEmail, subject: sub, is_finished: true, 
        user_answers: [...userAnswers], time_left: 0
    }, { onConflict: 'username' });
    if (!error) showFinalResultOnly();
};

// 7. UI HELPERS
function renderPalette() {
    document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `
        <div id="dot-${i}" onclick="jumpTo(${i})" style="width:35px; height:35px; border:1px solid #ccc; display:inline-block; margin:2px; cursor:pointer; text-align:center; line-height:35px;">${i+1}</div>`).join('');
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
    const subSelect = document.getElementById('subject-select');
    if(subSelect) subSelect.addEventListener('change', updateTestNames);
});
