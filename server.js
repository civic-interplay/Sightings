const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { readSightings, writeSightings, moderate, autoTag } = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve garden view
app.get('/garden', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'garden.html'));
});

// Serve moderation dashboard
app.get('/moderate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'moderate.html'));
});

// GET all approved sightings (for tapestry/garden)
app.get('/api/sightings', (req, res) => {
  const sightings = readSightings();
  const approved = sightings.filter(s => s.status === 'approved');
  res.json(approved);
});

// GET all sightings (for moderation)
app.get('/api/sightings/all', (req, res) => {
  const sightings = readSightings();
  res.json(sightings);
});

// POST new sighting
app.post('/api/sightings', (req, res) => {
  const { text, location, kind } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const tags = autoTag(text);
  const modResult = moderate({ text });

  const sighting = {
    id: uuidv4(),
    text: text.trim(),
    location: (location || '').trim(),
    kind: kind || 'ecological',
    species: tags.species,
    actions: tags.actions,
    status: modResult.status,
    moderationReason: modResult.reason,
    timestamp: new Date().toISOString(),
    x: 0.2 + Math.random() * 0.6,
    y: 0.2 + Math.random() * 0.6
  };

  const sightings = readSightings();
  sightings.unshift(sighting);
  writeSightings(sightings);

  res.json(sighting);
});

// PATCH sighting status (moderation)
app.patch('/api/sightings/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'pending', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  const sightings = readSightings();
  const idx = sightings.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });

  sightings[idx].status = status;
  writeSightings(sightings);
  res.json(sightings[idx]);
});

// GET stats
app.get('/api/stats', (req, res) => {
  const sightings = readSightings();
  const approved = sightings.filter(s => s.status === 'approved');
  const byKind = {};
  approved.forEach(s => {
    byKind[s.kind] = (byKind[s.kind] || 0) + 1;
  });
  res.json({
    total: approved.length,
    pending: sightings.filter(s => s.status === 'pending').length,
    rejected: sightings.filter(s => s.status === 'rejected').length,
    byKind
  });
});

app.listen(PORT, () => {
  console.log(`Sightings server running on port ${PORT}`);
  console.log(`Tapestry: http://localhost:${PORT}`);
  console.log(`Garden:   http://localhost:${PORT}/garden`);
  console.log(`Moderate: http://localhost:${PORT}/moderate`);
});
