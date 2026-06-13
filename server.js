const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { readSightings, writeSightings, moderate, autoTag } = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Workshop config comes from two layers, merged at read time:
//   1. workshops.defaults.json — tracked in git, the source of truth for
//      workshops we ship (Sydney, Singapore, …).
//   2. data/workshops.json — optional, lives on the Render Disk so a
//      facilitator can tweak a workshop live without a deploy.
// The disk layer wins per-slug, so on-the-day edits are never clobbered by a
// deploy, and brand-new workshops still ship straight from the repo.
const WORKSHOPS_DEFAULTS_FILE = path.join(__dirname, 'workshops.defaults.json');
const WORKSHOPS_FILE = path.join(__dirname, 'data', 'workshops.json');

// Slugs that can't be used as workshop names because they collide with existing routes.
const RESERVED_SLUGS = ['api', 'garden', 'moderate', 'public', 'assets', 'static', 'data'];

function readJsonOrEmpty(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

// Read workshops config: tracked defaults overlaid with any Render-disk edits.
// Always guarantees a 'public' workshop so the server is usable even with no
// config files present.
function readWorkshops() {
  const defaults = readJsonOrEmpty(WORKSHOPS_DEFAULTS_FILE);
  const disk = readJsonOrEmpty(WORKSHOPS_FILE);
  const merged = { ...defaults, ...disk };
  if (!merged.public) {
    merged.public = {
      title: 'Sightings',
      subtitle: 'Civic Interplay',
      prompt: 'What do you notice?',
      invitation: "We're inviting you to share a hidden intelligence you feel is shaping the place you're in.",
      mode: 'open'
    };
  }
  return merged;
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
