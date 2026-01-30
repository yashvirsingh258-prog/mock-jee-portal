// INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 1. DATA (MATHEMATICS QUESTIONS)
const questionBanks = {
    mathematics: [
        { type: "mcq", q: "Let $A = \\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 1 \\\\ 0 & 0 & 1 \\end{bmatrix}$. If $A^n = \\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & 1 & n \\\\ 0 & 0 & 1 \\end{bmatrix}$, then $|adj(A^{10})|$ is:", options: ["1", "10", "100", "0"], correct: "1", solution: "Since $|A|=1$, then $|A^{10}|=1$. $|adj(M)| = |M|^{n-1}$." },
        { type: "mcq", q: "If $S_n = 3n^2 + 4n$, then the $n^{th}$ term $a_n$ is:", options: ["$6n + 1$", "$6n - 1$", "$3n + 1$", "$3n - 1$"], correct: "$6n + 1$", solution: "$a_n = S_n - S_{n-1}$." },
        { type: "mcq", q: "The value of $\\int_{-1}^{1} \\frac{x^4}{1 + e^{x^7}} dx$ is:", options: ["0", "1/5", "2/5", "4/5"], correct: "1/5", solution: "Property of definite integrals." },
        { type: "mcq", q: "The number of solutions of $\\sin^{-1} x = 2\\tan^{-1} x$ is:", options: ["1", "2", "3", "0"], correct: "3", solution: "Total 3 solutions." },
        { type: "mcq", q: "Min area of $\\triangle OAB$ for tangent to $\\frac{x^2}{27} + \\frac{y^2}{3} = 1$ is:", options: ["9", "18", "27", "9\\sqrt{3}"], correct: "9", solution: "Area = ab = 9." },
        { type: "mcq", q: "Probability $3^n + 4^n$ is multiple of 5 for 2-digit $n$:", options: ["1/2", "1/3", "1/4", "1/5"], correct: "1/2", solution: "n must be odd." },
        { type: "mcq", q: "If $\\vec{a} = \\hat{i} - \\lambda \\hat{j} + \\hat{k}$ and $\\vec{b} = \\hat{i} + \\hat{j} + \\mu \\hat{k}$ are collinear, $(\\lambda, \\mu)$ is:", options: ["(1, 1)", "(-1, 1)", "(1, -1)", "(-1, -1)"], correct: "(-1, 1)", solution: "Ratios are equal." },
        { type: "mcq", q: "Local minimum of $f(x) = x^x$ is at:", options: ["e", "1/e", "1", "ln 2"], correct: "1/e", solution: "f'(x) = x^x(1 + lnx)." },
        { type: "num", q: "Subsets of $\\{1, 2, \\dots, 10\\}$ with at least one odd number:", correct: "992", solution: "2^10 - 2^5 = 992." },
        { type: "num", q: "Positive $k$ if $x-y=k$ is tangent to $x^2+y^2=32$:", correct: "8", solution: "k^2 = 64." },
        { type: "num", q: "Intersection points of $y=\\cos x$ and $y=\\ln x$ in $(0, 2\\pi)$:", correct: "1", solution: "One point of intersection." },
        { type: "num", q: "Find $a$ if coefficients of $x^2$ and $x^3$ in $(3+ax)^9$ are equal:", correct: "1", solution: "Equate coefficients." },
        { type: "num", q: "Variance of first 10 natural numbers:", correct: "8.25", solution: "(n^2 - 1)/12." },
        { type: "num", q: "Find $k$ if $\\lim_{x \\to 0} \\frac{\\cos(6x)-1}{kx^2} = -9$:", correct: "2", solution: "L'Hopital's rule." },
        { type: "num", q: "Area bounded by $y^2=4x$ and $x^2=4y$:", correct: "5.33", solution: "Integral calculation." }
    ]
};

// 2. STATE
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUserEmail = ""; 

