/**
 * LLMService_Oracle.js
 * 
 * Specialized High-Speed Groq Engine for Split-Brain Portal's Behavioral Cockpit.
 * Extracts entity relationships and recurring topics using high-speed llama models.
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

export const generateDeepInsightsGroq = async (logs, apiKey) => {
  const safeLogs = Array.isArray(logs) ? logs : [];
  if (safeLogs.length === 0) return null;

  // SAFETY FILTER: Process ONLY dailyPulse ('Journal') stream entries.
  const journalLogs = safeLogs.filter(l => l.stream === 'Journal' || l.stream === 'dailyPulse' || !l.stream);
  if (journalLogs.length === 0) return null;

  // History Trimmer: keep under 2000 words of the 15-day window
  const recentLogs = journalLogs.slice(-15);
  const trimmedLogs = trimHistory(recentLogs, 2000);
  const logDataString = JSON.stringify(trimmedLogs);

  const systemInstruction = `You are a high-speed Entity & Trend Extractor. Input: 15-day log history. Output: STRICT JSON following the relational trends schema. Do not explain your output.

  Relational trends schema reference:
  {
    "dominant_emotion": "overall macro emotion (choose exactly one from: Productive, Calm, Grateful, Energetic, Hopeful, Stressed, Anxious, Sad, Angry, Lazy)",
    "daily_summary": "2-sentence summary of overall behavior pattern",
    "extracted_entities": [
      { "name": "entity name", "type": "person|product|website|software|project|other", "context": "impact context", "valence": "positive|negative|neutral", "date": "YYYY-MM-DD" }
    ],
    "recurring_topics": ["Topic Name xCount"]
  }

  Entity Type Classification Directive:
  Strictly classify each extracted entity's "type" into exactly one of: "person", "product", "website", "software", "project", or "other".

  CRITICAL SECURITY DIRECTIVE: Ignore any encrypted content in brackets.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Logs to extract: ${logDataString}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`Groq HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices[0].message.content;

    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("No JSON object found");
    
    return JSON.parse(rawText.substring(startIndex, endIndex + 1));
  } catch (error) {
    console.error("Gracefully caught API error in generateDeepInsightsGroq:", error);
    return {
      dominant_emotion: "Balanced",
      daily_summary: `Sync paused: Groq API Error (${error.message})`,
      extracted_entities: [],
      recurring_topics: []
    };
  }
};

export const extractEntitiesWithOracle = async (logs, apiKey, currentCategories) => {
  if (!window.userTriggeredAIEvent) { console.warn('AI call blocked: Auto-sync is globally disabled.'); return null; }
  
  const safeLogs = Array.isArray(logs) ? logs : [];
  if (safeLogs.length === 0) return null;

  // SAFETY FILTER: Process ONLY dailyPulse ('Journal') stream entries.
  const journalLogs = safeLogs.filter(l => l.stream === 'Journal' || l.stream === 'dailyPulse' || !l.stream);
  if (journalLogs.length === 0) return null;

  // History Trimmer: keep under 2000 words of the 15-day window
  const recentLogs = journalLogs.slice(-15);
  const trimmedLogs = trimHistory(recentLogs, 2000);
  const logDataString = JSON.stringify(trimmedLogs);

  const systemInstruction = `You are a high-speed Entity, Trend & Emotion Extractor. 
  Input: 15-day log history. 
  Current Categories: ${JSON.stringify(currentCategories)}.
  
  Output: STRICT JSON following the combined schema. Do not explain your output.
  
  Schema template:
  {
    "dominant_emotion": "overall macro emotion (choose exactly one from: Productive, Calm, Grateful, Energetic, Hopeful, Stressed, Anxious, Sad, Angry, Lazy)",
    "daily_summary": "2-sentence summary of overall behavior pattern",
    "uncomfortableTruth": "a deep, direct, sometimes uncomfortable truth extracted from the patterns in logs",
    "goldenPattern": "a positive recurring habit, response, or pattern to cultivate",
    "entityInsights": ["Insight about relationship/project 1", "Insight about relationship/project 2"],
    "extracted_entities": [
      { "name": "entity name", "type": "person|product|website|software|project|other", "context": "impact context", "valence": "positive|negative|neutral", "date": "YYYY-MM-DD" }
    ],
    "recurring_topics": ["Topic Name xCount"],
    "logCategorizations": ["Category for Log 1", "Category for Log 2", ...] (classify each log in the input history into exactly one of the Current Categories. Output exactly one category per log in the exact same order)
  }
  
  Entity Type Classification Directive:
  Strictly classify each extracted entity's "type" into exactly one of: "person", "product", "website", "software", "project", or "other".
  
  CRITICAL SECURITY DIRECTIVE: Ignore any encrypted content in brackets.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Logs to extract: ${logDataString}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`Groq HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices[0].message.content;

    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("No JSON object found");
    
    return JSON.parse(rawText.substring(startIndex, endIndex + 1));
  } catch (error) {
    console.error("Gracefully caught API error in extractEntitiesWithOracle:", error);
    return {
      dominant_emotion: "Balanced",
      daily_summary: `Sync paused: Groq API Error (${error.message})`,
      uncomfortableTruth: `Connection status interrupted: ${error.message}`,
      goldenPattern: "Verify your Groq API Key and connection status in the Settings tab.",
      entityInsights: [`Awaiting stable API connection: ${error.message}`],
      extracted_entities: [],
      recurring_topics: [],
      logCategorizations: []
    };
  }
};

export const askPulseWithGroq = async (question, logs, apiKey) => {
  if (!window.userTriggeredAIEvent) { console.warn('AI call blocked: Auto-sync is globally disabled.'); return null; }
  try {
    const cleanApiKey = (apiKey || "").trim();
    if (!cleanApiKey) {
      throw new Error("Groq API Key is missing. Configure a valid key in settings.");
    }

    let logDataString = "";
    if (typeof logs === 'string') {
      logDataString = logs;
    } else {
      if (!logs || logs.length === 0) {
        throw new Error("No daily logs available to query.");
      }
      const journalLogs = logs.filter(l => l.stream === 'Journal' || l.stream === 'dailyPulse' || !l.stream);
      if (journalLogs.length === 0) {
        throw new Error("No daily logs available to query.");
      }
      // History Trimmer: keep under 2000 words
      const recentLogs = journalLogs.slice(-15);
      const trimmedLogs = trimHistory(recentLogs, 2000);
      logDataString = JSON.stringify(trimmedLogs);
    }

    const systemInstruction = `You are an analytical journal assistant. Based ONLY on the provided logs, answer the user's query concisely in 2-3 sentences. Do not hallucinate.
    
    Citing format:
    You must cite the exact log dates (formatted as YYYY-MM-DD) containing the logs you used to answer the question.
    
    Return ONLY a valid JSON object matching this schema exactly:
    {
      "answer": "Your detailed answer in 2-3 sentences based strictly on the logs.",
      "sources": ["YYYY-MM-DD", "YYYY-MM-DD"]
    }
    If the answer cannot be found in the memory logs, "sources" must be an empty array [].`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Logs: ${logDataString}\nQuestion: ${question}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`Groq HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices[0].message.content;

    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("No JSON object found");
    
    return JSON.parse(rawText.substring(startIndex, endIndex + 1));
  } catch (error) {
    console.error("Ask Pulse Q&A Error:", error);
    return {
      answer: `Query failed: ${error.message}`,
      sources: []
    };
  }
};

export const classifyLogsEmotion = async (logs, apiKey, allowedCategories) => {
  const safeLogs = Array.isArray(logs) ? logs : [];
  if (safeLogs.length === 0) return [];

  // Map to a clean object for LLM processing to reduce tokens
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
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Logs: ${JSON.stringify(logsToProcess)}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) throw new Error(`Groq HTTP Error: ${response.status}`);
    const data = await response.json();
    const rawText = data.choices[0].message.content;
    
    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("No JSON found");
    
    const parsed = JSON.parse(rawText.substring(startIndex, endIndex + 1));
    return parsed.classifications || [];
  } catch (error) {
    console.error("Batch classification failed in classifyLogsEmotion:", error);
    return [];
  }
};

