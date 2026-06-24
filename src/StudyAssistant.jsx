import { useState, useRef, useCallback } from "react";

// ── Palette & fonts loaded via Google Fonts in index.html, injected via style tag ──
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0d0f14;
    --surface:  #13161d;
    --panel:    #1a1e28;
    --border:   #252a38;
    --accent:   #c8f135;
    --accent2:  #4af0c4;
    --accent3:  #ff6b6b;
    --text:     #e8ecf4;
    --muted:    #636980;
    --card-bg:  #1e2230;
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%,100% { opacity: 1; } 50% { opacity: 0.4; }
  }
  @keyframes flip {
    0%   { transform: rotateY(0deg); }
    50%  { transform: rotateY(90deg); }
    100% { transform: rotateY(0deg); }
  }
`;


// ── Demo fallback data (used if API fails during demo) ───────────────────────
const DEMO_NOTES = `Machine Learning is a subset of artificial intelligence that enables 
systems to learn and improve from experience without being explicitly programmed. 
Key concepts include supervised learning, unsupervised learning, and reinforcement learning.
Neural networks are computing systems inspired by biological neural networks in the brain.
Deep learning uses multiple layers of neural networks to learn representations of data.
Training data is used to teach models, while test data evaluates their performance.`;

const DEMO_FALLBACKS = {
  summary: `**TL;DR:** Machine Learning enables computers to learn from data without explicit programming.

**Core Concepts:**
- **Supervised Learning** — Model learns from labeled training data to make predictions
- **Unsupervised Learning** — Model finds hidden patterns in unlabeled data
- **Reinforcement Learning** — Model learns by trial and error with rewards/penalties
- **Neural Networks** — Computing systems inspired by the human brain
- **Deep Learning** — Multi-layered neural networks for complex pattern recognition

**Key Terms:**
- **Training Data** — Dataset used to teach the model
- **Test Data** — Dataset used to evaluate model performance
- **Overfitting** — When a model memorizes training data but fails on new data`,

  quiz: [
    {
      q: "What is Machine Learning?",
      options: {
        A: "A programming language for building apps",
        B: "A subset of AI that enables systems to learn from experience",
        C: "A type of computer hardware",
        D: "A database management system"
      },
      answer: "B",
      explanation: "Machine Learning is a subset of AI that allows systems to learn and improve from experience without being explicitly programmed."
    },
    {
      q: "Which type of learning uses labeled training data?",
      options: {
        A: "Unsupervised Learning",
        B: "Reinforcement Learning",
        C: "Supervised Learning",
        D: "Deep Learning"
      },
      answer: "C",
      explanation: "Supervised Learning trains models on labeled data where the correct output is already known."
    },
    {
      q: "What are neural networks inspired by?",
      options: {
        A: "Computer circuits",
        B: "Biological neural networks in the brain",
        C: "Mathematical equations",
        D: "Database structures"
      },
      answer: "B",
      explanation: "Neural networks are computing systems modeled after the biological neural networks found in animal brains."
    },
    {
      q: "What is overfitting?",
      options: {
        A: "When a model is too simple to learn patterns",
        B: "When training data is too large",
        C: "When a model memorizes training data but fails on new data",
        D: "When a model trains too slowly"
      },
      answer: "C",
      explanation: "Overfitting occurs when a model learns the training data too well, including its noise, and performs poorly on unseen data."
    },
    {
      q: "What does Deep Learning use?",
      options: {
        A: "Single-layer neural networks",
        B: "Multiple layers of neural networks",
        C: "Traditional programming rules",
        D: "Only supervised learning"
      },
      answer: "B",
      explanation: "Deep Learning uses multiple layers of neural networks to learn complex representations and patterns from data."
    }
  ],

  flashcards: [
    { front: "Machine Learning", back: "A subset of AI that enables systems to learn and improve from experience without explicit programming." },
    { front: "Supervised Learning", back: "A type of ML where the model is trained on labeled data with known correct outputs." },
    { front: "Unsupervised Learning", back: "A type of ML where the model finds hidden patterns in data without labeled examples." },
    { front: "Neural Network", back: "A computing system inspired by biological neural networks in the human brain." },
    { front: "Deep Learning", back: "ML using multiple layers of neural networks to learn complex data representations." },
    { front: "Training Data", back: "The dataset used to teach a machine learning model." },
    { front: "Overfitting", back: "When a model memorizes training data too well and fails to generalize to new data." },
    { front: "Reinforcement Learning", back: "ML where an agent learns by taking actions and receiving rewards or penalties." }
  ],

  explain: `**Machine Learning** is like teaching a child to recognize cats 🐱

