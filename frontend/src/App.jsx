import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  CreditCard,
  Clapperboard,
  Flame,
  GraduationCap,
  Image as ImageIcon,
  LineChart,
  Lock,
  LogIn,
  Mic2,
  Languages,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  Trophy,
  Video,
  Volume2,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { API_CONFIGURED, apiFetch, apiJson, authHeaders, loadRazorpayScript, supabase } from "./api";
import "./styles.css";

function AuthPanel({ session, canAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      alert("Magic link sent. Check your email.");
    } catch (err) {
      setError(err.message || "Unable to send magic link");
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithPassword() {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) throw signUpError;
      alert("Account created. You can log in now.");
    } catch (err) {
      setError(err.message || "Unable to sign up");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithPassword() {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message || "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message || "Google login unavailable");
    }
  }

  if (!canAuth) {
    return <span className="stat-muted">Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your frontend deployment env, then redeploy.</span>;
  }

  if (session) {
    return (
      <button className="ghost" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    );
  }

  return (
    <div className="auth">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@email.com" />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
      />
      <button onClick={signInWithPassword} disabled={loading || !email || !password}>
        <LogIn size={16} /> Password
      </button>
      <button onClick={signIn} disabled={loading || !email}>
        <LogIn size={16} /> Login
      </button>
      <button className="ghost" onClick={signUpWithPassword} disabled={loading || !email || !password}>
        Sign up
      </button>
      <button className="ghost" onClick={signInWithGoogle}>
        Google
      </button>
      {error && <div className="error-box">{error}</div>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, muted }) {
  return (
    <section className="stat-card">
      <div className="stat-head">
        <Icon size={18} />
        <span>{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {muted && <div className="stat-muted">{muted}</div>}
    </section>
  );
}

function DifferentiatorCard({ icon: Icon, title, text, bullets }) {
  return (
    <section className="differentiator-card">
      <div className="panel-title">
        <Icon size={20} /> {title}
      </div>
      <p>{text}</p>
      <ul>
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}

function PlanBadge({ type = "free" }) {
  return (
    <span className={`plan-badge ${type}`}>
      {type === "pro" ? <Lock size={12} /> : <CheckCircle2 size={12} />}
      {type === "pro" ? "Pro" : "Free"}
    </span>
  );
}

function PlanComparison({ currentPlan = "free" }) {
  const freeItems = [
    "Daily AI doubts with free limit",
    "Teacher video preview lessons",
    "Adaptive MCQ practice",
    "Weak topic dashboard",
  ];
  const proItems = [
    "Unlimited doubts",
    "AI teacher video explanations",
    "Study planner and execution engine",
    "Priority exam-prep tools",
  ];

  return (
    <section className="plan-comparison" aria-label="Free and Pro feature comparison">
      <div className="plan-column">
        <div className="plan-column-head">
          <PlanBadge type="free" />
          <span>{currentPlan === "pro" ? "Still included" : "Your current plan"}</span>
        </div>
        <ul>
          {freeItems.map((item) => (
            <li key={item}>
              <CheckCircle2 size={15} /> {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="plan-column pro">
        <div className="plan-column-head">
          <PlanBadge type="pro" />
          <span>{currentPlan === "pro" ? "Active" : "Unlocks with upgrade"}</span>
        </div>
        <ul>
          {proItems.map((item) => (
            <li key={item}>
              <CheckCircle2 size={15} /> {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((item, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    ctx.fillText(`${item}${suffix}`, x, y + index * lineHeight);
  });
}

function roundedCanvasRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function renderLessonVideo(lesson) {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };

  const boardLines = (lesson.board_walkthrough || lesson.video_scene_plan || [])
    .concat(lesson.steps?.map((step) => `${step.title}: ${step.explanation}`) || [])
    .filter(Boolean)
    .slice(0, 5);
  const lines = boardLines.length
    ? boardLines
    : [lesson.ultra_simple_explanation, lesson.short_answer, lesson.memory_hook].filter(Boolean);

  const durationMs = 3500;
  const startedAt = performance.now();

  function drawFrame(now) {
    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / durationMs);
    const activeCount = Math.max(1, Math.min(lines.length, Math.floor(progress * (lines.length + 1))));
    const mouthOpen = Math.sin(elapsed / 90) > 0;
    const pointerAngle = -0.2 + Math.sin(elapsed / 700) * 0.28;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#17352e");
    gradient.addColorStop(0.55, "#203640");
    gradient.addColorStop(1, "#12231f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(116, 211, 174, 0.14)";
    ctx.beginPath();
    ctx.arc(170, 105, 210, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f6fbf8";
    ctx.font = "700 28px Inter, Arial, sans-serif";
    ctx.fillText(lesson.language || "Hinglish", 52, 58);
    ctx.font = "800 32px Inter, Arial, sans-serif";
    wrapCanvasText(ctx, lesson.title || "Teacher Lesson", 52, 110, 440, 40, 2);

    ctx.save();
    ctx.translate(240, 445 + Math.sin(elapsed / 420) * 8);
    ctx.fillStyle = lesson.avatar_style === "strict" ? "#e6c0a2" : lesson.avatar_style === "funny" ? "#ffd69c" : "#f6d8b8";
    ctx.beginPath();
    ctx.arc(0, -145, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b2624";
    ctx.beginPath();
    ctx.arc(-24, -152, 7, 0, Math.PI * 2);
    ctx.arc(24, -152, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8d3b36";
    roundedCanvasRect(ctx, -17, -120, 34, mouthOpen ? 18 : 8, 8);
    ctx.fill();
    ctx.fillStyle = "#d8f1e3";
    roundedCanvasRect(ctx, -72, -62, 144, 150, 34);
    ctx.fill();
    ctx.translate(48, -42);
    ctx.rotate(pointerAngle);
    ctx.fillStyle = "#f9ead8";
    roundedCanvasRect(ctx, 0, 0, 180, 12, 6);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#eff8f2";
    roundedCanvasRect(ctx, 500, 96, 700, 500, 16);
    ctx.fill();
    ctx.strokeStyle = "#c8d8cf";
    ctx.lineWidth = 12;
    ctx.stroke();

    ctx.fillStyle = "#17352e";
    ctx.font = "850 34px Inter, Arial, sans-serif";
    wrapCanvasText(ctx, lesson.concept_summary || lesson.short_answer, 540, 160, 620, 42, 2);

    ctx.strokeStyle = "#cfe0d7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(540, 238);
    ctx.lineTo(1160, 238);
    ctx.stroke();

    ctx.font = "600 25px Inter, Arial, sans-serif";
    lines.slice(0, activeCount).forEach((line, index) => {
      const y = 295 + index * 78;
      ctx.fillStyle = "rgba(17, 106, 85, 0.1)";
      roundedCanvasRect(ctx, 540, y - 34, 610, 58, 10);
      ctx.fill();
      ctx.fillStyle = "#116a55";
      roundedCanvasRect(ctx, 540, y - 34, 8, 58, 4);
      ctx.fill();
      ctx.fillStyle = "#243d37";
      wrapCanvasText(ctx, line, 565, y, 560, 29, 2);
    });

    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    roundedCanvasRect(ctx, 52, 650, 1176, 12, 6);
    ctx.fill();
    ctx.fillStyle = "#74d3ae";
    roundedCanvasRect(ctx, 52, 650, 1176 * progress, 12, 6);
    ctx.fill();

    if (elapsed < durationMs) {
      requestAnimationFrame(drawFrame);
    } else if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      resolve(URL.createObjectURL(blob));
    };
    recorder.start();
    requestAnimationFrame(drawFrame);
  });
}

function TeacherVideoPreview({ lesson }) {
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");
  const [rendering, setRendering] = useState(false);
  const videoUrl = lesson.video_url || generatedVideoUrl;

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    if (lesson.video_url) {
      setGeneratedVideoUrl("");
      return undefined;
    }

    setRendering(true);
    setGeneratedVideoUrl("");
    renderLessonVideo(lesson)
      .then((url) => {
        if (!active) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setGeneratedVideoUrl(url);
      })
      .catch(() => {
        if (active) setGeneratedVideoUrl("");
      })
      .finally(() => {
        if (active) setRendering(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [lesson]);

  const boardLines = (lesson.board_walkthrough || lesson.video_scene_plan || []).slice(0, 3);
  const activeLines = boardLines.length
    ? boardLines
    : [
        lesson.ultra_simple_explanation,
        lesson.short_answer,
        lesson.memory_hook,
      ].filter(Boolean).slice(0, 3);

  if (videoUrl) {
    return (
      <div className="teacher-video-frame">
        <video className="teacher-video-player" src={videoUrl} controls playsInline autoPlay muted loop />
      </div>
    );
  }

  return (
    <div className="teacher-video-frame" aria-label="Generated teacher video preview">
      <div className="video-topbar">
        <span>{lesson.title || "Teacher lesson"}</span>
        <span>{rendering ? "Rendering video" : lesson.language || "Hinglish"}</span>
      </div>
      {rendering ? (
        <div className="video-rendering">
          <div className="render-spinner" />
          <div className="render-title">Preparing playable video</div>
          <div className="render-copy">Your teacher lesson is being converted into a video file.</div>
        </div>
      ) : (
        <div className="video-stage">
          <div className={`video-avatar ${lesson.avatar_style || "friendly"}`}>
            <div className="avatar-head">
              <span className="avatar-eye left" />
              <span className="avatar-eye right" />
              <span className="avatar-mouth" />
            </div>
            <div className="avatar-body" />
            <span className="avatar-pointer" />
          </div>
          <div className="video-board">
            <div className="board-heading">{lesson.concept_summary || lesson.short_answer}</div>
            <div className="board-lines">
              {activeLines.map((line, index) => (
                <div className="board-line" style={{ animationDelay: `${index * 0.45}s` }} key={`${line}-${index}`}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="video-controls">
        <span className="control-dot">
          <Play size={14} fill="currentColor" />
        </span>
        <div className="control-track">
          <span />
        </div>
        <Volume2 size={16} />
        <span className="control-time">00:24</span>
      </div>
    </div>
  );
}

function TeacherStudio({ exam, apiReady }) {
  const [question, setQuestion] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [avatarStyle, setAvatarStyle] = useState("friendly");
  const [studentLevel, setStudentLevel] = useState("beginner");
  const [imageData, setImageData] = useState("");
  const [imageMimeType, setImageMimeType] = useState("image/png");
  const [imageName, setImageName] = useState("");
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setImageData("");
      setImageMimeType("image/png");
      setImageName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const [, base64 = ""] = result.split(",");
      setImageData(base64);
      setImageMimeType(file.type || "image/png");
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function createLesson() {
    if (!question.trim()) {
      setError("Type a doubt first.");
      return;
    }
    if (!apiReady) {
      setError("Set VITE_API_URL to your backend URL in frontend deployment env, then redeploy.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiJson("/api/teacher/explain", {
        method: "POST",
        body: JSON.stringify({
          question,
          exam,
          language,
          avatar_style: avatarStyle,
          student_level: studentLevel,
          image_data: imageData,
          image_mime_type: imageMimeType,
        }),
      });
      setLesson(result);
    } catch (err) {
      setError(err.message || "Unable to build teacher lesson");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel teacher-panel">
      <div className="panel-title">
        <Video size={20} /> AI Teacher Studio
        <PlanBadge type="free" />
      </div>
      <div className="teacher-grid">
        <div className="teacher-inputs">
          <div className="row compact">
            {["friendly", "strict", "funny"].map((style) => (
              <button
                key={style}
                type="button"
                className={avatarStyle === style ? "selected" : "chip"}
                onClick={() => setAvatarStyle(style)}
              >
                {style}
              </button>
            ))}
          </div>
          <div className="row compact">
            {["beginner", "intermediate", "advanced"].map((level) => (
              <button
                key={level}
                type="button"
                className={studentLevel === level ? "selected" : "chip"}
                onClick={() => setStudentLevel(level)}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="row compact">
            {["Hinglish", "Hindi", "English", "Tamil", "Marathi"].map((item) => (
              <button
                key={item}
                type="button"
                className={language === item ? "selected" : "chip"}
                onClick={() => setLanguage(item)}
              >
                <Languages size={14} /> {item}
              </button>
            ))}
          </div>
          <div className="teacher-help">
            Beginner mode keeps the answer simple, board-style, and zero-jargon. Ask the concept like you are asking a class teacher.
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Example: Explain kinetic energy like I know nothing, with steps and one easy example..."
          />
          <div className="teacher-upload">
            <label className="upload-label">
              <Clapperboard size={16} /> Add question image
              <input type="file" accept="image/*" onChange={onImageChange} />
            </label>
            <div className="upload-meta">
              {imageName ? `Attached: ${imageName}` : "Optional: upload a screenshot or handwritten question"}
            </div>
          </div>
          <button onClick={createLesson} disabled={loading || !apiReady || question.length < 5}>
            <Mic2 size={16} /> {loading ? "Creating video lesson..." : "Create Teacher Lesson"}
          </button>
          {error && <div className="error-box">{error}</div>}
        </div>
        <div className="teacher-output">
          {lesson ? (
            <>
              <TeacherVideoPreview lesson={lesson} />
              <details className="lesson-notes">
                <summary>Show lesson notes</summary>
                <div className="lesson-title">{lesson.title}</div>
                <div className="lesson-summary">{lesson.concept_summary}</div>
                <div className="lesson-pill-row">
                  <span className="lesson-pill">{lesson.language}</span>
                  <span className="lesson-pill">{lesson.avatar_style}</span>
                  <span className="lesson-pill">{lesson.student_level}</span>
                  <span className="lesson-pill">{lesson.teaching_mood}</span>
                </div>
                <div className="lesson-card reminder">
                  <strong>Why it matters</strong>
                  <p>{lesson.why_it_matters}</p>
                </div>
                <div className="lesson-card">
                  <strong>Ultra simple explanation</strong>
                  <p>{lesson.ultra_simple_explanation}</p>
                </div>
                <div className="lesson-card">
                  <strong>Analogy</strong>
                  <p>{lesson.analogy}</p>
                </div>
                <div className="lesson-card">
                  <strong>Short answer</strong>
                  <p>{lesson.short_answer}</p>
                </div>
                <div className="lesson-card">
                  <strong>Voice script</strong>
                  <p>{lesson.voiceover_script}</p>
                </div>
                <div className="lesson-section-title">Video scene plan</div>
                <ul className="lesson-list">
                  {(lesson.video_scene_plan || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="lesson-card">
                  <strong>Board walkthrough</strong>
                  <ul className="lesson-list">
                    {(lesson.board_walkthrough || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="lesson-section-title">Step by step</div>
                <div className="lesson-steps">
                  {(lesson.steps || []).map((step) => (
                    <div className="lesson-step" key={step.title}>
                      <strong>{step.title}</strong>
                      <p>{step.explanation}</p>
                    </div>
                  ))}
                </div>
                <div className="lesson-grid">
                <div className="lesson-card">
                  <strong>Examples</strong>
                  <ul className="lesson-list">
                    {(lesson.examples || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="lesson-card">
                  <strong>Common mistakes</strong>
                  <ul className="lesson-list">
                    {(lesson.common_mistakes || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="lesson-card">
                <strong>Memory hook</strong>
                <p>{lesson.memory_hook}</p>
              </div>
              <div className="lesson-card">
                <strong>Teacher tone</strong>
                <p>{lesson.teacher_tone}</p>
              </div>
              <div className="lesson-card">
                <strong>Student check</strong>
                <p>{lesson.student_check}</p>
              </div>
              <div className="lesson-card">
                <strong>Next practice</strong>
                <ul className="lesson-list">
                  {(lesson.next_practice || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="lesson-card">
                <strong>Follow-up question</strong>
                <p>{lesson.follow_up_question}</p>
              </div>
              <div className="lesson-card reminder">
                <strong>Execution pressure</strong>
                <p>{lesson.reminder_message}</p>
              </div>
              </details>
            </>
          ) : (
            <div className="teacher-placeholder">
              <ImageIcon size={28} />
              <div className="teacher-placeholder-title">Video-style teacher lesson will appear here</div>
              <div className="teacher-placeholder-copy">
                Ask a doubt, attach a screenshot, pick the teacher mood, and generate a video-ready explanation.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ExamSelector({ exam, onChange, compact = false }) {
  return (
    <div className={compact ? "row compact" : "row"}>
      {["JEE", "NEET", "UPSC"].map((item) => (
        <button
          type="button"
          className={exam === item ? "selected" : "chip"}
          onClick={() => onChange(item)}
          key={item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function DoubtSolver({ exam, apiReady, onExamChange }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    if (!apiReady) {
      setError("Set VITE_API_URL to your backend URL in frontend deployment env, then redeploy.");
      return;
    }
    setAnswer("");
    setError("");
    setLoading(true);
    try {
      const headers = await authHeaders();
      const response = await apiFetch("/api/doubt/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ question, exam }),
      });
      if (!response.ok || !response.body) {
        setError(await response.text());
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value));
      }
    } catch (err) {
      setError(err?.message || "Unable to reach the backend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <Brain size={20} /> AI Doubt Solver
        <PlanBadge type="free" />
      </div>
      <ExamSelector exam={exam} onChange={onExamChange} compact />
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Paste your doubt here..." />
      <button onClick={ask} disabled={loading || question.length < 5 || !apiReady}>
        <Send size={16} /> {loading ? "Solving..." : "Ask VidyaAI"}
      </button>
      {error && <div className="error-box">{error}</div>}
      {answer && <div className="answer">{answer}</div>}
    </section>
  );
}

function MCQGenerator({ exam, onAttemptSaved, apiReady }) {
  const [form, setForm] = useState({ exam, subject: "Physics", topic: "Kinematics", difficulty: "medium" });
  const [mcq, setMcq] = useState(null);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    setForm((prev) => ({ ...prev, exam }));
  }, [exam]);

  function fallbackMcq() {
    const topic = form.topic.trim() || "the selected topic";
    const subject = form.subject.trim() || "General";
    return {
      question: `In ${subject}, which option is the best first step for solving a ${topic} question?`,
      options: [
        "Identify the concept, choose the matching rule, and apply it step by step.",
        "Pick a formula randomly and substitute every number from the question.",
        "Skip units and signs because only the final number matters.",
        "Memorize the answer without understanding the logic.",
      ],
      answer_index: 0,
      explanation:
        "A reliable exam approach starts by identifying the concept, then selecting the correct rule or formula, and finally applying it carefully. This local practice question appears when the live generator is temporarily unavailable.",
      topic,
      difficulty: form.difficulty,
    };
  }

  async function generate() {
    if (!apiReady) {
      setMcq(null);
      setError("Backend API is not configured.");
      return;
    }
    if (!form.subject.trim() || !form.topic.trim()) {
      setError("Subject and topic are required.");
      return;
    }
    setSelected(null);
    setChecked(false);
    setSaveStatus("");
    setError("");
    setLoading(true);
    try {
      const nextMcq = await apiJson("/api/generate-question", { method: "POST", body: JSON.stringify(form) });
      setMcq(nextMcq);
    } catch (err) {
      setMcq(fallbackMcq());
      setError("Live generator is temporarily unavailable, so a practice MCQ was created locally.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAttempt() {
    if (selected == null || checked || !mcq) return;
    const correct = selected === mcq.answer_index;
    setChecked(true);
    setSaveStatus("");
    try {
      await apiJson("/api/attempts", {
        method: "POST",
        body: JSON.stringify({
          exam: form.exam,
          subject: form.subject,
          topic: mcq.topic || form.topic,
          correct,
          difficulty: mcq.difficulty || form.difficulty,
          time_taken: 45,
        }),
      });
      setSaveStatus("Saved to your performance dashboard.");
      onAttemptSaved?.();
    } catch {
      setSaveStatus("Result shown here. Log in to save attempts to your dashboard.");
    }
  }

  const selectedCorrect = checked && selected === mcq?.answer_index;

  return (
    <section className="panel mcq-panel">
      <div className="panel-title mcq-title">
        <span><Sparkles size={20} /> Adaptive MCQ</span>
        <PlanBadge type="free" />
      </div>
      <div className="mcq-meta-row">
        <span>{exam}</span>
        <span>{form.difficulty}</span>
        <span>Instant practice</span>
      </div>
      <div className="mcq-form">
        <label>
          Exam
          <input value={form.exam} readOnly />
        </label>
        <label>
          Subject
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </label>
        <label>
          Topic
          <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        </label>
        <label>
          Difficulty
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </label>
      </div>
      <div className="mcq-actions">
        <button onClick={generate} disabled={!apiReady || loading}>
          {loading ? <RotateCcw className="spin-icon" size={16} /> : <Sparkles size={16} />}
          {loading ? "Generating..." : "Generate Question"}
        </button>
        {mcq && (
          <button className="ghost" onClick={generate} disabled={loading}>
            <RotateCcw size={16} /> New
          </button>
        )}
      </div>
      {error && (
        <div className="error-box mcq-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {mcq && (
        <div className="mcq-card">
          <div className="mcq-card-head">
            <div>
              <span className="mcq-kicker">{mcq.topic || form.topic}</span>
              <strong>{mcq.question}</strong>
            </div>
            <span className="mcq-difficulty">{mcq.difficulty || form.difficulty}</span>
          </div>
          <div className="mcq-options">
            {(mcq.options || []).map((option, index) => {
              const isSelected = selected === index;
              const isCorrect = checked && index === mcq.answer_index;
              const isWrong = checked && isSelected && index !== mcq.answer_index;
              return (
                <button
                  type="button"
                  className={`mcq-option ${isSelected ? "selected-option" : ""} ${isCorrect ? "correct-option" : ""} ${isWrong ? "wrong-option" : ""}`}
                  onClick={() => !checked && setSelected(index)}
                  key={`${option}-${index}`}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  <p>{option}</p>
                </button>
              );
            })}
          </div>
          <button className="mcq-submit" onClick={submitAttempt} disabled={selected == null || checked}>
            <Trophy size={16} /> {checked ? "Answer submitted" : "Check Answer"}
          </button>
          {checked && (
            <div className={`mcq-result ${selectedCorrect ? "correct" : "wrong"}`}>
              <strong>
                {selectedCorrect ? "Correct." : `Not quite. Correct option: ${String.fromCharCode(65 + mcq.answer_index)}.`}
              </strong>
              <p>{mcq.explanation}</p>
              {saveStatus && <span>{saveStatus}</span>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Performance({ refreshKey }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiJson("/api/performance").then(setData).catch(() => {});
  }, [refreshKey]);

  const weak = data?.weak_topics || [];
  return (
    <section className="panel">
      <div className="panel-title">
        <LineChart size={20} /> Weak Topics
        <PlanBadge type="free" />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={weak}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="topic" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="accuracy" fill="#1f8a70" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

function StudyPlanner({ exam, apiReady }) {
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState(4);
  const [topics, setTopics] = useState("Kinematics, Work Energy Power");
  const [plan, setPlan] = useState([]);
  const [error, setError] = useState("");

  async function generatePlan() {
    if (!apiReady) {
      setError("Set VITE_API_URL to your backend URL in frontend deployment env, then redeploy.");
      return;
    }
    setError("");
    try {
      const result = await apiJson("/api/study-plan", {
        method: "POST",
        body: JSON.stringify({
          exam,
          exam_date: examDate,
          weak_topics: topics.split(",").map((item) => item.trim()).filter(Boolean),
          hours_per_day: Number(hours),
        }),
      });
      setPlan(result.plan || []);
    } catch (err) {
      setError(String(err.message || err));
    }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <Target size={20} /> Study Planner
        <PlanBadge type="pro" />
      </div>
      <div className="pro-note">Pro feature: creates a day-by-day plan from weak topics and available study time.</div>
      <div className="grid-form">
        <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        <input type="number" min="1" max="16" value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>
      <textarea value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Comma-separated weak topics" />
      <button onClick={generatePlan} disabled={!examDate || !apiReady}>Generate Plan</button>
      {error && <div className="error-box">{error}</div>}
      {plan.length > 0 && (
        <div className="plan-list">
          {plan.slice(0, 6).map((item) => (
            <div className="plan-item" key={item.date}>
              <strong>{item.date}</strong>
              <div>{(item.topics || []).join(", ")}</div>
              <div>{(item.tasks || []).join(" | ")}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Pricing({ user, onUpgraded, apiReady }) {
  const [loading, setLoading] = useState(false);

  async function upgrade() {
    if (!apiReady) {
      alert("Set VITE_API_URL to your backend URL in frontend deployment env, then redeploy.");
      return;
    }
    setLoading(true);
    try {
      let Razorpay;
      try {
        Razorpay = await loadRazorpayScript();
      } catch (err) {
        throw new Error(`Razorpay script load failed: ${err?.message || "unknown error"}`);
      }

      const { order, key_id } = await apiJson("/api/create-order", { method: "POST", body: "{}" });
      if (!key_id || typeof key_id !== "string" || !key_id.startsWith("rzp_")) {
        throw new Error("Razorpay key is invalid or missing from backend response");
      }
      if (!order?.id) {
        throw new Error("Razorpay order id missing from backend response");
      }
      const headers = await authHeaders();
      const instance = new Razorpay({
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "VidyaAI",
        description: "VidyaAI Pro Monthly",
        order_id: order.id,
        prefill: {
          email: user?.email || "",
        },
        handler: async (response) => {
          await apiFetch("/api/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: JSON.stringify(response),
          });
          onUpgraded?.();
          alert("Payment successful. Pro activated.");
        },
        theme: { color: "#116a55" },
      });
      try {
        instance.open();
      } catch (err) {
        throw new Error(`Razorpay checkout open failed: ${err?.message || "unknown error"}`);
      }
    } catch (err) {
      let message = err?.message || "Unable to open checkout";
      try {
        const parsed = JSON.parse(message);
        message = parsed?.detail || parsed?.message || message;
      } catch {}
      if (!message || message === "{}" || message === "Unable to open checkout") {
        try {
          message = JSON.stringify(err);
        } catch {}
      }
      if (!message || message === "{}") {
        message = "Checkout request failed. Please check backend /health and Render logs for /api/create-order.";
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel price">
      <div className="panel-title">
        <CreditCard size={20} /> Pro Plan
      </div>
      <div className="amount">Rs 199/mo</div>
      <p>Unlimited doubts, AI teacher video explanations, mock tests, execution-focused study planning, and adaptive tutoring.</p>
      <PlanComparison currentPlan={user?.plan === "pro" ? "pro" : "free"} />
      <button onClick={upgrade} disabled={loading || user?.plan === "pro" || !apiReady}>
        {user?.plan === "pro" ? "Already Pro" : loading ? "Opening Checkout..." : "Upgrade"}
      </button>
    </section>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedExam, setSelectedExam] = useState("JEE");
  const missingSupabase = !supabase;
  const missingApi = !API_CONFIGURED;

  const exam = selectedExam;

  async function loadProfile() {
    if (!session) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await apiJson("/api/me"));
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadProfile();
  }, [session]);

  useEffect(() => {
    const profileExam = profile?.user?.exam;
    if (profileExam && profileExam !== selectedExam) {
      setSelectedExam(profileExam);
    }
  }, [profile]);

  const stats = useMemo(() => {
    const user = profile?.user;
    const quota = profile?.quota;
    return {
      exam: user?.exam || "JEE",
      plan: user?.plan === "pro" ? "Pro" : "Free",
      doubts: quota?.doubts_limit == null ? "Unlimited" : `${quota?.doubts_remaining ?? 0} left`,
    };
  }, [profile]);

  async function changeExam(nextExam) {
    setSelectedExam(nextExam);
    if (!session) return;
    try {
      await apiJson("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ exam: nextExam }),
      });
      await loadProfile();
    } catch {
      // Keep local selection even if profile sync fails.
    }
  }

  return (
    <main>
      {missingSupabase && (
        <div className="setup-banner">
          Frontend env vars are missing. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in frontend deployment env, then redeploy.
        </div>
      )}
      {missingApi && (
        <div className="setup-banner warning">
          Frontend API URL is missing. Set `VITE_API_URL` to your backend URL in frontend deployment env, then redeploy.
        </div>
      )}
      <nav>
        <div className="brand"><Flame size={22} /> VidyaAI</div>
        <AuthPanel session={session} canAuth={!missingSupabase} />
      </nav>
      <section className="hero">
        <div>
          <div className="hero-title">Every student in India has an AI teacher</div>
          <div className="hero-copy">
            Not a chatbot. A learning brain that explains like a human tutor, adapts like a mentor, and pushes execution like a coach.
          </div>
        </div>
        <div className="hero-controls">
          <ExamSelector exam={exam} onChange={changeExam} />
        </div>
      </section>
      <section className="vision-band">
        <div className="vision-badge">Synthesia-like teaching, built for Indian exam prep</div>
        <div className="vision-copy">
          Student asks a question. VidyaAI turns it into a video-style lesson with voice, steps, and a teacher personality that fits the moment.
        </div>
      </section>
      <section className="stats">
        <StatCard icon={GraduationCap} label="Selected Exam" value={stats.exam} />
        <StatCard icon={CreditCard} label="Plan" value={stats.plan} />
        <StatCard icon={BarChart3} label="Doubt Quota" value={stats.doubts} muted={session ? "Last 24 hours" : "Login required"} />
      </section>
      <section className="differentiators">
        <DifferentiatorCard
          icon={Brain}
          title="AI Teacher Video Mode"
          text="Turn any doubt into a teacher-style explanation with voice, step-by-step reasoning, and a real tutor feel."
          bullets={[
            "Friendly, strict, or funny teacher avatars",
            "Hinglish plus regional language support",
            "Image-based doubt solving with instant video explanation",
          ]}
        />
        <DifferentiatorCard
          icon={Target}
          title="Auto Study Planner + Execution Engine"
          text="Creates the plan, tracks completion, changes the schedule, and applies gentle pressure when the student drifts."
          bullets={[
            "Daily plan creation",
            "Completion tracking and reminders",
            "Adjusts by performance, not just calendar dates",
          ]}
        />
        <DifferentiatorCard
          icon={Sparkles}
          title="Adaptive Learning Brain"
          text="Learns from student behavior, tracks weaknesses, and explains the same concept in multiple ways until it clicks."
          bullets={[
            "Tracks weak topics automatically",
            "Explains the same concept in 5 ways",
            "Changes teaching style based on student response",
          ]}
        />
      </section>
      <div className="layout">
        <TeacherStudio exam={exam} apiReady={!missingApi} />
        <DoubtSolver exam={exam} apiReady={!missingApi} onExamChange={changeExam} />
        <MCQGenerator exam={exam} apiReady={!missingApi} onAttemptSaved={() => setRefreshKey((value) => value + 1)} />
        <Performance refreshKey={refreshKey} />
        <StudyPlanner exam={exam} apiReady={!missingApi} />
        <Pricing user={profile?.user} apiReady={!missingApi} onUpgraded={loadProfile} />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
// components/AI Teacher Studio
import { useState } from "react";

export default function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const askAI = async () => {
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      setAnswer(data.answer);

      // voice
      const speech = new SpeechSynthesisUtterance(data.answer);
      window.speechSynthesis.speak(speech);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>AI Teacher Studio</h2>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask your question here"
      />

      <button onClick={askAI}>Ask AI Teacher</button>

      {answer && (
        <div style={{ marginTop: "20px" }}>
          <img src="/teacher.png" width={120} />
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}
import{ useState } from "react";
export default function AIteacher () { 
  const [question , setQuestion] = useState("");
  const[ answer, setAnswer]= useState("");
  const speak = ( text ) => {
    const speech = new
    speechSynthesisUtterence(text);
    speech. lang= "en-IN";// Indian accent
    speech.rate =1 speech.pitch =1
    window. speechSynthesis.cancel();//
    previous stopwindow . speechSynthesis.speak(speech);
  };
  const askAI = async () => {
    const response = await fetch("/api/ask",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({question})
    });
    const data = await response.json();
    setanswer(data.answer);
    speak(data.answer);
  };
  call };
  return(
    <div>
      <input
    value ={question}
    onchange={(e)=>
      setQuestion(e.target.value )}
      placeholder="ask your doubts ....."
      />
      < button on click ={askAI}>ask</button>
      <p>{answer}</p>
      </div>
  );
    }
