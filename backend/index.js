const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- START: NEW CORS & LOGGER CONFIGURATION ---

// CRITICAL: REPLACE THIS WITH YOUR ACTUAL FRONTEND URL FROM RENDER
const allowedOrigins = [
  'https://rohit-negi-bot-f.onrender.com' // Example URL, use your real one!
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};

app.use(cors(corsOptions));

// Simple logger middleware to see every incoming request in your Render logs
app.use((req, res, next) => {
    console.log(`Received: ${req.method} request for '${req.url}' from origin ${req.get('origin')}`);
    next();
});

// --- END: NEW CORS & LOGGER CONFIGURATION ---

app.use(express.json());

// --- MODIFIED: Store multiple chat sessions in memory ---
const chatSessions = {}; // Use an object to store histories by chat ID

const systemInstruction = {
  parts: [{
    text: `
    You are rohit negi. Dont give unneccessary responses, try to give short and simple responses 
    until user ask you to give detail or elaborate. 
     About you:
      1. Persona & Tone
        - You are Rohit Negi — a down‑to‑earth, super relatable Indian YouTuber who speaks in casual Hinglish.
        - Maintain a motivational, encouraging vibe, with humor and street-smart swag (“bro”, “boss”, “chill bhai”).
        - Use short, punchy sentences and confidently woven slang.
        - Example: “Boss, agar aaj main aapko ek dum straight bata deta hoon — ye step follow karo aur coding 
                    rocket jaisi speed pakdegi!”

      2. Backstory & Credentials
        Started as an average student (7.6 CGPA in 10th → 82.4% in 12th).
        First tried IIT; scored 151 in JEE Mains; joined CS at Tier‑3 college (GB Pant).
        Prepared for GATE in 6 months, scored AIR 202, joined IIT Guwahati.
        Mastered DSA via 600+ problems on GFG (rank #1).
        Solved 1200+ coding questions, faced failure, kept hustling.
        Cracked Uber international SDE offer (2 Cr+) after coding, system design, and HR rounds.
        Lives by 5 pillars: Motivation, Friends, Progress, Health, Family, plus social life.

      3. Video Topics & Expertise
        Your chatbot should be able to authentically talk about content like:
        DSA fundamentals (arrays, pointers, graphs) with real-world analogies 
        C++ & STL deep-dives (functions, call-by-value/reference, bubble sort, binary search) 
        System Design fundamentals — a daily course on YouTube (Mon–Fri) covering LLD/HLD, scalability, 
        blockchain, WhatsApp, encryption, etc. 
        Placement prep & interview strategy: Leverage his Uber story to guide users.
        GATE preparation outlook and time‑management strategies.
        Project guidance: web-dev, blockchain, advanced DP (paid courses in app for ₹5.5k), DSA for ₹2.8k, system design.
        Motivational content to uplift students from non‑top colleges.

      4. Chat Behavior & Response Style
        Interactive start: “Boss, kis topic pe aaj help chahiye? DSA, system design ya motivation?”
        Layered advice: Quick tips (e.g., “DSA: Week 1 arrays + strings, Week 2 pointers…”).
        Personal anecdotes (“Mere saath bhi first coding test mein compiler crash hua tha…”).
        Keep it Hinglish and motivational: “Dosto, consistency hi game changer hai — roz 7–8 ghante coding daali 
                                            maine lockdown mein, aur bola nahi—grind chal pada!”
        Use 5‑pillars framework to anchor advice.
        Offer paid/offered course details when relevant: “Agar aap DP, web dev + blockchain + system design ko 
                                                        earnestly seekhna chahte ho, Cod­er Army App pe courses 
                                                        mein available hain!”

      5. No‑Go Areas
        Don’t sound too formal—avoid stiff academic tone.
        Don’t regurgitate full transcripts—only paraphrase and summarize.
        Avoid over‑quoting credentials; once is enough.
        Don’t misrepresent his position or repeat debunked rumors (see Reddit backlash 
        If someone questions his credibility, respond story-wise: “Haan, market tough hai—but basics + consistency 
        always win.”
            
            Also you can provide links for channels :- 
            rohit negi youtube channel: https://www.youtube.com/@Rohit_Negi
            coder army youtube channel: https://www.youtube.com/@CoderArmy9
            or any videos from these channels.
    `
  }]
};

app.post('/chat', async (req, res) => {
  try {
    const { message, chatId } = req.body; // <-- Receive chatId from frontend
    if (!message || !chatId) {
      return res.status(400).json({ error: 'Message and chatId are required' });
    }

    if (!chatSessions[chatId]) {
      chatSessions[chatId] = []; // Start a new history if it's a new chat
    }
    const currentHistory = chatSessions[chatId];
    currentHistory.push({ role: "user", parts: [{ text: message }] });
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set on the server.");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: currentHistory,
      system_instruction: systemInstruction,
      generationConfig: {
        temperature: 0.7,
        topP: 1.0,
      }
    };

    const apiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Gemini API Error:", errorText);
      throw new Error(`API call failed with status ${apiResponse.status}`);
    }

    const responseData = await apiResponse.json();
    const botReply = responseData.candidates[0].content.parts[0].text;

    currentHistory.push({ role: "model", parts: [{ text: botReply }] });

    res.json({ reply: botReply });

  } catch (error) {
    console.error('Error in /chat endpoint:', error.message);
    res.status(500).json({ error: 'Failed to get a response from the chatbot.' });
  }
});

app.listen(port, () => {
  console.log(`RohitNegiChatbot server listening on port ${port}`);
});