**The Simple Version (ELI10):**
Imagine you show a child 1000 pictures of cats and say "this is a cat" each time. After a while, the child can look at a NEW picture they've never seen and say "that's a cat!" — without you telling them the rules of what makes a cat.

Machine Learning works the same way! Instead of a child, it's a computer program. Instead of eyes, it uses math.

**The key idea:**
> "Don't write rules. Show examples. Let the machine figure out the rules itself."

**Three main types:**
1. **Supervised** — You provide labeled examples (like showing cat pictures with labels)
2. **Unsupervised** — The machine groups similar things on its own
3. **Reinforcement** — The machine learns by trial and error, like a video game player getting points

**Real world examples:**
- Netflix recommending shows you'll like
- Gmail filtering spam emails
- Your phone recognizing your face`
};

// ── Updated callClaude with automatic demo fallback ───────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  try {
    const res = await fetch("http://localhost:3001/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Server error ${res.status}`);
    }

    const data = await res.json();
    return data.content.map((b) => b.text || "").join("");

  } catch (err) {
    // ── API failed → return demo fallback silently ──────────────────────────
    console.warn("API failed, using demo fallback:", err.message);
    return getDemoFallback(systemPrompt);
  }
}

// ── Pick the right fallback based on what was requested ──────────────────────
function getDemoFallback(systemPrompt) {
  const s = systemPrompt.toLowerCase();
  if (s.includes("quiz") || s.includes("multiple-choice")) {
    return JSON.stringify(DEMO_FALLBACKS.quiz);
  }
  if (s.includes("flashcard")) {
    return JSON.stringify(DEMO_FALLBACKS.flashcards);
  }
  if (s.includes("summarize") || s.includes("summary")) {
    return DEMO_FALLBACKS.summary;
  }
  // Default → explainer
  return DEMO_FALLBACKS.explain;
}

// ── Anthropic API helper ──────────────────────────────────────────────────────
// async function callClaude(systemPrompt, userPrompt) {
//   const res = await fetch("http://localhost:3001/api/claude", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       model: "claude-sonnet-4-6",
//       max_tokens: 3500,
//       system: systemPrompt,
//       messages: [{ role: "user", content: userPrompt }],
//     }),
//   });
 
//   if (!res.ok) {
//     const err = await res.json();
//     throw new Error(err.error?.message || `Server error ${res.status}`);
//   }
 
//   const data = await res.json();
//   return data.content.map((b) => b.text || "").join("");
// }

// ── Shared UI primitives ──────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{
    width: 20, height: 20, border: "2px solid var(--border)",
    borderTopColor: "var(--accent)", borderRadius: "50%",
    animation: "spin .7s linear infinite", flexShrink: 0
  }} />
);

const Tag = ({ children, color = "var(--accent)" }) => (
  <span style={{
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1,
    padding: "2px 8px", border: `1px solid ${color}`, borderRadius: 3,
    color, textTransform: "uppercase"
  }}>{children}</span>
);

const Section = ({ children, delay = 0 }) => (
  <div style={{ animation: `fadeUp .45s ease both`, animationDelay: `${delay}ms` }}>
    {children}
  </div>
);

