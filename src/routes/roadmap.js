// src/routes/roadmap.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Result = require('../models/Result');
const User = require('../models/User'); // ADDED: Required to update roadmap flag
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get('/generate', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user || req.userId;
    const result = await Result.findOne({ user: userId }).sort({ createdAt: -1 });

    if (!result) return res.status(404).json({ message: 'No quiz results found.' });

    let currentLevel = 1;
    if (result.totalScore > 20) currentLevel = 2;
    if (result.totalScore > 40) currentLevel = 3;
    if (result.totalScore > 60) currentLevel = 4;
    if (result.totalScore > 75) currentLevel = 5;
    if (result.totalScore > 85) currentLevel = 6;
    if (result.totalScore > 95) currentLevel = 7;

    const baseMilestones = [
      { id: 1, label: 'Emergency Fund', sector: 'Safety Net', x: 50, y: 300, statLabel: 'Status' },
      { id: 2, label: 'Insurance Guard', sector: 'Safety Net', x: 300, y: 200, statLabel: 'Policy' },
      { id: 3, label: 'Debt Neutral', sector: 'Safety Net', x: 550, y: 90, statLabel: 'Balance' },
      { id: 4, label: 'Start SIP', sector: 'Wealth Engine', x: 700, y: 310, statLabel: 'Proj. ROI' },
      { id: 5, label: 'Diversification', sector: 'Wealth Engine', x: 850, y: 500, statLabel: 'Status' },
      { id: 6, label: 'Tax Optimisation', sector: 'Wealth Engine', x: 1100, y: 410, statLabel: 'Status' },
      { id: 7, label: 'Financial Freedom', sector: 'Dream Fund', x: 1350, y: 300, statLabel: 'ROI Potential' }
    ];

    const prompt = `
      You are an expert financial advisor. Create a highly personalized 7-step financial roadmap based on:
      Total: ${result.totalScore}/100, Savings: ${result.scores.savingsRate}/100, Investment: ${result.scores.investmentHealth}/100, Debt: ${result.scores.debtManagement}/100, Risk: ${result.scores.riskPreparedness}/100.

      Return ONLY a JSON object containing a "milestones" array with exactly 7 objects.
      Format:
      {
        "id": [1-7],
        "mission": "[Short, punchy 3-4 word title]",
        "desc": "[One sentence of personalized advice]",
        "target": "[Realistic metric, e.g., '₹50k/mo']",
        "actionPrompt": "[A specific, 1-sentence prompt the user can send to their AI advisor ARTH to execute this step. Example: 'Help me analyze my expenses to find ₹500/mo for a SIP.']"
      }
    `;

    let aiOverrides = [];
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: "json_object" }
      });

      let rawText = chatCompletion.choices[0].message.content.replace(/```json/gi, '').replace(/```/gi, '').trim();
      aiOverrides = JSON.parse(rawText).milestones || JSON.parse(rawText);
    } catch (err) {
      console.error("Groq fallback:", err.message);
    }

    const dynamicMilestones = baseMilestones.map(m => {
      const aiData = aiOverrides.find(ai => parseInt(ai.id) === m.id) || {};
      
      const mission = aiData.mission || "Mission " + m.id;
      const desc = aiData.desc || "Action required.";
      const target = aiData.target || "Pending";
      const actionPrompt = aiData.actionPrompt || `Hi ARTH, help me with ${mission.toLowerCase()}.`;

      if (m.id < currentLevel) {
        return { ...m, mission, desc, target, actionPrompt, status: 'completed', stat: 'Completed', statColor: '#4ade80', cta: 'Review Strategy' };
      } else if (m.id === currentLevel) {
        return { ...m, mission, desc, target, actionPrompt, status: 'current', stat: 'Active Focus', statColor: '#95d7e4', cta: 'Discuss with ARTH ✦' };
      } else if (m.id === 7) {
        return { ...m, mission, desc, target, actionPrompt, status: 'dream', stat: '∞', statColor: '#4f4ff1', cta: 'Plan with ARTH ✦' };
      } else {
        return { ...m, mission, desc, target, actionPrompt, status: 'locked', stat: 'Locked', statColor: 'rgba(255,255,255,0.3)', cta: `Unlock at Level ${m.id}` };
      }
    });

    // UPDATED: Mark that the user has successfully generated a roadmap
    await User.findByIdAndUpdate(userId, { hasRoadmap: true });

    res.json({ level: currentLevel, progress: Math.round((currentLevel / 7) * 100), milestones: dynamicMilestones });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;