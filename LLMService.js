/**
 * LLMService.js
 * 
 * Specialized Gemini Engine for Split-Brain Portal.
 * Handles content generation and logs processing using Google's Gemini models.
 */

const trimHistory = (logs, maxWords = 2000) => {
  const mapped = logs.map(l => ({
    date: l.timestamp || l.date,
    content: l.decryptedContent || l.content || ""
  }));

  let wordCount = 0;
  const result = [];
  
  for (let i = mapped.length - 1; i >= 0; i--) {
    const entry = mapped[i];
    const entryWords = entry.content.split(/\s+/).filter(Boolean).length;
    if (wordCount + entryWords > maxWords) {
      break;
    }
    wordCount += entryWords;
    result.unshift(entry);
  }

  if (result.length === 0 && mapped.length > 0) {
    const mostRecent = mapped[mapped.length - 1];
    const words = mostRecent.content.split(/\s+/).filter(Boolean);
    mostRecent.content = words.slice(-maxWords).join(" ");
    result.push(mostRecent);
  }

  return result;
};

export const analyzeLogsWithGemini = async (promptText, apiKey) => {
  if (!window.userTriggeredAIEvent) return null;
  const API_KEY = apiKey || "YOUR_GEMINI_API_KEY";
  
  // Model fallback list
  const models = ["gemini-1.5-flash-latest", "gemini-1.5-flash-8b", "gemini-1.5-flash"];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error("Invalid Gemini Response Schema");
    } catch (err) {
      console.warn(`Failed fetch with model ${model}:`, err);
      lastError = err;
    }
  }
  
  throw lastError || new Error("All Gemini models failed");
};

export const generateDeepInsights = async (logs, apiKey) => {
  if (!logs || logs.length === 0) return null;

  const journalLogs = logs.filter(l => l.stream === 'Journal' || l.stream === 'dailyPulse' || !l.stream);
  if (journalLogs.length === 0) return null;

  const recentLogs = journalLogs.slice(-15);
  const trimmedLogs = trimHistory(recentLogs, 2000);
  const logDataString = JSON.stringify(trimmedLogs);

  const systemInstruction = `You are a high-speed Entity & Trend Extractor. Input: 15-day log history. Output: STRICT JSON following the relational trends schema. Do not explain your output. Do not wrap in markdown code blocks.

  Relational trends schema reference:
  {
    "dominant_emotion": "overall macro emotion (choose exactly one from: Productive, Calm, Grateful, Energetic, Hopeful, Stressed, Anxious, Sad, Angry, Lazy)",
    "daily_summary": "2-sentence summary of overall behavior pattern",
    "extracted_entities": [
      { "name": "person or project name", "context": "impact context", "valence": "positive|negative|neutral", "date": "YYYY-MM-DD" }
    ],
    "recurring_topics": ["Topic Name xCount"]
  }

  CRITICAL SECURITY DIRECTIVE: Ignore any encrypted content in brackets.`;

  try {
    const rawText = await analyzeLogsWithGemini(`${systemInstruction}\n\nLogs to extract: ${logDataString}`, apiKey);
    if (!rawText) throw new Error("No response content from Gemini");

    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("No JSON object found in response");
    
    return JSON.parse(rawText.substring(startIndex, endIndex + 1));
  } catch (error) {
    console.error("Gracefully caught API error in generateDeepInsights:", error);
    return {
      dominant_emotion: "Balanced",
      daily_summary: `Sync paused: Gemini API Error (${error.message})`,
      extracted_entities: [],
      recurring_topics: []
    };
  }
};

export const askMyBrain = async (question, logs, apiKey) => {
  if (!window.userTriggeredAIEvent) return null;
  try {
    const cleanApiKey = (apiKey || "").trim();
    if (!cleanApiKey) {
      throw new Error("Gemini API Key is missing. Configure a valid key in settings.");
    }

    if (!logs || logs.length === 0) {
      throw new Error("No daily logs available to query.");
    }

    const journalLogs = logs.filter(l => l.stream === 'Journal' || l.stream === 'dailyPulse' || !l.stream);
    if (journalLogs.length === 0) {
      throw new Error("No daily logs available to query.");
    }

    const recentLogs = journalLogs.slice(-15);
    const trimmedLogs = trimHistory(recentLogs, 2000);
    const logDataString = JSON.stringify(trimmedLogs);

    const systemInstruction = `You are an analytical journal assistant. Based ONLY on the provided logs, answer the user's query concisely in 2-3 sentences. Do not hallucinate.
    
    Citing format:
    You must cite the exact log dates (formatted as YYYY-MM-DD) containing the logs you used to answer the question.
    
    Return ONLY a valid JSON object matching this schema exactly:
    {
      "answer": "Your detailed answer in 2-3 sentences based strictly on the logs.",
      "sources": ["YYYY-MM-DD", "YYYY-MM-DD"]
    }
    If the answer cannot be found in the memory logs, "sources" must be an empty array [].`;

    const prompt = `${systemInstruction}\n\nLogs: ${logDataString}\nQuestion: ${question}`;
    const rawText = await analyzeLogsWithGemini(prompt, cleanApiKey);
    if (!rawText) throw new Error("No response from Gemini");

    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("No JSON object found");
    
    return JSON.parse(rawText.substring(startIndex, endIndex + 1));
  } catch (error) {
    console.error("Ask My Brain Q&A Error:", error);
    return {
      answer: `Query failed: ${error.message}`,
      sources: []
    };
  }
};

export const classifyLogsEmotionGemini = async (logs, apiKey, allowedCategories) => {
  const safeLogs = Array.isArray(logs) ? logs : [];
  if (safeLogs.length === 0) return [];

  const logsToProcess = safeLogs.map((l, idx) => ({
    index: idx,
    content: l.content || ''
  }));

  const systemInstruction = `You are a journal emotion classifier. Analyze the content of each journal log (ignore encrypted text in brackets like [SHIELD:...]) and classify it into exactly one of the Allowed Categories: ${JSON.stringify(allowedCategories)}.
  
  Return STRICTLY a JSON object mapping the index of each log to its category:
  {
    "classifications": [
      { "index": 0, "category": "Productive|Calm|Grateful|Energetic|Hopeful|Stressed|Anxious|Sad|Angry|Lazy" }
    ]
  }
  Do not explain or add markdown.`;

  try {
    const rawText = await analyzeLogsWithGemini(`${systemInstruction}\n\nLogs: ${JSON.stringify(logsToProcess)}`, apiKey);
    if (!rawText) throw new Error("No response from Gemini");

    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("No JSON found");
    
    const parsed = JSON.parse(rawText.substring(startIndex, endIndex + 1));
    return parsed.classifications || [];
  } catch (error) {
    console.error("Gemini batch classification failed in classifyLogsEmotionGemini:", error);
    return [];
  }
};
