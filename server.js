const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const exam = {
  id: 101,
  title: "Fundamentals of Computer Science",
  description: "A short practice examination",
  durationMinutes: 20,
  totalMarks: 5,
  status: "AVAILABLE"
};

const questions = [
  {
    id: 1,
    text: "Which data structure follows the FIFO principle?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    correctAnswer: "Queue",
    marks: 1
  },
  {
    id: 2,
    text: "Which HTTP method is commonly used to retrieve data?",
    options: ["POST", "PUT", "GET", "DELETE"],
    correctAnswer: "GET",
    marks: 1
  },
  {
    id: 3,
    text: "Which of these is a relational database?",
    options: ["Redis", "PostgreSQL", "MongoDB", "Neo4j"],
    correctAnswer: "PostgreSQL",
    marks: 1
  },
  {
    id: 4,
    text: "What does API stand for?",
    options: [
      "Application Programming Interface",
      "Automated Program Instruction",
      "Applied Protocol Internet",
      "Application Process Integration"
    ],
    correctAnswer: "Application Programming Interface",
    marks: 1
  },
  {
    id: 5,
    text: "Which status code usually means a successful HTTP request?",
    options: ["404", "500", "200", "401"],
    correctAnswer: "200",
    marks: 1
  }
];

// Demo-only in-memory storage. Data resets when the server restarts.
const answersByCandidate = new Map();
const submissionsByCandidate = new Map();
const resultsByCandidate = new Map();

function candidateKey(req) {
  // Demo identity only. A production app must use real authentication.
  return String(req.header("x-candidate-id") || "demo-candidate");
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "online-exam-platform" });
});

app.get("/api/exams", (_req, res) => {
  res.json([exam]);
});

app.get("/api/exams/:examId", (req, res) => {
  if (Number(req.params.examId) !== exam.id) {
    return res.status(404).json({ message: "Exam not found" });
  }
  res.json(exam);
});

app.get("/api/exams/:examId/questions", (req, res) => {
  if (Number(req.params.examId) !== exam.id) {
    return res.status(404).json({ message: "Exam not found" });
  }
  // Never send correct answers to the candidate's browser.
  const safeQuestions = questions.map(({ correctAnswer, ...question }) => question);
  res.json(safeQuestions);
});

app.get("/api/exams/:examId/answers", (req, res) => {
  if (Number(req.params.examId) !== exam.id) {
    return res.status(404).json({ message: "Exam not found" });
  }
  res.json(answersByCandidate.get(candidateKey(req)) || {});
});

app.post("/api/exams/:examId/answers", (req, res) => {
  if (Number(req.params.examId) !== exam.id) {
    return res.status(404).json({ message: "Exam not found" });
  }
  const { questionId, answer } = req.body || {};
  const question = questions.find((q) => q.id === Number(questionId));

  if (!question) {
    return res.status(400).json({ message: "Valid questionId is required" });
  }
  if (typeof answer !== "string" || !question.options.includes(answer)) {
    return res.status(400).json({ message: "Choose a valid option" });
  }
  if (submissionsByCandidate.has(candidateKey(req))) {
    return res.status(409).json({ message: "Exam has already been submitted" });
  }

  const key = candidateKey(req);
  const savedAnswers = answersByCandidate.get(key) || {};
  savedAnswers[question.id] = answer;
  answersByCandidate.set(key, savedAnswers);

  res.status(200).json({
    message: "Answer saved successfully",
    questionId: question.id,
    status: "SAVED"
  });
});

app.post("/api/exams/:examId/submit", (req, res) => {
  if (Number(req.params.examId) !== exam.id) {
    return res.status(404).json({ message: "Exam not found" });
  }

  const key = candidateKey(req);
  if (submissionsByCandidate.has(key)) {
    return res.status(409).json({ message: "Exam already submitted" });
  }

  const answers = answersByCandidate.get(key) || {};
  const obtainedMarks = questions.reduce(
    (total, question) => total + (answers[question.id] === question.correctAnswer ? question.marks : 0),
    0
  );
  const result = {
    examId: exam.id,
    candidateId: key,
    obtainedMarks,
    totalMarks: exam.totalMarks,
    percentage: Math.round((obtainedMarks / exam.totalMarks) * 100),
    status: "COMPLETED",
    submittedAt: new Date().toISOString()
  };

  submissionsByCandidate.set(key, { examId: exam.id, submittedAt: result.submittedAt });
  resultsByCandidate.set(key, result);

  res.status(201).json({
    message: "Exam submitted successfully",
    submission: submissionsByCandidate.get(key),
    result
  });
});

app.get("/api/exams/:examId/results/me", (req, res) => {
  if (Number(req.params.examId) !== exam.id) {
    return res.status(404).json({ message: "Exam not found" });
  }
  const result = resultsByCandidate.get(candidateKey(req));
  if (!result) {
    return res.status(404).json({ message: "Result is not available yet. Submit the exam first." });
  }
  res.json(result);
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Online Exam Platform running at http://localhost:${PORT}`);
});
