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

module.exports = router;
