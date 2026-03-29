// src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Result = require('../models/Result');
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get('/data', auth, async (req, res) => {
  try {
    // 1. Get the user ID from your auth middleware
    const userId = req.user?.id || req.user?._id || req.user || req.userId;
    
    // 2. Fetch real data from MongoDB
    const latestResult = await Result.findOne({ user: userId }).sort({ createdAt: -1 });

    if (!latestResult) {
      return res.status(404).json({ message: "No quiz data found." });
    }

    // 3. Map backend array [1, 2, 0] to the exact format your frontend deriveData() expects
    const mappedAnswers = latestResult.rawAnswers.map((ans, index) => ({
      questionIndex: index,
      selectedOption: ans
    }));

    // 4. Use Groq API to curate personalized dashboard milestones
    const prompt = `
      Act as an expert financial AI. Create a short JSON object containing a "milestones" array with 4 steps based on this user's score (${latestResult.totalScore}/100).
      Format exactly like this example, but personalize the labels based on the score:
      {
        "milestones": [
          { "id": 1, "label": "Emergency Fund", "sector": "Safety Net", "status": "completed" },
          { "id": 2, "label": "Start SIP", "sector": "Wealth Engine", "status": "current" },
          { "id": 3, "label": "Tax Planning", "sector": "Wealth Engine", "status": "locked" },
          { "id": 4, "label": "Debt Free", "sector": "Dream Fund", "status": "locked" }
        ]
      }
    `;

    let groqMilestones = [];
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You output only valid JSON.' },
          { role: 'user', content: prompt }
        ],
         model: 'llama-3.1-8b-instant',
        response_format: { type: "json_object" }
      });
      
      const rawData = JSON.parse(chatCompletion.choices[0].message.content);
      groqMilestones = rawData.milestones;
    } catch (groqError) {
      console.error("Groq API fallback used:", groqError.message);
      groqMilestones = [
        { id: 1, label: 'Emergency Fund', sector: 'Safety Net', status: 'completed' },
        { id: 2, label: 'Insurance Guard', sector: 'Safety Net', status: 'current' }
      ];
    }

    // 5. Send the perfectly formatted payload back to DashboardPage.jsx
    res.json({
      dnaScore: latestResult.totalScore,
      investmentScore: latestResult.scores.investmentHealth,
      savingsRate: latestResult.scores.savingsRate,
      riskProfile: latestResult.scores.riskPreparedness > 50 ? 'moderate' : 'conservative',
      answers: mappedAnswers,
      milestones: groqMilestones
    });

  } catch (error) {
    console.error("Dashboard route error:", error);
    res.status(500).json({ message: "Server error fetching dashboard data" });
  }
});

module.exports = router;