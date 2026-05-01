import React, { useMemo, useState } from "react";
import { apiJson } from "./api";

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEAR_FROM = CURRENT_YEAR - 14;

const DIFFICULTY_OPTIONS = [
  { value: "mixed", label: "Mixed" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const CHAPTER_SUGGESTIONS = {
  JEE: [
    "Kinematics",
    "Laws of Motion",
    "Work Energy Power",
    "Rotational Motion",
    "Thermodynamics",
    "Electrostatics",
    "Current Electricity",
    "Magnetism",
    "Modern Physics",
    "Organic Chemistry Basics",
  ],
  NEET: [
    "Cell: The Unit of Life",
    "Human Physiology",
    "Genetics",
    "Ecology",
    "Plant Physiology",
    "Biomolecules",
  ],
  UPSC: [
    "Modern History",
    "Polity",
    "Economy",
    "Geography",
    "Environment",
    "Science and Tech",
  ],
};

export default function PYQTest({ exam, apiReady }) {
  const suggestions = useMemo(
    () => CHAPTER_SUGGESTIONS[exam] || CHAPTER_SUGGESTIONS.JEE,
    [exam]
  );

  const [chapter, setChapter] = useState(suggestions[0] || "Kinematics");
  const [difficulty, setDifficulty] = useState("mixed");
  const [yearFrom, setYearFrom] = useState(DEFAULT_YEAR_FROM);
  const [yearTo, setYearTo] = useState(CURRENT_YEAR);
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [testInfo, setTestInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  async function startTest() {
    if (!apiReady) {
      setError("Set VITE_API_URL in frontend env, then redeploy.");
      return;
    }
    if (!chapter.trim()) {
      setError("Select or type a chapter.");
      return;
    }
    setError("");
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    setQuestions([]);
    setTestInfo(null);

    try {
      const result = await apiJson("/api/pyq/test", {
        method: "POST",
        body: JSON.stringify({
          exam,
          chapter: chapter.trim(),
          difficulty,
          year_from: Number(yearFrom),
          year_to: Number(yearTo),
          count: Number(count),
        }),
      });

      if (!result.questions || result.questions.length === 0) {
        setError("No questions found for this filter. Try a different chapter or broaden the year range.");
        return;
      }

      setTestInfo(result);
      setQuestions(result.questions);
    } catch (err) {
      setError(err.message || "Could not load PYQ test");
    } finally {
      setLoading(false);
    }
  }

  function pickAnswer(questionIndex, optionIndex) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  }

  function submitTest() {
    if (!questions.length) return;
    setSubmitted(true);
  }

  function resetTest() {
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setTestInfo(null);
    setError("");
  }

  const score = useMemo(() => {
    if (!submitted) return 0;
    return questions.reduce(
      (total, q, index) => total + (answers[index] === q.answer_index ? 1 : 0),
      0
    );
  }, [submitted, questions, answers]);

  return (
    <section className="panel">
      <div className="panel-title">📚 Previous Year Test (15 yrs, chapterwise)</div>

      {questions.length === 0 && (
        <>
          <div className="grid-form">
            <label>
              Chapter
              <input
                list="pyq-chapter-suggestions"
                value={chapter}
                onChange={(event) => setChapter(event.target.value)}
                placeholder="e.g. Kinematics"
              />
              <datalist id="pyq-chapter-suggestions">
                {suggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <label>
              Difficulty
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label>
              From year
              <input
                type="number"
                min={CURRENT_YEAR - 30}
                max={CURRENT_YEAR}
                value={yearFrom}
                onChange={(event) => setYearFrom(event.target.value)}
              />
            </label>
            <label>
              To year
              <input
                type="number"
                min={CURRENT_YEAR - 30}
                max={CURRENT_YEAR}
                value={yearTo}
                onChange={(event) => setYearTo(event.target.value)}
              />
            </label>
            <label>
              Questions
              <input
                type="number"
                min={1}
                max={30}
                value={count}
                onChange={(event) => setCount(event.target.value)}
              />
            </label>
          </div>

          <button onClick={startTest} disabled={loading || !apiReady}>
            {loading ? "Loading test..." : "Start PYQ Test"}
          </button>
        </>
      )}

      {error && <div className="error-box">{error}</div>}

      {testInfo && questions.length > 0 && (
        <div className="mcq-meta-row" style={{ marginTop: 14 }}>
          <span>{testInfo.exam}</span>
          <span>{testInfo.chapter}</span>
          <span>{testInfo.difficulty}</span>
          <span>{testInfo.year_from}–{testInfo.year_to}</span>
          <span>Real: {testInfo.manual_count}</span>
          <span>AI: {testInfo.ai_count}</span>
        </div>
      )}

      {questions.map((q, questionIndex) => {
        const picked = answers[questionIndex];
        return (
          <div className="mcq-card" key={q.id || questionIndex}>
            <div className="mcq-card-head">
              <div>
                <span className="mcq-kicker">
                  Q{questionIndex + 1} · {q.year} · {q.source === "ai" ? "AI" : "Real"}
                </span>
                <strong>{q.question}</strong>
              </div>
              <span className="mcq-difficulty">{q.difficulty}</span>
            </div>

            <div className="mcq-options">
              {q.options.map((option, optionIndex) => {
                const isPicked = picked === optionIndex;
                const isCorrect = q.answer_index === optionIndex;
                const showCorrect = submitted && isCorrect;
                const showWrong = submitted && isPicked && !isCorrect;
                const classes = ["mcq-option"];
                if (isPicked) classes.push("selected-option");
                if (showCorrect) classes.push("correct-option");
                if (showWrong) classes.push("wrong-option");

                return (
                  <button
                    key={optionIndex}
                    className={classes.join(" ")}
                    onClick={() => pickAnswer(questionIndex, optionIndex)}
                    disabled={submitted}
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    <p>{option}</p>
                  </button>
                );
              })}
            </div>

            {submitted && q.explanation && (
              <div className={`mcq-result ${picked === q.answer_index ? "correct" : "wrong"}`}>
                <strong>{picked === q.answer_index ? "Correct" : "Review"}:</strong>
                <p>{q.explanation}</p>
                <span>Answer: {String.fromCharCode(65 + q.answer_index)}</span>
              </div>
            )}
          </div>
        );
      })}

      {questions.length > 0 && !submitted && (
        <button
          className="mcq-submit"
          onClick={submitTest}
          disabled={Object.keys(answers).length === 0}
        >
          Submit Test
        </button>
      )}

      {submitted && (
        <div className="mcq-result correct" style={{ marginTop: 14 }}>
          <strong>Score:</strong>
          <p>{score} / {questions.length}</p>
          <span>Accuracy: {Math.round((score / questions.length) * 100)}%</span>
          <div style={{ marginTop: 12 }}>
            <button onClick={resetTest}>Take another test</button>
          </div>
        </div>
      )}
    </section>
  );
}
