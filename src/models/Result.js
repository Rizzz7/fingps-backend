const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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