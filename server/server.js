import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "20mb" }));

app.post("/api/claude", async (req, res) => {
  const { system, messages, max_tokens } = req.body;

  try {
    let parts = [];

    // Check if message contains a PDF document (Anthropic format)
    const content = messages[0].content;

    if (Array.isArray(content)) {
      // PDF upload case - convert Anthropic format to Gemini format
      for (const block of content) {
        if (block.type === "document") {
          // Send PDF as inline_data to Gemini
          parts.push({
            inline_data: {
              mime_type: "application/pdf",
              data: block.source.data,
            },
          });
        } else if (block.type === "text") {
          parts.push({ text: block.text });
        }
      }
    } else {
      // Normal text case
      const prompt = system
        ? `${system}\n\nReturn ONLY raw JSON when asked for JSON, no markdown, no backticks.\n\n${content}`
        : content;
      parts = [{ text: prompt }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            maxOutputTokens: 3500,
            temperature: 0.3,
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", JSON.stringify(data));
      return res
        .status(response.status)
        .json({ error: data.error?.message || "Gemini error" });
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip markdown fences
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    console.log("✅ Response preview:", text.slice(0, 120));
    res.json({ content: [{ text }] });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (_, res) => res.json({ status: "✅ StudyAI proxy running" }));
app.listen(3001, () =>
  console.log("✅ Proxy running at http://localhost:3001"),
);
