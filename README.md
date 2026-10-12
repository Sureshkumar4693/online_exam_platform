# Examly — Online Examination Platform

A simple full-stack examination demo with a responsive frontend and Node.js/Express backend.

## Requirements
- Node.js 18 or later
- npm

## Run locally
1. Extract the ZIP file.
2. Open a terminal in the `online-exam-platform` folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open http://localhost:5000 in your browser.

## Included features
- View exam details
- Retrieve questions from backend API
- Navigate between questions
- Save answers through REST APIs
- Submit the exam and calculate the result on the backend
- View score and percentage
- Countdown timer with automatic submission
- Responsive interface

## Main API endpoints
- `GET /api/health`
- `GET /api/exams`
- `GET /api/exams/:examId`
- `GET /api/exams/:examId/questions`
- `GET /api/exams/:examId/answers`
- `POST /api/exams/:examId/answers`
- `POST /api/exams/:examId/submit`
- `GET /api/exams/:examId/results/me`

## Important demo limitations
- Candidate identity is a fixed demo header, not real authentication.
- Answers, submissions, and results are held in server memory and reset when the server restarts.
- Correct answers are kept on the backend and are not returned by the questions API.
- For real use, add proper authentication, persistent storage (e.g. PostgreSQL), server-side exam deadlines, audit logging, and stronger authorization.
