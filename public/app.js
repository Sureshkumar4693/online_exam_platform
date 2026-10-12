const API = "/api";
const EXAM_ID = 101;
const CANDIDATE_ID = "demo-candidate";
const $ = (id) => document.getElementById(id);

let exam = null;
let questions = [];
let answers = {};
let currentIndex = 0;
let remainingSeconds = 20 * 60;
let timerInterval = null;
let submitting = false;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-candidate-id": CANDIDATE_ID,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

function showView(viewId) {
  ["homeView", "examView", "resultView"].forEach((id) => $(id).classList.toggle("hidden", id !== viewId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.add("hidden"), 2600);
}

async function init() {
  try {
    const exams = await request(`${API}/exams`);
    exam = exams[0];
    const details = await request(`${API}/exams/${EXAM_ID}`);
    $("examTitle").textContent = details.title;
    $("examDescription").textContent = details.description;
    $("totalMarks").textContent = details.totalMarks;
    $("duration").textContent = `${details.durationMinutes} min`;
    $("activeExamTitle").textContent = details.title;
    remainingSeconds = details.durationMinutes * 60;
    $("timer").textContent = formatTime(remainingSeconds);
    // Questions are loaded when the candidate starts the exam.
  } catch (error) {
    $("examTitle").textContent = "Unable to load exam";
    $("examDescription").textContent = error.message;
    $("startBtn").disabled = true;
  }
}

async function startExam() {
  try {
    questions = await request(`${API}/exams/${EXAM_ID}/questions`);
    answers = await request(`${API}/exams/${EXAM_ID}/answers`);
    $("questionCount").textContent = questions.length;
    $("totalMarks").textContent = exam.totalMarks;
    currentIndex = 0;
    renderQuestion();
    showView("examView");
    startTimer();
  } catch (error) {
    toast(error.message);
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingSeconds -= 1;
    $("timer").textContent = formatTime(Math.max(remainingSeconds, 0));
    if (remainingSeconds <= 60) $("timer").style.color = "#b34a3b";
    if (remainingSeconds <= 0) submitExam(true);
  }, 1000);
}

function renderQuestion() {
  const question = questions[currentIndex];
  if (!question) return;
  $("questionNumber").textContent = `QUESTION ${String(currentIndex + 1).padStart(2, "0")}`;
  $("questionText").textContent = question.text;
  $("progressText").textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  $("answeredText").textContent = `${Object.keys(answers).length} answered`;
  $("progressBar").style.width = `${(Object.keys(answers).length / questions.length) * 100}%`;
  $("prevBtn").disabled = currentIndex === 0;
  $("prevBtn").style.opacity = currentIndex === 0 ? ".45" : "1";
  $("nextBtn").textContent = currentIndex === questions.length - 1 ? "Review answers →" : "Next question →";

  const options = $("options");
  options.replaceChildren();
  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `option${answers[question.id] === option ? " selected" : ""}`;
    const letter = document.createElement("span");
    letter.className = "option-letter";
    letter.textContent = String.fromCharCode(65 + index);
    const label = document.createElement("span");
    label.textContent = option;
    button.append(letter, label);
    button.addEventListener("click", () => saveAnswer(question.id, option));
    options.appendChild(button);
  });
  renderQuestionNumbers();
}

function renderQuestionNumbers() {
  const container = $("questionNumbers");
  container.replaceChildren();
  questions.forEach((question, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "number-btn";
    if (index === currentIndex) button.classList.add("active");
    if (answers[question.id]) button.classList.add("answered");
    button.textContent = index + 1;
    button.setAttribute("aria-label", `Go to question ${index + 1}`);
    button.addEventListener("click", () => { currentIndex = index; renderQuestion(); });
    container.appendChild(button);
  });
}

async function saveAnswer(questionId, answer) {
  try {
    await request(`${API}/exams/${EXAM_ID}/answers`, {
      method: "POST",
      body: JSON.stringify({ questionId, answer })
    });
    answers[questionId] = answer;
    $("saveStatus").textContent = "Answer saved successfully.";
    renderQuestion();
  } catch (error) {
    toast(error.message);
  }
}

async function submitExam(autoSubmitted = false) {
  if (submitting) return;
  if (!autoSubmitted) {
    const unanswered = questions.length - Object.keys(answers).length;
    const message = unanswered
      ? `You have ${unanswered} unanswered question(s). Submit anyway?`
      : "Are you sure you want to submit your examination?";
    if (!window.confirm(message)) return;
  }
  submitting = true;
  $("submitBtn").disabled = true;
  try {
    const response = await request(`${API}/exams/${EXAM_ID}/submit`, { method: "POST", body: JSON.stringify({}) });
    clearInterval(timerInterval);
    displayResult(response.result);
    showView("resultView");
  } catch (error) {
    toast(error.message);
    $("submitBtn").disabled = false;
  } finally {
    submitting = false;
  }
}

function displayResult(result) {
  $("score").textContent = result.obtainedMarks;
  $("scoreTotal").textContent = `/ ${result.totalMarks}`;
  $("percentage").textContent = `${result.percentage}%`;
  $("resultBar").style.width = `${result.percentage}%`;
  $("submittedAt").textContent = new Date(result.submittedAt).toLocaleString();
}

$("startBtn").addEventListener("click", startExam);
$("prevBtn").addEventListener("click", () => {
  if (currentIndex > 0) { currentIndex -= 1; renderQuestion(); }
});
$("nextBtn").addEventListener("click", () => {
  if (currentIndex < questions.length - 1) { currentIndex += 1; renderQuestion(); }
  else {
    const firstUnanswered = questions.findIndex((question) => !answers[question.id]);
    if (firstUnanswered !== -1) {
      currentIndex = firstUnanswered;
      renderQuestion();
      toast("Review the unanswered questions before submitting.");
    } else {
      toast("All questions answered. You can submit your exam.");
    }
  }
});
$("submitBtn").addEventListener("click", () => submitExam(false));
$("restartBtn").addEventListener("click", () => {
  // This demo uses a single candidate identity and does not provide a reset endpoint.
  window.location.reload();
});

init();
