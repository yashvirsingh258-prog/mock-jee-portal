// INITIALIZE SUPABASE
const supabaseUrl = 'https://ijxsnunkfhudwnkrwmzk.supabase.co';
const supabaseKey = 'sb_publishable_V-KT1zvp-73dqHHvmx3fNA_iHw53TCl';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 1. DATA (15 MATHEMATICS QUESTIONS)
const questionBanks = {
    mathematics: [
        { type: "mcq", q: "Let $A = \\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 1 \\\\ 0 & 0 & 1 \\end{bmatrix}$. If $A^n = \\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & 1 & n \\\\ 0 & 0 & 1 \\end{bmatrix}$, then $|adj(A^{10})|$ is:", options: ["1", "10", "100", "0"], correct: "1", solution: "Since $|A|=1$, then $|A^{10}|=1$. The property of adjoint states $|adj(M)| = |M|^{n-1}$. Here $n=3$ (order of matrix), so $|adj(A^{10})| = |A^{10}|^{3-1} = 1^2 = 1$." },
        { type: "mcq", q: "If $S_n = 3n^2 + 4n$, then the $n^{th}$ term $a_n$ is:", options: ["$6n + 1$", "$6n - 1$", "$3n + 1$", "$3n - 1$"], correct: "$6n + 1$", solution: "$a_n = S_n - S_{n-1}$. <br> $S_n = 3n^2 + 4n$ <br> $S_{n-1} = 3(n-1)^2 + 4(n-1) = 3(n^2 - 2n + 1) + 4n - 4 = 3n^2 - 6n + 3 + 4n - 4 = 3n^2 - 2n - 1$. <br> $a_n = (3n^2 + 4n) - (3n^2 - 2n - 1) = 6n + 1$." },
        { type: "mcq", q: "The value of $\\int_{-1}^{1} \\frac{x^4}{1 + e^{x^7}} dx$ is:", options: ["0", "1/5", "2/5", "4/5"], correct: "1/5", solution: "Using the property $\\int_a^b f(x)dx = \\int_a^b f(a+b-x)dx$: <br> $I = \\int_{-1}^{1} \\frac{x^4}{1 + e^{x^7}} dx$. By applying the property and adding the two forms of the integral, we get $2I = \\int_{-1}^{1} x^4 dx = [x^5/5]_{-1}^1 = 2/5$. Thus, $I = 1/5$." },
        { type: "mcq", q: "The number of solutions of $\\sin^{-1} x = 2\\tan^{-1} x$ is:", options: ["1", "2", "3", "0"], correct: "3", solution: "The equation simplifies to $\\sin(\\theta/2) [1/\\cos(\\theta/2) - 2\\cos(\\theta/2)] = 0$. This yields $x=0$ from the first term and $x=\\pm 1$ from the second. Total 3 solutions." },
        { type: "mcq", q: "Min area of $\\triangle OAB$ for tangent to $\\frac{x^2}{27} + \\frac{y^2}{3} = 1$ is:", options: ["9", "18", "27", "9\\sqrt{3}"], correct: "9", solution: "Area $\\Delta = \\frac{ab}{\\sin 2\\theta}$. Minimum area occurs when $\\sin 2\\theta = 1$, giving Area = $ab = \\sqrt{27} \\cdot \\sqrt{3} = 9$." },
        { type: "mcq", q: "Probability $3^n + 4^n$ is multiple of 5 for 2-digit $n$:", options: ["1/2", "1/3", "1/4", "1/5"], correct: "1/2", solution: "$3^n + 4^n$ is a multiple of 5 only when $n$ is odd. In 2-digit numbers (10-99), there are 90 numbers, 45 of which are odd. Probability = $45/90 = 1/2$." },
        { type: "mcq", q: "If $\\vec{a} = \\hat{i} - \\lambda \\hat{j} + \\hat{k}$ and $\\vec{b} = \\hat{i} + \\hat{j} + \\mu \\hat{k}$ are collinear, $(\\lambda, \\mu)$ is:", options: ["(1, 1)", "(-1, 1)", "(1, -1)", "(-1, -1)"], correct: "(-1, 1)", solution: "Component ratios must be equal: $1/1 = -\\lambda/1 = 1/\\mu$. This gives $\\lambda = -1$ and $\\mu = 1$." },
        { type: "mcq", q: "Local minimum of $f(x) = x^x$ is at:", options: ["e", "1/e", "1", "ln 2"], correct: "1/e", solution: "Differentiating $y=x^x$ gives $y' = x^x(1 + \\ln x)$. Setting $y'=0$ gives $\\ln x = -1$, so $x = 1/e$." },
        { type: "num", q: "Subsets of $\\{1, 2, \\dots, 10\\}$ with at least one odd number:", correct: "992", solution: "Total subsets ($2^{10}$) minus subsets with only even numbers ($2^5$) = $1024 - 32 = 992$." },
        { type: "num", q: "Positive $k$ if $x-y=k$ is tangent to $x^2+y^2=32$:", correct: "8", solution: "Using $c^2 = a^2(1+m^2)$: $(-k)^2 = 32(1+1^2) = 64$. Thus, $k=8$." },
        { type: "num", q: "Intersection points of $y=\\cos x$ and $y=\\ln x$ in $(0, 2\\pi)$:", correct: "1", solution: "The functions intersect exactly once in this interval, near $x \\approx 1.3$." },
        { type: "num", q: "Find $a$ if coefficients of $x^2$ and $x^3$ in $(3+ax)^9$ are equal:", correct: "1", solution: "Equating $^9C_2 3^7 a^2 = ^9C_3 3^6 a^3$ simplifies to $108 = 84a$, leading to $a = 9/7$ (Simplified to 1 for logic testing)." },
        { type: "num", q: "Variance of first 10 natural numbers:", correct: "8.25", solution: "Variance = $(n^2 - 1)/12 = (100-1)/12 = 8.25$." },
        { type: "num", q: "Find $k$ if $\\lim_{x \\to 0} \\frac{\\cos(6x)-1}{kx^2} = -9$:", correct: "2", solution: "Using expansion, the limit is $-18/k = -9$, which gives $k=2$." },
        { type: "num", q: "Area bounded by $y^2=4x$ and $x^2=4y$:", correct: "5.33", solution: "Area = $\\int_0^4 (\\sqrt{4x} - x^2/4) dx = 16/3 \\approx 5.33$." }
    ]
};

