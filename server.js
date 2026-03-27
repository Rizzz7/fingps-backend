require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Allows your React frontend to connect
app.use(express.json()); // Allows us to accept JSON data in the body

// ── Route Imports ──
const authRoutes = require('./src/routes/auth');
const quizRoutes = require('./src/routes/quiz');
const roadmapRoutes = require('./src/routes/roadmap');
 const chatRoutes = require('./src/routes/chat'); // Keep commented until we build Option B

// ── Mount Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/roadmap', roadmapRoutes);
 app.use('/api/chat', chatRoutes); // Keep commented until we build Option B

// Basic route to test if server is running
app.get('/', (req, res) => {
  res.send('FinGPS API is running smoothly...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});