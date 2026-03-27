const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Result = require('../models/Result');

// GET /api/roadmap/generate
// Protected route: uses the JWT token to find the specific user's data
router.get('/generate', auth, async (req, res) => {
  try {
    // 1. Find the user's most recent quiz result in the database
    const result = await Result.findOne({ user: req.user }).sort({ createdAt: -1 });

    if (!result) {
      return res.status(404).json({ message: 'No quiz results found. Take the quiz first.' });
    }

    // 2. The Algorithm: Determine their "Level" (1-7) based on their total score
    let currentLevel = 1;
    if (result.totalScore > 20) currentLevel = 2;
    if (result.totalScore > 40) currentLevel = 3;
    if (result.totalScore > 60) currentLevel = 4;
    if (result.totalScore > 75) currentLevel = 5;
    if (result.totalScore > 85) currentLevel = 6;
    if (result.totalScore > 95) currentLevel = 7;

    // 3. Base milestone data (coordinates match your SVG exactly)
    const baseMilestones = [
      { id: 1, label: 'Emergency Fund', sector: 'Safety Net', x: 50, y: 300, mission: 'Build 3-month emergency fund', desc: 'Set aside 3 months of expenses in a liquid savings account.', target: '₹90,000', statLabel: 'Status' },
      { id: 2, label: 'Insurance Guard', sector: 'Safety Net', x: 300, y: 200, mission: 'Get health + term insurance', desc: 'Protect yourself and your family with adequate health and term life cover.', target: '₹50L cover', statLabel: 'Policy' },
      { id: 3, label: 'Debt Neutral', sector: 'Safety Net', x: 550, y: 90, mission: 'Clear high-interest debt', desc: 'Pay off credit card and personal loan debt before building wealth.', target: '₹0 debt', statLabel: 'Balance' },
      { id: 4, label: 'Start SIP', sector: 'Wealth Engine', x: 700, y: 310, mission: 'Start ₹500/mo SIP', desc: 'Initiate your systematic investment plan to leverage compound interest.', target: '₹500/mo', statLabel: 'Proj. ROI' },
      { id: 5, label: 'Diversification', sector: 'Wealth Engine', x: 850, y: 500, mission: 'Diversify your portfolio', desc: 'Spread investments across equity, debt, and gold for balanced risk.', target: '3+ asset classes', statLabel: 'Status' },
      { id: 6, label: 'Tax Optimisation', sector: 'Wealth Engine', x: 1100, y: 410, mission: 'Maximise tax savings', desc: 'Use 80C, NPS, HRA and other instruments to legally reduce tax.', target: '₹1.5L saved', statLabel: 'Status' },
      { id: 7, label: 'Financial Freedom', sector: 'Dream Fund', x: 1350, y: 300, mission: 'Achieve financial independence', desc: 'Reach a corpus where investments generate enough passive income.', target: '25x spend', statLabel: 'ROI Potential' }
    ];

    // 4. Dynamically assign status, colors, and CTA buttons based on their Level
    const dynamicMilestones = baseMilestones.map(m => {
      if (m.id < currentLevel) {
        return { ...m, status: 'completed', stat: 'Completed', statColor: '#4ade80', cta: 'View Details' };
      } else if (m.id === currentLevel) {
        return { ...m, status: 'current', stat: 'Active', statColor: '#95d7e4', cta: 'Take Action 🚀' };
      } else if (m.id === 7) {
        return { ...m, status: 'dream', stat: '∞', statColor: '#4f4ff1', cta: 'Your Destination 🌟' };
      } else {
        return { ...m, status: 'locked', stat: 'Locked', statColor: 'rgba(255,255,255,0.3)', cta: `Unlock at Level ${m.id}` };
      }
    });

    // Calculate overall percentage progress
    const progressPercent = Math.round((currentLevel / 7) * 100);

    res.json({
       level: currentLevel,
       progress: progressPercent,
       milestones: dynamicMilestones 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating roadmap' });
  }
});

module.exports = router;