const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { readSightings, writeSightings, moderate, autoTag } = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Workshops config lives alongside sightings data so it persists on Render Disk.
// Adjust the path if your sightings data lives somewhere else.
const WORKSHOPS_FILE = path.join(__dirname, 'data', 'workshops.json');

// Slugs that can't be used as workshop names because they collide with existing routes.
const RESERVED_SLUGS = ['api', 'garden', 'moderate', 'public', 'assets', 'static', 'data'];

// Read workshops config from disk. Falls back to a minimal 'public' workshop
// so the server starts even if the file doesn't exist yet.
function readWorkshops() {
  try {
    return JSON.parse(fs.readFileSync(WORKSHOPS_FILE, 'utf8'));
  } catch {
    return {
      public: {
        title: 'Sightings',
        subtitle: 'Civic Interplay',
        prompt: 'What do you notice?',
        invitation: "We're inviting you to share a hidden intelligence you feel is shaping the place you're in.",
        mode: 'open'
      }
    };
  }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Workshop config

// List all workshops
app.get('/api/workshops', (req, res) => {
  res.json(readWorkshops());
});

// Get one workshop's config
app.get('/api/workshops/:slug', (req, res) => {
  const workshops = readWorkshops();
  const ws = workshops[req.params.slug];
  if (!ws) return res.status(404).json({ error: 'workshop not found' });
  res.json(ws);
});

// Existing named views

// Public garden view
app.get('/garden', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'garden.html'));
});

// Moderation dashboard
app.get('/moderate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'moderate.html'));
});

// Sightings API (workshop-scoped)

// Approved sightings for one workshop (defaults to 'public')
app.get('/api/sightings', (req, res) => {
  const workshop = req.query.workshop || 'public';
  const sightings = readSightings();
  const approved = sightings.filter(s =>
    s.status === 'approved' && (s.workshop || 'public') === workshop
  );
  res.json(approved);
});

// All sightings (for moderation), optionally workshop-scoped
app.get('/api/sightings/all', (req, res) => {
  const workshop = req.query.workshop;
  const sightings = readSightings();
  if (workshop) {
    return res.json(sightings.filter(s => (s.workshop || 'public') === workshop));
  }
  res.json(sightings);
});

// New sighting
app.post('/api/sightings', (req, res) => {
  const { text, location, kind, workshop } = req.body;
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
    workshop: (workshop || 'public').trim(),
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

// PATCH sighting status (moderation), unchanged
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

// Stats, workshop-scoped (defaults to 'public')
app.get('/api/stats', (req, res) => {
  const workshop = req.query.workshop || 'public';
  const sightings = readSightings();
  const inWorkshop = sightings.filter(s => (s.workshop || 'public') === workshop);
  const approved = inWorkshop.filter(s => s.status === 'approved');
  const byKind = {};
  approved.forEach(s => {
    byKind[s.kind] = (byKind[s.kind] || 0) + 1;
  });
  res.json({
    workshop,
    total: approved.length,
    pending: inWorkshop.filter(s => s.status === 'pending').length,
    rejected: inWorkshop.filter(s => s.status === 'rejected').length,
    byKind
  });
});

// Workshop URL routing
// Must come AFTER named routes and API routes so those take precedence.
// Reserved slugs fall through to a 404.

// Workshop garden view: /<slug>/garden
app.get('/:slug/garden', (req, res, next) => {
  if (RESERVED_SLUGS.includes(req.params.slug)) return next();
  res.sendFile(path.join(__dirname, 'public', 'garden.html'));
});

// Workshop tapestry view: /<slug>
app.get('/:slug', (req, res, next) => {
  if (RESERVED_SLUGS.includes(req.params.slug)) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Sightings server running on port ${PORT}`);
  console.log(`Public tapestry: http://localhost:${PORT}`);
  console.log(`Public garden:   http://localhost:${PORT}/garden`);
  console.log(`Workshops list:  http://localhost:${PORT}/api/workshops`);
  console.log(`Moderate:        http://localhost:${PORT}/moderate`);
});
