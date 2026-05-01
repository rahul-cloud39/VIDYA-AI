import React, { useState } from "react";

export default function VoiceAssistant() {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setText("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.start();

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  return (
    <div>
      <h2>🎤 Voice Assistant</h2>

      <button onClick={startListening}>
        {listening ? "Listening..." : "Start Talking"}
      </button>

      <p>{text}</p>
    </div>
  );
}