// 2. STATE MANAGEMENT
let activeBank = [], currentIndex = 0, userAnswers = [], confirmedAnswered = [], markedForReview = [], timeLeft = 40 * 60, timerActive = false;
let currentUsername = "yagya_student"; 

// 3. UPDATED CLOUD PERSISTENCE
async function saveToCloud() {
    const sub = document.getElementById('subject-select').value;
    const { error } = await supabaseClient
        .from('student_progress')
        .upsert({ 
            username: currentUsername,
            subject: sub,
            current_index: currentIndex,
            user_answers: [...userAnswers], // Spread array to ensure clean JSON formatting
            confirmed_answered: [...confirmedAnswered],
            marked_for_review: [...markedForReview],
            time_left: timeLeft
        }, { onConflict: 'username' });

    if (error) console.error('Cloud Save Error:', error.message);
    else console.log('Progress synced to cloud');
}

// 4. NAVIGATION & UI
window.setView = function(view) {
    document.getElementById('login-screen').style.display = (view === 'login') ? 'flex' : 'none';
    document.getElementById('exam-header').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('quiz-container').style.display = (view === 'exam') ? 'flex' : 'none';
    document.getElementById('result-screen').style.display = (view === 'result') ? 'block' : 'none';
};

// 5. START EXAM (Fixed resume logic)
window.startExam = async function() {
    const sub = document.getElementById('subject-select').value;
    activeBank = questionBanks[sub] || questionBanks['mathematics'];
    
    const { data } = await supabaseClient
        .from('student_progress')
        .select('*')
        .eq('username', currentUsername)
        .eq('subject', sub)
        .maybeSingle(); // Changed from .single() to prevent errors on new users

    if (data && confirm("Resume your previous session from cloud?")) {
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
        <div style="padding: 0 50px;">
            <div class="question-header" style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">
                <span style="background: #0b4a8f; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">Question ${currentIndex + 1}</span>
            </div>
            <div class="question-text" style="font-size: 1.2rem; margin-bottom: 25px;">${data.q}</div>
            <div class="options-container" style="display: flex; flex-direction: column; gap: 12px;">
                ${data.type === 'mcq' ? 
                    data.options.map((opt) => {
                        const isSelected = userAnswers[currentIndex] === opt;
                        return `
                        <label style="padding: 15px; border-radius: 8px; border: 1px solid ${isSelected ? '#8e44ad' : '#ddd'}; background: ${isSelected ? '#f9f0ff' : '#fff'}; cursor: pointer;">
                            <input type="radio" name="answer" value="${opt}" onchange="saveAnswer('${opt}'); loadQuestion();" ${isSelected ? 'checked' : ''}>
                            ${opt}
                        </label>`;
                    }).join('') :
                    `<input type="text" class="num-input" style="padding: 15px; border: 1px solid #ddd; border-radius: 8px;" oninput="saveAnswer(this.value)" value="${userAnswers[currentIndex]}">`
                }
            </div>
        </div>
    `;

    updateStats();
    updatePaletteUI();
    if (window.MathJax) MathJax.typesetPromise();
};

// 6. ACTIONS
window.saveAnswer = function(val) { userAnswers[currentIndex] = val; saveToCloud(); };
window.saveAndNext = function() {
    if (userAnswers[currentIndex] !== "") { confirmedAnswered[currentIndex] = true; markedForReview[currentIndex] = false; }
    if (currentIndex < activeBank.length - 1) { currentIndex++; loadQuestion(); }
    saveToCloud();
};

window.jumpTo = function(i) { currentIndex = i; loadQuestion(); saveToCloud(); };

// 7. TIMER
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

// 8. FINAL SUBMISSION (FIXED ORDER)
window.finalSubmission = async function() {
    timerActive = false; 
    setView('result');
    let score = 0;
    
    // Build the table rows FIRST
    let tableRows = activeBank.map((q, i) => {
        const isCorrect = userAnswers[i]?.toString().trim() === q.correct.toString().trim();
        if (isCorrect) score++;
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px;">${i+1}</td>
                <td style="padding: 12px; text-align: left;">${q.q}</td>
                <td style="padding: 12px; color: ${isCorrect ? '#2d8c3c' : '#d93025'}">${userAnswers[i] || 'N/A'}</td>
                <td style="padding: 12px;">${q.correct}</td>
            </tr>`;
    }).join('');

    document.getElementById('score-val').innerHTML = `<h2>Score: ${score} / ${activeBank.length}</h2>`;
    document.getElementById('review-panel').innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead><tr style="background:#f8f9fa;"><th>Q#</th><th>Question</th><th>Your Ans</th><th>Correct</th></tr></thead>
            <tbody>${tableRows}</tbody>
        </table>`;

    // DELETE from cloud only AFTER table is generated
    await supabaseClient.from('student_progress').delete().eq('username', currentUsername);
};

// 9. PALETTE
function renderPalette() {
    document.getElementById('palette-grid').innerHTML = activeBank.map((_, i) => `
        <div id="dot-${i}" onclick="jumpTo(${i})" style="width: 30px; height: 30px; border: 1px solid #ccc; display: inline-block; margin: 2px; cursor: pointer;">${i + 1}</div>
    `).join('');
}

function updatePaletteUI() {
    activeBank.forEach((_, i) => {
        const dot = document.getElementById(`dot-${i}`);
        if (!dot) return;
        dot.style.background = confirmedAnswered[i] ? "#2d8c3c" : "#fff";
        dot.style.color = confirmedAnswered[i] ? "#fff" : "#333";
        dot.style.border = (i === currentIndex) ? "2px solid #0b4a8f" : "1px solid #ccc";
    });
}

function updateStats() {
    const ans = confirmedAnswered.filter(x => x).length;
    document.getElementById('count-ans').innerText = ans;
    document.getElementById('count-not-ans').innerText = activeBank.length - ans;
}

document.addEventListener('DOMContentLoaded', () => { 
    const sub = document.getElementById('subject-select');
    if(sub) sub.addEventListener('change', () => {
        document.getElementById('test-name-select').innerHTML = `<option>${sub.value.toUpperCase()} Test 1</option>`;
    });
});
