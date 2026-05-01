import React, { useEffect, useRef, useState } from "react";
import { apiJson } from "./api";

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 60;

export default function HeyGenAvatar({ apiReady }) {
  const [text, setText] = useState(
    "Hello! I am your VidyaAI teacher. Ask me any concept and I will explain step by step."
  );
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [status, setStatus] = useState("idle");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const pollTimerRef = useRef(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollCountRef.current = 0;
  }

  async function pollStatus(videoId) {
    pollCountRef.current += 1;
    try {
      const result = await apiJson(
        `/api/avatar/heygen/status?video_id=${encodeURIComponent(videoId)}`,
        { method: "GET" }
      );
      const apiStatus = (result.status || "").toLowerCase();
      setStatus(apiStatus || "processing");

      if (apiStatus === "completed" && result.video_url) {
        setVideoUrl(result.video_url);
        stopPolling();
        return;
      }

      if (apiStatus === "failed" || result.error) {
        setError(result.error || "HeyGen video generation failed.");
        stopPolling();
        return;
      }

      if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        setError("HeyGen video is taking too long. Try again later.");
        stopPolling();
        return;
      }

      pollTimerRef.current = setTimeout(() => pollStatus(videoId), POLL_INTERVAL_MS);
    } catch (err) {
      setError(err.message || "Unable to check video status");
      stopPolling();
    }
  }

  async function generate() {
    if (!apiReady) {
      setError("Set VITE_API_URL to your backend URL in frontend deployment env, then redeploy.");
      return;
    }
    if (!text.trim()) {
      setError("Type the script first.");
      return;
    }

    stopPolling();
    setError("");
    setVideoUrl("");
    setStatus("submitting");

    try {
      const body = { text };
      if (avatarId.trim()) body.avatar_id = avatarId.trim();
      if (voiceId.trim()) body.voice_id = voiceId.trim();

      const result = await apiJson("/api/avatar/heygen", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!result.video_id) {
        throw new Error("HeyGen did not return a video id.");
      }

      setStatus("processing");
      pollStatus(result.video_id);
    } catch (err) {
      setError(err.message || "Unable to start HeyGen video");
      setStatus("idle");
    }
  }

  const isWorking = status === "submitting" || status === "processing" || status === "pending";

  return (
    <section className="panel">
      <div className="panel-title">
        🎬 AI Avatar (HeyGen)
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Type the script the avatar should speak..."
      />

      <div className="grid-form">
        <label>
          Avatar ID (optional)
          <input
            value={avatarId}
            onChange={(event) => setAvatarId(event.target.value)}
            placeholder="HeyGen avatar_id"
          />
        </label>
        <label>
          Voice ID (optional)
          <input
            value={voiceId}
            onChange={(event) => setVoiceId(event.target.value)}
            placeholder="HeyGen voice_id"
          />
        </label>
      </div>

      <button onClick={generate} disabled={isWorking || !apiReady || text.trim().length < 5}>
        {isWorking ? "Generating video..." : "Generate AI Avatar Video"}
      </button>

      {status !== "idle" && !videoUrl && !error && (
        <div className="answer">
          Status: <strong>{status}</strong>
          {status === "processing" && " — HeyGen is rendering, this can take 30-90 seconds."}
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {videoUrl && (
        <div className="teacher-video-frame" style={{ marginTop: 14 }}>
          <video
            className="teacher-video-player"
            src={videoUrl}
            controls
            autoPlay
            playsInline
          />
        </div>
      )}
    </section>
  );
}
