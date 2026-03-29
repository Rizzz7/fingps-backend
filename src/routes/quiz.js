// src/routes/quiz.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Result = require('../models/Result');
const User = require('../models/User'); // ADDED: Required to update the quiz flag
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const buildFinancialProfile = (answers) => {
  const p = answers[0];
  const q = (step) => {
    switch (step) {
      case 0: return { t: "Life Stage", o: ["Student", "Early Career", "Mid-Career", "Pre-Retirement"] };
      case 1: return p === 0 ? { t: "Funds", o: ["Pocket money", "Job", "Scholarship", "Freelance"] } : { t: "Income", o: ["Variable", "<50k", "50k-1.5L", ">1.5L"] };
      case 2: return p === 0 ? { t: "Tracking", o: ["None", "Mental", "App", "Parents"] } : { t: "Margin", o: ["0", "0-10%", "10-30%", "30%+"] };
      case 3: return p === 0 ? { t: "Debt", o: ["Student", "BNPL", "Family", "None"] } : { t: "Liability", o: ["Credit Card", "Loans", "EMI", "None"] };
      case 4: return p === 0 ? { t: "Anxiety", o: ["Job", "Loans", "FOMO", "Investing"] } : { t: "Runway", o: ["<1m", "1-3m", "3-6m", "6m+"] };
      case 5: return p === 0 ? { t: "Saving", o: ["Survival", "Change", "SIPs", "Learning"] } : { t: "Wealth", o: ["Savings", "FDs", "MFs", "Diversified"] };
      case 6: return p === 0 ? { t: "10k Windfall", o: ["Lifestyle", "Course", "Savings", "Market"] } : { t: "50k Windfall", o: ["Debt", "Invest", "Save/Spend", "Vacation"] };
      case 7: return p === 0 ? { t: "12m Goal", o: ["Debt-free", "Job", "Emergency", "Investing"] } : { t: "Anxiety", o: ["Medical", "Retirement", "Debt", "Life enjoyment"] };
      case 8: return p === 0 ? { t: "Goal 30", o: ["FI", "6-fig", "House", "Business"] } : { t: "3y Goal", o: ["Home", "Debt-free", "Portfolio", "Lifestyle"] };
      default: return { t: "", o: [] };
    }
  };
  let profile = "";
  answers.forEach((ans, i) => { const ctx = q(i); profile += `${ctx.t}: ${ctx.o[ans]}\n`; });
  return profile;
};

// 1. SUBMIT QUIZ
router.post('/submit', auth, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers || answers.length !== 9) return res.status(400).json({ message: "Invalid quiz" });

    const getPoints = (v) => [30, 55, 75, 95][v] || 30;
    const scores = {
      savingsRate: getPoints(answers[2]),
      investmentHealth: getPoints(answers[5]),
      debtManagement: getPoints(answers[3]),
      riskPreparedness: getPoints(answers[4]),
      retirementPlanning: [65, 95, 75, 30][answers[6]] || 40
    };

    const totalScore = Math.round(Object.values(scores).reduce((a, b) => a + b) / 5);
    const userId = req.user?.id || req.user?._id || req.user || req.userId; // Standardized ID

    const result = new Result({ user: userId, rawAnswers: answers, scores, totalScore });
    await result.save();
    
    // UPDATED: Set flag in DB
    await User.findByIdAndUpdate(userId, { hasCompletedQuiz: true });

    res.json({ totalScore, categories: scores, rawAnswers: answers });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).send("Server Error");
  }
});

// 2. AI INSIGHTS 
router.post('/insights', auth, async (req, res) => {
  try {
    const { answers } = req.body;
    const profile = buildFinancialProfile(answers);
    
    const prompt = `Analyze this financial profile:\n${profile}\nReturn ONLY a JSON object:\n{"strengths": ["string", "string", "string"], "growthAreas": ["string", "string", "string"]}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a financial advisor assistant. Output ONLY JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(chatCompletion.choices[0].message.content);
    return res.json(data);

  } catch (err) {
    console.error("Groq AI failure:", err.message);
    return res.json({
      strengths: ["Completing assessment", "Initial financial awareness"],
      growthAreas: ["Long-term goal setting", "Detailed expense tracking"],
    });
  }
});

// 3. GET LATEST RESULT
router.get('/latest', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user || req.userId;
    const latestResult = await Result.findOne({ user: userId }).sort({ createdAt: -1 });
    
    if (!latestResult) {
      return res.status(404).json({ message: "No quiz data found." });
    }

    res.json(latestResult);
  } catch (err) {
    console.error("Latest fetch error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;