const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load .env if present
try { require('dotenv').config({ path: path.join(__dirname, '../.env') }); } catch (_) {}

const { requireAuth, requireAdmin } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const membersRouter = require('./routes/members');
const testCasesRouter = require('./routes/testCases');
const testRunsRouter = require('./routes/testRuns');
const bugsRouter = require('./routes/bugs');
const projectsRouter = require('./routes/projects');
const dashboardRouter = require('./routes/dashboard');
const projectTestScriptsRouter = require('./routes/projectTestScripts');
const generateRouter = require('./routes/generate');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}));
app.use(express.json({ limit: '50mb' }));

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Protected routes (require valid JWT)
app.use('/api/members', requireAuth, membersRouter);
app.use('/api/test-cases', requireAuth, testCasesRouter);
app.use('/api/test-runs', requireAuth, testRunsRouter);
app.use('/api/bugs', requireAuth, bugsRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/projects/:projectId/test-scripts', requireAuth, projectTestScriptsRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/generate', requireAuth, generateRouter);
app.use('/api/settings', requireAuth, settingsRouter);

// Global error handler for API routes — return JSON instead of HTML
app.use('/api', (err, req, res, next) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Serve built React frontend in production
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