// ── UPLOAD ZONE ───────────────────────────────────────────────────────────────
function UploadZone({ onTextReady }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [pasting, setPasting] = useState(false);
  const [textInput, setTextInput] = useState("");
  const fileRef = useRef();

  const processFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    if (file.type === "application/pdf") {
      // Read as base64 and send to Claude for extraction
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1];
        try {
          const res = await fetch("http://localhost:3001/api/claude", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 3500,
              messages: [{
                role: "user",
                content: [
                  { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                  { type: "text", text: "Extract and return ALL the text content from this PDF document. Return only the text, no commentary." }
                ]
              }]
            })
          });
          const data = await res.json();
          const text = data.content.map(b => b.text || "").join("");
          onTextReady(text, file.name);
        } catch (err) {
          onTextReady(`[Could not parse PDF: ${err.message}]`, file.name);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => onTextReady(e.target.result, file.name);
      reader.readAsText(file);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 12, padding: "40px 24px", textAlign: "center",
          cursor: "pointer", transition: "all .2s",
          background: dragging ? "rgba(200,241,53,.04)" : "var(--panel)",
          position: "relative", overflow: "hidden"
        }}
      >
        <input ref={fileRef} type="file" accept=".pdf,.txt,.md" hidden
          onChange={(e) => processFile(e.target.files[0])} />
        <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          {fileName || "Drop your notes here"}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>PDF, TXT, or Markdown · click or drag</div>
        {dragging && <div style={{
          position: "absolute", inset: 0, border: "2px solid var(--accent)",
          borderRadius: 12, pointerEvents: "none",
          boxShadow: "inset 0 0 40px rgba(200,241,53,.08)"
        }} />}
      </div>

      {/* Or paste text */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ color: "var(--muted)", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>or paste text</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <textarea
        placeholder="Paste your lecture notes, textbook excerpts, or any study material here…"
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        style={{
          background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10,
          color: "var(--text)", fontFamily: "'DM Sans', sans-serif", fontSize: 13,
          padding: "14px 16px", resize: "vertical", minHeight: 120, outline: "none",
          lineHeight: 1.6
        }}
      />
      <button
        disabled={!textInput.trim()}
        onClick={() => { onTextReady(textInput, "Pasted text"); setTextInput(""); }}
        style={{
          background: "var(--accent)", color: "#0d0f14", border: "none",
          borderRadius: 8, padding: "11px 20px", fontFamily: "'Syne', sans-serif",
          fontWeight: 700, fontSize: 13, cursor: textInput.trim() ? "pointer" : "not-allowed",
          opacity: textInput.trim() ? 1 : 0.4, letterSpacing: .5, transition: "opacity .2s"
        }}
      >
        Study This →
      </button>
    </div>
  );
}

// ── SUMMARY PANEL ─────────────────────────────────────────────────────────────
function SummaryPanel({ notes }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true); setSummary("");
    try {
      const text = await callClaude(
        "You are an expert academic tutor. Summarize concisely and clearly.",
        `Summarize the following study material. Use markdown with **bold** for key terms, bullet points for main ideas, and a short TL;DR at the top.\n\n${notes.slice(0, 8000)}`
      );
      setSummary(text);
    } catch (e) { setSummary("Error: " + e.message); }
    setLoading(false);
  };

  return (
    <div>
      {!summary && !loading && (
        <button onClick={generate} style={btnStyle("var(--accent2)")}>
          ✨ Generate Summary
        </button>
      )}
      {loading && <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--muted)" }}>
        <Spinner /> Summarizing…
      </div>}
      {summary && <MarkdownView text={summary} onReset={() => setSummary("")} resetLabel="Re-summarize" />}
    </div>
  );
}

