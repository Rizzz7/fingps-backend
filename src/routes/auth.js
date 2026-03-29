// src/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Result = require('../models/Result'); // ADDED: Needed for reset
const auth = require('../middleware/auth'); // ADDED: Needed for reset protection
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // UPDATED: Return the UX flags to the frontend
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        hasCompletedQuiz: user.hasCompletedQuiz || false,
        hasRoadmap: user.hasRoadmap || false
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// RESET DATA (Premium UX Feature)
router.post('/reset-data', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user || req.userId;
    
    // 1. Delete user's quiz results
    await Result.findOneAndDelete({ user: userId });
    
    // 2. Reset the flags in the User model
    await User.findByIdAndUpdate(userId, {
      hasCompletedQuiz: false,
      hasRoadmap: false
    });

    res.json({ message: "Data reset successfully. Starting fresh!" });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ message: 'Failed to reset data' });
  }
});

module.exports = router;