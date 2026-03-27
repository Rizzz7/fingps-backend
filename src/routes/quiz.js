const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Result = require('../models/Result');

router.post('/submit', auth, async (req, res) => {
  try {
    const { answers } = req.body;
    
    // Ensure answers were actually sent
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "No answers provided" });
    }

    // ── THE ALGORITHM ──
    // Your frontend sends an array of indices [0, 1, 2, 3] representing which option they clicked.
    // Option A (index 0) = 30 pts, Option B = 55 pts, Option C = 75 pts, Option D = 95 pts
    const getPoints = (val) => [30, 55, 75, 95][val] || 30;
    
    // For Debt, Option A ("No loans") is the BEST, so we reverse the points
    const getReversePoints = (val) => [95, 75, 45, 25][val] || 25;

    // Map specific questions from your QuizPage to the Chart.js Categories
    // answers[2] = Monthly Savings
    // answers[3] = Loans & EMI
    // answers[1] = Income (Proxy for Risk)
    // answers[6] = Timeline (Proxy for Investments)
    // answers[5] = Goal (Proxy for Retirement)
    
    const calculatedScores = {
      savingsRate: getPoints(answers[2]), 
      debtManagement: getReversePoints(answers[3]), 
      riskPreparedness: getPoints(answers[1]), 
      investmentHealth: getPoints(answers[6]), 
      retirementPlanning: getPoints(answers[5]) 
    };

    // Calculate the precise average of all 5 categories
    const totalScore = Math.round(
      (calculatedScores.savingsRate + 
       calculatedScores.investmentHealth + 
       calculatedScores.debtManagement + 
       calculatedScores.riskPreparedness + 
       calculatedScores.retirementPlanning) / 5
    );

    // Save to MongoDB
    const newResult = new Result({
      user: req.user,
      scores: calculatedScores,
      totalScore: totalScore
    });

    await newResult.save();

    // Send the dynamic calculation back to the React frontend
    res.json({ 
      message: "Quiz processed!", 
      totalScore: totalScore, 
      categories: calculatedScores 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing quiz' });
  }
});

module.exports = router;