// ── QUIZ PANEL ────────────────────────────────────────────────────────────────
function QuizPanel({ notes }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);

  const generate = async () => {
    setLoading(true); setQuestions([]); setAnswers({}); setRevealed({}); setScore(null);
    try {
      const raw = await callClaude(
        "You are a quiz generator. Always respond with ONLY valid JSON, no markdown.",
        `Create 5 multiple-choice questions from this material. Each question has 4 options (A-D) and one correct answer.

Return JSON array like:
[{"q":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"..."}]

Material:\n${notes.slice(0, 6000)}`
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      setQuestions(JSON.parse(clean));
    } catch (e) { setQuestions([{ q: "Error generating quiz: " + e.message, options: {}, answer: "", explanation: "" }]); }
    setLoading(false);
  };

  const pick = (qi, opt) => {
    if (revealed[qi]) return;
    setAnswers(a => ({ ...a, [qi]: opt }));
  };

  const revealAll = () => {
    const r = {}; questions.forEach((_, i) => r[i] = true); setRevealed(r);
    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    setScore(correct);
  };

  const optColor = (qi, opt) => {
    if (!revealed[qi]) return answers[qi] === opt ? "rgba(200,241,53,.15)" : "var(--card-bg)";
    if (opt === questions[qi].answer) return "rgba(74,240,196,.18)";
    if (opt === answers[qi]) return "rgba(255,107,107,.18)";
    return "var(--card-bg)";
  };
  const optBorder = (qi, opt) => {
    if (!revealed[qi]) return answers[qi] === opt ? "var(--accent)" : "var(--border)";
    if (opt === questions[qi].answer) return "var(--accent2)";
    if (opt === answers[qi]) return "var(--accent3)";
    return "var(--border)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {!questions.length && !loading && (
        <button onClick={generate} style={btnStyle("var(--accent)")}>
          🧠 Generate Quiz
        </button>
      )}
      {loading && <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--muted)" }}>
        <Spinner /> Building questions…
      </div>}
      {score !== null && (
        <div style={{
          background: score >= 4 ? "rgba(74,240,196,.1)" : score >= 3 ? "rgba(200,241,53,.1)" : "rgba(255,107,107,.1)",
          border: `1px solid ${score >= 4 ? "var(--accent2)" : score >= 3 ? "var(--accent)" : "var(--accent3)"}`,
          borderRadius: 10, padding: "14px 18px", fontFamily: "'Syne', sans-serif",
          fontWeight: 700, fontSize: 16
        }}>
          {score >= 4 ? "🏆" : score >= 3 ? "👍" : "📚"} Score: {score}/{questions.length} — {score >= 4 ? "Excellent!" : score >= 3 ? "Good work!" : "Keep studying!"}
        </div>
      )}
      {questions.map((q, qi) => (
        <div key={qi} style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)" }}>Q{qi + 1}</div>
          <div style={{ fontWeight: 500, lineHeight: 1.5 }}>{q.q}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(q.options || {}).map(([opt, val]) => (
              <button key={opt} onClick={() => pick(qi, opt)} style={{
                background: optColor(qi, opt), border: `1px solid ${optBorder(qi, opt)}`,
                borderRadius: 8, padding: "10px 14px", color: "var(--text)", cursor: revealed[qi] ? "default" : "pointer",
                textAlign: "left", fontSize: 13, transition: "all .15s", lineHeight: 1.4
              }}>
                <span style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted)", marginRight: 8 }}>{opt}</span>
                {val}
              </button>
            ))}
          </div>
          {revealed[qi] && q.explanation && (
            <div style={{ fontSize: 13, color: "var(--accent2)", borderLeft: "2px solid var(--accent2)", paddingLeft: 12, lineHeight: 1.6 }}>
              {q.explanation}
            </div>
          )}
        </div>
      ))}
      {questions.length > 0 && !score && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            disabled={Object.keys(answers).length < questions.length}
            onClick={revealAll}
            style={btnStyle("var(--accent)", Object.keys(answers).length < questions.length ? 0.4 : 1)}
          >
            Check Answers
          </button>
          <button onClick={generate} style={btnStyle("transparent", 1, "var(--border)", "var(--muted)")}>
            New Quiz
          </button>
        </div>
      )}
      {score !== null && (
        <button onClick={generate} style={btnStyle("var(--accent)")}>🔄 Try Again</button>
      )}
    </div>
  );
}

