const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 👇 NEW: Store the exact answers (array of 9 numbers) for the Gemini AI context
  rawAnswers: { 
    type: [Number], 
    required: true,
    validate: [v => v.length === 9, 'Must be exactly 9 answers for the dynamic quiz']
  },

  scores: {
    savingsRate: { type: Number, required: true },
    investmentHealth: { type: Number, required: true },
    debtManagement: { type: Number, required: true },
    riskPreparedness: { type: Number, required: true },
    retirementPlanning: { type: Number, required: true }
  },
  totalScore: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);