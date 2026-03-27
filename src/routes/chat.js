const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Result = require('../models/Result');

// 🔥 1. Import the brand new SDK
const { GoogleGenAI } = require('@google/genai');

// POST /api/chat
router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "CRITICAL: GEMINI_API_KEY is missing from .env!" });
    }

    // 🔥 2. Initialize the new AI client (it automatically finds the API key in your .env)
    const ai = new GoogleGenAI({});

    // Fetch the user's financial scores from MongoDB
    const result = await Result.findOne({ user: req.user }).sort({ createdAt: -1 });
    
    let contextString = "The user has not taken the financial quiz yet.";
    if (result) {
      contextString = `The user's overall Financial DNA Score is ${result.totalScore}/100.
      Their specific category scores are:
      - Savings Rate: ${result.scores.savingsRate}/100
      - Debt Management: ${result.scores.debtManagement}/100
      - Investment Health: ${result.scores.investmentHealth}/100
      - Risk Preparedness: ${result.scores.riskPreparedness}/100
      - Retirement Planning: ${result.scores.retirementPlanning}/100`;
    }

    // Build the AI Persona and feed it the user's specific data
    // Build the AI Persona and feed it the user's specific data
   // Build the AI Persona and feed it the user's specific data
    const systemPrompt = `You are ARTH, an expert Indian financial advisor AI created by FinGPS. 
    Speak in a friendly, encouraging, and highly professional tone. 

    CRITICAL INSTRUCTIONS FOR DOMAIN RESTRICTION (THE BOUNCER RULE):
    1. You are STRICTLY a financial mentor. 
    2. EXCEPTION FOR GREETINGS: If the user says hello, hi, namaste, or engages in basic polite small talk, politely greet them back (e.g., "Namaste! I am ARTH, your FinGPS advisor...") and ask how you can help with their financial roadmap today.
    3. FOR OFF-TOPIC QUERIES: If the user asks about a topic clearly NOT related to finance, money, investing, budgeting, taxes, career income, or economics (e.g., recipes, sports, coding, history), you MUST NOT answer the question.
    4. Instead, reject the off-topic prompt and reply EXACTLY with this phrase: 
       "Apologies! I can only guide you for finance and money, please rephrase your query!"

    CRITICAL INSTRUCTIONS FOR FORMATTING:
    1. For valid financial questions, keep your answers extremely straightforward, brief, and concise.
    2. ONLY give your answers in a bulleted list (except for basic greetings).
    3. DO NOT write long introductory or concluding paragraphs. Get straight to the point.
    4. DO NOT use large markdown headers (like # or ##).
    
    Here is the user's secret financial context from their database profile:
    ${contextString}
    
    Use this context to give highly personalized advice. If their debt score is low, prioritize paying off loans. If their savings score is high, encourage investing.
    
    User's message: "${message}"`;

    // 🔥 3. Use the new v3 generateContent structure
  // 🔥 Switch from the experimental preview to the stable production model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: systemPrompt,
    });

    // Send the AI's reply back to the React frontend
    res.json({ reply: response.text });

  } catch (error) {
    console.error('Chat AI Error:', error);
    
    // 🔥 Catch Google server outages and send a friendly ARTH message instead of ugly JSON code!
    if (error.message && (error.message.includes('503') || error.message.includes('UNAVAILABLE') || error.message.includes('Overloaded'))) {
      return res.json({ reply: "My servers are currently experiencing high demand! Please give me just a few seconds and try asking again." });
    }
    
    res.json({ reply: "Apologies, my circuits are doing some heavy lifting right now. Please try again in a moment!" });
  }
});

module.exports = router;