// 3. AUTHENTICATION (Fixed IDs to match index.html)
window.handleLogin = async function() {
    // Corrected IDs to match your index.html
    const emailInput = document.getElementById('login-id'); 
    const passInput = document.getElementById('login-password');

    const email = emailInput.value.trim();
    const pass = passInput.value.trim();

    if (!email || !pass) {
        alert("Please enter both ID and password.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });

    if (error) {
        alert("Login failed: " + error.message);
    } else if (data.user) {
        currentUserEmail = data.user.email;
        startExam(); 
    }
};

// 4. CLOUD PERSISTENCE
async function saveToCloud() {
    if (!currentUserEmail) return;
    const sub = document.getElementById('subject-select').value;
    const payload = { 
        username: currentUserEmail,
        subject: sub,
        current_index: currentIndex,
        user_answers: JSON.parse(JSON.stringify(userAnswers)),
        confirmed_answered: JSON.parse(JSON.stringify(confirmedAnswered)),
        marked_for_review: JSON.parse(JSON.stringify(markedForReview)),
        time_left: timeLeft
    };
    await supabaseClient.from('student_progress').upsert(payload, { onConflict: 'username' });
}

// 5. EXAM LOGIC
window.updateTestNames = function() {
    const sub = document.getElementById('subject-select').value;
    const testSelect = document.getElementById('test-name-select');
    if (testSelect) {
        testSelect.innerHTML = `<option value="test1">${sub.toUpperCase()} Mock Test 1</option>`;
    }
};

window.setView = function(view) {
    document.getElementById('login-screen').style.display = (view === 'login') ? 'flex' : 'none';
    document.getElementById('exam-header').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('quiz-container').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('result-screen').style.display = (view === 'result') ? 'block' : 'none';
};

// 6. START EXAM WITH SECURITY CHECK
window.startExam = async function() {
    // If we haven't logged in yet, trigger handleLogin first
    if (!currentUserEmail) {
        await handleLogin();
        return;
    }

    const sub = document.getElementById('subject-select').value;
    activeBank = questionBanks[sub] || questionBanks['mathematics'];
    
    const { data } = await supabaseClient.from('student_progress').select('*')
        .eq('username', currentUserEmail).eq('subject', sub).maybeSingle();

    // Block entry if test is already finished
    if (data && data.is_finished) {
        alert("This test has already been submitted. You can only view your results.");
        userAnswers = data.user_answers;
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
        timeLeft = 40 * 60;
        currentIndex = 0;
    }
    
    document.getElementById('display-subject').innerText = sub.toUpperCase();
    setView('exam');
    renderPalette();
    startTimer();
    loadQuestion();
};

window.loadQuestion = function() {
    const data = activeBank[currentIndex];
    const area = document.getElementById('question-area');
    area.innerHTML = `
        <div style="padding: 20px 50px;">
            <div style="margin-bottom: 20px;"><span style="background: #0b4a8f; color: white; padding: 5px 15px; border-radius: 4px;">Question ${currentIndex + 1}</span></div>
            <div style="font-size: 1.2rem; margin-bottom: 25px;">${data.q}</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${data.type === 'mcq' ? 
                    data.options.map(opt => `
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
        if (timeLeft % 30 === 0) saveToCloud();
        document.getElementById('time').innerText = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
        if (timeLeft <= 0) finalSubmission();
    }, 1000);
}

window.confirmSubmit = function() { if (confirm("Submit examination?")) finalSubmission(); };

function showFinalResultOnly() {
    timerActive = false; 
    let score = 0;
    const totalQuestions = activeBank.length;
    
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:15px; text-align:center;">${i+1}</td>
                <td style="padding:15px; text-align:left;">${q.q}</td>
                <td style="padding:15px; text-align:center; font-weight:bold; color:${isCorrect ? '#198754' : '#d93025'}">${userAnswers[i] || 'N/A'}</td>
                <td style="padding:15px; text-align:center; font-weight:bold; color:#0b4a8f;">${q.correct}</td>
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
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding:15px;">Q.No</th>
                        <th style="padding:15px; text-align:left;">Question Description</th>
                        <th style="padding:15px;">Your Response</th>
                        <th style="padding:15px;">Correct Answer</th>
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
        username: currentUserEmail, 
        subject: sub, 
        is_finished: true, 
        user_answers: [...userAnswers] 
    }, { onConflict: 'username' });

    if (!error) {
        showFinalResultOnly();
    } else {
        alert("Submission error: " + error.message);
    }
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
        // Premium colors for palette
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
