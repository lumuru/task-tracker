const express = require('express');
const cors = require('cors');
const membersRouter = require('./routes/members');
const testCasesRouter = require('./routes/testCases');
const testRunsRouter = require('./routes/testRuns');
const bugsRouter = require('./routes/bugs');
const projectsRouter = require('./routes/projects');
const dashboardRouter = require('./routes/dashboard');
const projectTestScriptsRouter = require('./routes/projectTestScripts');
const generateRouter = require('./routes/generate');

// Load .env if present
try { require('dotenv').config({ path: require('path').join(__dirname, '../.env') }); } catch (_) {}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/members', membersRouter);
app.use('/api/test-cases', testCasesRouter);
app.use('/api/test-runs', testRunsRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/test-scripts', projectTestScriptsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/generate', generateRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
