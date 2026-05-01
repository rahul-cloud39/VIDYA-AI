import React, { useState } from "react";

export default function TeacherStudio({ exam, apiReady }) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");

  const handleAsk = async () => {
    if (!apiReady) {
      setResponse("API not ready");
      return;
    }

    setResponse("AI Answer will come here...");
  };

  return (
    <div>
      <h2>AI Teacher Studio</h2>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask anything..."
      />

      <button onClick={handleAsk}>Ask</button>

      <p>{response}</p>
    </div>
  );
}