// ── FLASHCARDS PANEL ──────────────────────────────────────────────────────────
function FlashcardsPanel({ notes }) {
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [known, setKnown] = useState([]);

  const generate = async () => {
    setLoading(true); setCards([]); setIdx(0); setFlipped(false); setKnown([]);
    try {
      const raw = await callClaude(
        "You are a flashcard generator. Always respond with ONLY valid JSON, no markdown.",
        `Create 8 flashcards from this material. Each card has a front (term/question) and back (definition/answer).

Return JSON array like:
[{"front":"...","back":"..."}]

Material:\n${notes.slice(0, 6000)}`
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      setCards(JSON.parse(clean));
    } catch (e) { setCards([{ front: "Error", back: e.message }]); }
    setLoading(false);
  };

  const active = cards.filter((_, i) => !known.includes(i));
  const card = active[idx % Math.max(active.length, 1)];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {!cards.length && !loading && (
        <button onClick={generate} style={btnStyle("#c084fc")}>
          🃏 Generate Flashcards
        </button>
      )}
      {loading && <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--muted)" }}>
        <Spinner /> Creating cards…
      </div>}
      {active.length === 0 && cards.length > 0 && (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          background: "rgba(74,240,196,.08)", border: "1px solid var(--accent2)",
          borderRadius: 12
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>All done!</div>
          <div style={{ color: "var(--muted)", marginBottom: 16 }}>You've been through all {cards.length} cards.</div>
          <button onClick={() => { setKnown([]); setIdx(0); setFlipped(false); }} style={btnStyle("var(--accent2)")}>
            Start Over
          </button>
        </div>
      )}
      {card && active.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Tag color="var(--muted)">{active.length} remaining</Tag>
            <Tag color="var(--accent2)">{known.length} known</Tag>
          </div>
          {/* Card */}
          <div
            onClick={() => setFlipped(f => !f)}
            style={{
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: 16, minHeight: 200, padding: "32px 28px",
              cursor: "pointer", display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "center", textAlign: "center",
              gap: 12, position: "relative", userSelect: "none",
              transition: "border-color .2s, box-shadow .2s",
              boxShadow: flipped ? "0 0 0 1px var(--accent2), 0 8px 32px rgba(74,240,196,.1)" : "none"
            }}
          >
            <div style={{ position: "absolute", top: 14, right: 16, fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--muted)" }}>
              {flipped ? "BACK" : "FRONT"} · click to flip
            </div>
            <div style={{
              fontFamily: flipped ? "'DM Sans', sans-serif" : "'Syne', sans-serif",
              fontWeight: flipped ? 400 : 700, fontSize: flipped ? 14 : 18,
              lineHeight: 1.5, color: flipped ? "var(--accent2)" : "var(--text)",
              animation: "fadeUp .25s ease"
            }}>
              {flipped ? card.back : card.front}
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => {
              const globalIdx = cards.indexOf(card);
              setKnown(k => [...k, globalIdx]);
              setFlipped(false);
            }} style={btnStyle("rgba(74,240,196,.15)", 1, "var(--accent2)", "var(--accent2)")}>
              ✓ Got it
            </button>
            <button onClick={() => {
              setIdx(i => i + 1); setFlipped(false);
            }} style={btnStyle("var(--card-bg)", 1, "var(--border)", "var(--text)")}>
              Skip →
            </button>
            <button onClick={generate} style={btnStyle("transparent", 1, "var(--border)", "var(--muted)")} title="New cards">
              🔄
            </button>
          </div>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {cards.map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                background: known.includes(i) ? "var(--accent2)" : "var(--border)",
                transition: "background .3s"
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── EXPLAIN PANEL ─────────────────────────────────────────────────────────────
function ExplainPanel({ notes }) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("simple");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const explain = async () => {
    if (!topic.trim()) return;
    setLoading(true); setResult("");
    const levelDesc = { simple: "a 10-year-old", teen: "a high school student", college: "a college student", expert: "a graduate student" };
    try {
      const text = await callClaude(
        `You are a brilliant tutor who can explain anything clearly. You always use analogies, examples, and simple language appropriate for the audience. Use markdown formatting.`,
        `Explain "${topic}" as if talking to ${levelDesc[level]}.${notes ? `\n\nContext from student's notes:\n${notes.slice(0, 3000)}` : ""}`
      );
      setResult(text);
    } catch (e) { setResult("Error: " + e.message); }
    setLoading(false);
  };

  const LEVELS = [
    { id: "simple", label: "ELI10", desc: "Like I'm 10" },
    { id: "teen", label: "Teen", desc: "High school" },
    { id: "college", label: "College", desc: "Undergrad" },
    { id: "expert", label: "Expert", desc: "Grad level" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {LEVELS.map(l => (
          <button key={l.id} onClick={() => setLevel(l.id)} style={{
            flex: 1, background: level === l.id ? "var(--accent)" : "var(--panel)",
            border: `1px solid ${level === l.id ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 8, padding: "8px 6px", cursor: "pointer",
            color: level === l.id ? "#0d0f14" : "var(--muted)", transition: "all .15s"
          }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700 }}>{l.label}</div>
            <div style={{ fontSize: 10, marginTop: 2 }}>{l.desc}</div>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && explain()}
          placeholder="What topic would you like explained?"
          style={{
            flex: 1, background: "var(--panel)", border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--text)", fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, padding: "11px 14px", outline: "none"
          }}
        />
        <button onClick={explain} disabled={!topic.trim() || loading} style={btnStyle("var(--accent)", topic.trim() && !loading ? 1 : 0.4)}>
          {loading ? <Spinner /> : "Explain →"}
        </button>
      </div>
      {result && <MarkdownView text={result} onReset={() => setResult("")} resetLabel="Clear" />}
    </div>
  );
}

// ── MARKDOWN RENDERER (simple) ────────────────────────────────────────────────
function MarkdownView({ text, onReset, resetLabel }) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, `<code style="background:var(--panel);padding:1px 5px;border-radius:3px;font-family:'DM Mono',monospace;font-size:.9em">$1</code>`)
    .replace(/^### (.+)$/gm, `<h3 style="font-family:'Syne',sans-serif;font-size:15px;margin:18px 0 6px;color:var(--accent)">$1</h3>`)
    .replace(/^## (.+)$/gm, `<h2 style="font-family:'Syne',sans-serif;font-size:17px;margin:20px 0 8px;color:var(--text)">$1</h2>`)
    .replace(/^# (.+)$/gm, `<h1 style="font-family:'Syne',sans-serif;font-size:20px;margin:20px 0 10px;color:var(--accent)">$1</h1>`)
    .replace(/^- (.+)$/gm, `<li style="margin:4px 0;padding-left:4px">$1</li>`)
    .replace(/(<li.*<\/li>\n?)+/g, s => `<ul style="padding-left:20px;margin:8px 0">${s}</ul>`)
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");

  return (
    <div>
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ lineHeight: 1.7, fontSize: 14, color: "var(--text)" }}
      />
      {onReset && (
        <button onClick={onReset} style={{ ...btnStyle("transparent", 1, "var(--border)", "var(--muted)"), marginTop: 14, fontSize: 12 }}>
          {resetLabel}
        </button>
      )}
    </div>
  );
}

// ── Shared button style helper ────────────────────────────────────────────────
function btnStyle(bg, opacity = 1, borderColor, color) {
  return {
    background: bg, opacity, border: `1px solid ${borderColor || (bg === "transparent" ? "var(--border)" : bg)}`,
    borderRadius: 8, padding: "10px 18px", color: color || (bg === "var(--accent)" ? "#0d0f14" : bg === "var(--accent2)" ? "#0d0f14" : "var(--text)"),
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
    cursor: opacity === 1 ? "pointer" : "not-allowed", letterSpacing: .3,
    transition: "all .15s", display: "flex", alignItems: "center", gap: 8
  };
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "summary",    icon: "📋", label: "Summary" },
  { id: "quiz",       icon: "🧠", label: "Quiz" },
  { id: "flashcards", icon: "🃏", label: "Flashcards" },
  { id: "explain",    icon: "💡", label: "Explain" },
];

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const [tab, setTab] = useState("summary");

  const handleText = (text, name) => {
    setNotes(text);
    setFileName(name);
    setTab("summary");
  };

  return (
    <>
      <style>{GLOBAL_STYLE}</style>
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header style={{
          borderBottom: "1px solid var(--border)", padding: "20px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: "#0d0f14", flexShrink: 0
            }}>S</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: -.3 }}>
                StudyAI
              </div>
              <div style={{ color: "var(--muted)", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                AI-Powered Study Assistant
              </div>
            </div>
          </div>
          {fileName && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Tag color="var(--accent)">{fileName.length > 24 ? fileName.slice(0, 22) + "…" : fileName}</Tag>
              <button onClick={() => { setNotes(""); setFileName(""); }}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          )}
        </header>

        <main style={{ flex: 1, maxWidth: 820, width: "100%", margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 28 }}>
          {!notes ? (
            <Section>
              <div style={{ marginBottom: 28, textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, lineHeight: 1.15, marginBottom: 10 }}>
                  Drop your notes,<br /><span style={{ color: "var(--accent)" }}>ace your exam.</span>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 15, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
                  Upload any study material and get instant summaries, quizzes, flashcards, and plain-English explanations.
                </div>
              </div>
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 16, padding: "28px 24px"
              }}>
                <UploadZone onTextReady={handleText} />
              </div>
              {/* Feature pills */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 24 }}>
                {["📋 Smart Summaries", "🧠 Auto Quiz", "🃏 Flashcards", "💡 Topic Explainer"].map(f => (
                  <div key={f} style={{
                    background: "var(--panel)", border: "1px solid var(--border)",
                    borderRadius: 20, padding: "6px 14px", fontSize: 13, color: "var(--muted)"
                  }}>{f}</div>
                ))}
              </div>
            </Section>
          ) : (
            <Section>
              {/* Tab bar */}
              <div style={{
                display: "flex", gap: 4, background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 12, padding: 4, marginBottom: 24
              }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    flex: 1, background: tab === t.id ? "var(--accent)" : "transparent",
                    border: "none", borderRadius: 9, padding: "9px 8px", cursor: "pointer",
                    color: tab === t.id ? "#0d0f14" : "var(--muted)",
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
                    transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}>
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Panel */}
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 16, padding: "24px 22px",
                animation: "fadeUp .3s ease"
              }}>
                {tab === "summary"    && <SummaryPanel    notes={notes} />}
                {tab === "quiz"       && <QuizPanel       notes={notes} />}
                {tab === "flashcards" && <FlashcardsPanel notes={notes} />}
                {tab === "explain"    && <ExplainPanel    notes={notes} />}
              </div>

              {/* Notes preview */}
              <details style={{ marginTop: 16 }}>
                <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 12, fontFamily: "'DM Mono', monospace", userSelect: "none" }}>
                  view raw notes ({notes.length.toLocaleString()} chars)
                </summary>
                <div style={{
                  marginTop: 10, background: "var(--panel)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "14px 16px", fontSize: 12, fontFamily: "'DM Mono', monospace",
                  color: "var(--muted)", lineHeight: 1.6, maxHeight: 200, overflowY: "auto",
                  whiteSpace: "pre-wrap", wordBreak: "break-word"
                }}>
                  {notes.slice(0, 2000)}{notes.length > 2000 ? "\n\n…" : ""}
                </div>
              </details>
            </Section>
          )}
        </main>
      </div>
    </>
  );
}
