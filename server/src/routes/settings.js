const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

// GET /api/settings — return all app settings (admin only)
router.get('/', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM app_settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings — bulk update settings (admin only)
router.put('/', requireAdmin, (req, res) => {
  try {
    const entries = Object.entries(req.body);
    if (entries.length === 0) {
      return res.status(400).json({ error: 'No settings provided' });
    }

    const upsert = db.prepare(
      "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    );

    const updateMany = db.transaction((items) => {
      for (const [key, value] of items) {
        upsert.run(key, String(value));
      }
    });

    updateMany(entries);

    // Return updated settings
    const rows = db.prepare('SELECT key, value FROM app_settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/generation-logs — admin-only AI generation audit log
router.get('/generation-logs', requireAdmin, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM ai_generation_logs').get().count;

    const logs = db.prepare(`
      SELECT
        g.*,
        p.name as project_name,
        tm.name as user_name
      FROM ai_generation_logs g
      LEFT JOIN projects p ON g.project_id = p.id
      LEFT JOIN team_members tm ON g.user_id = tm.id
      ORDER BY g.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json({ logs, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
