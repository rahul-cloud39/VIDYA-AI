import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Brain,
  CreditCard,
  Flame,
  GraduationCap,
  LineChart,
  LogIn,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { API_URL, API_CONFIGURED, apiJson, authHeaders, loadRazorpayScript, supabase } from "./api";
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
    return <span className="stat-muted">Set Vercel Supabase env vars to enable login</span>;
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

function DoubtSolver({ exam, apiReady }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    if (!apiReady) {
      setError("Set VITE_API_URL to your Render backend URL in Vercel, then redeploy.");
      return;
    }
    setAnswer("");
    setError("");
    setLoading(true);
    try {
      const headers = await authHeaders();
      const response = await fetch(`${API_URL}/api/doubt/stream`, {
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
      </div>
      <ExamSelector exam={exam} onChange={() => {}} compact />
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

  useEffect(() => {
    setForm((prev) => ({ ...prev, exam }));
  }, [exam]);

  async function generate() {
    if (!apiReady) {
      setMcq(null);
      return;
    }
    setSelected(null);
    setChecked(false);
    try {
      setMcq(await apiJson("/api/generate-question", { method: "POST", body: JSON.stringify(form) }));
    } catch (err) {
      setMcq(null);
    }
  }

  async function submitAttempt() {
    if (selected == null || checked || !mcq) return;
    const correct = selected === mcq.answer_index;
    setChecked(true);
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
    onAttemptSaved?.();
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <Sparkles size={20} /> Adaptive MCQ
      </div>
      <div className="grid-form">
        {["exam", "subject", "topic", "difficulty"].map((field) => (
          <input key={field} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
        ))}
      </div>
      <button onClick={generate} disabled={!apiReady}>Generate Question</button>
      {mcq && (
        <div className="question">
          <strong>{mcq.question}</strong>
          {mcq.options?.map((option, index) => (
            <button
              type="button"
              className={`option-btn ${selected === index ? "option-selected" : ""}`}
              onClick={() => setSelected(index)}
              key={`${option}-${index}`}
            >
              {String.fromCharCode(65 + index)}. {option}
            </button>
          ))}
          <div className="row">
            <button onClick={submitAttempt} disabled={selected == null || checked}>
              Submit Answer
            </button>
          </div>
          {checked && (
            <div className="answer">
              {selected === mcq.answer_index ? "Correct." : `Not quite. Correct option: ${String.fromCharCode(65 + mcq.answer_index)}.`}
              {" "}
              {mcq.explanation}
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
      setError("Set VITE_API_URL to your Render backend URL in Vercel, then redeploy.");
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
      </div>
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
      alert("Set VITE_API_URL to your Render backend URL in Vercel, then redeploy.");
      return;
    }
    setLoading(true);
    try {
      const Razorpay = await loadRazorpayScript();
      const { order, key_id } = await apiJson("/api/create-order", { method: "POST", body: "{}" });
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
          await fetch(`${API_URL}/api/verify-payment`, {
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
      instance.open();
    } catch (err) {
      alert(err?.message || "Unable to open checkout");
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
      <p>Unlimited doubts, mock tests, flashcards, UPSC answer evaluation, and study planner.</p>
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
  const missingSupabase = !supabase;
  const missingApi = !API_CONFIGURED;

  const exam = profile?.user?.exam || "JEE";

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
    if (!session) return;
    await apiJson("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ exam: nextExam }),
    });
    await loadProfile();
  }

  return (
    <main>
      {missingSupabase && (
        <div className="setup-banner">
          Frontend env vars are missing. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel, then redeploy.
        </div>
      )}
      {missingApi && (
        <div className="setup-banner warning">
          Frontend API URL is missing. Set `VITE_API_URL` to your Render backend URL in Vercel, then redeploy.
        </div>
      )}
      <nav>
        <div className="brand"><Flame size={22} /> VidyaAI</div>
        <AuthPanel session={session} canAuth={!missingSupabase} />
      </nav>
      <section className="hero">
        <div>
          <div className="hero-title">India's AI prep coach for JEE, NEET, and UPSC</div>
          <div className="hero-copy">Adaptive practice, quick doubt-solving, and a study flow that learns what you keep missing.</div>
        </div>
        <div className="hero-controls">
          <ExamSelector exam={exam} onChange={changeExam} />
        </div>
      </section>
      <section className="stats">
        <StatCard icon={GraduationCap} label="Selected Exam" value={stats.exam} />
        <StatCard icon={CreditCard} label="Plan" value={stats.plan} />
        <StatCard icon={BarChart3} label="Doubt Quota" value={stats.doubts} muted={session ? "Last 24 hours" : "Login required"} />
      </section>
      <div className="layout">
        <DoubtSolver exam={exam} apiReady={!missingApi} />
        <MCQGenerator exam={exam} apiReady={!missingApi} onAttemptSaved={() => setRefreshKey((value) => value + 1)} />
        <Performance refreshKey={refreshKey} />
        <StudyPlanner exam={exam} apiReady={!missingApi} />
        <Pricing user={profile?.user} apiReady={!missingApi} onUpgraded={loadProfile} />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
