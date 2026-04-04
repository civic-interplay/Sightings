const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SIGHTINGS_FILE = path.join(DATA_DIR, 'sightings.json');

// Ensure data directory and file exist
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SIGHTINGS_FILE)) {
    fs.writeFileSync(SIGHTINGS_FILE, JSON.stringify([]));
  }
}

function readSightings() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(SIGHTINGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeSightings(sightings) {
  ensureStorage();
  fs.writeFileSync(SIGHTINGS_FILE, JSON.stringify(sightings, null, 2));
}

function moderate(sighting) {
  const text = (sighting.text || '').toLowerCase();

  // Auto-reject
  const spamKeywords = ['buy', 'click here', 'subscribe', 'free money', 'http://', 'https://'];
  for (const kw of spamKeywords) {
    if (text.includes(kw)) {
      return { status: 'rejected', reason: 'spam keyword detected' };
    }
  }
  if (/fuck|shit|cunt|asshole/i.test(text)) {
    return { status: 'rejected', reason: 'offensive language' };
  }

  // Auto-flag
  if (text.length < 10) {
    return { status: 'pending', reason: 'too short' };
  }
  if (text.length > 1000) {
    return { status: 'pending', reason: 'too long' };
  }
  if (text === text.toUpperCase() && text.length > 20) {
    return { status: 'pending', reason: 'all caps' };
  }
  if (/(.)\1{4,}/.test(text)) {
    return { status: 'pending', reason: 'repeated characters' };
  }

  // Auto-approve
  return { status: 'approved', reason: null };
}

function autoTag(text) {
  const t = text.toLowerCase();
  const species = [];
  const actions = [];

  const speciesMap = {
    bird: ['bird', 'sparrow', 'pigeon', 'crow', 'magpie', 'lorikeet', 'cockatoo', 'ibis', 'heron', 'duck', 'swan'],
    insect: ['bee', 'butterfly', 'ant', 'moth', 'dragonfly', 'cricket', 'beetle', 'fly', 'wasp'],
    plant: ['tree', 'grass', 'flower', 'weed', 'fern', 'moss', 'shrub', 'vine', 'leaf', 'bark', 'root'],
    mammal: ['dog', 'cat', 'fox', 'rat', 'bat', 'possum', 'wallaby', 'kangaroo'],
    water: ['rain', 'puddle', 'creek', 'river', 'storm', 'drain', 'tide', 'wave'],
    fungi: ['mushroom', 'fungi', 'fungus', 'lichen']
  };

  const actionMap = {
    sound: ['singing', 'calling', 'buzzing', 'rustling', 'humming', 'chirping', 'dripping'],
    movement: ['flying', 'running', 'swimming', 'crawling', 'drifting', 'falling', 'moving'],
    presence: ['sitting', 'standing', 'resting', 'waiting', 'watching', 'growing', 'blooming']
  };

  for (const [group, words] of Object.entries(speciesMap)) {
    if (words.some(w => t.includes(w))) species.push(group);
  }
  for (const [group, words] of Object.entries(actionMap)) {
    if (words.some(w => t.includes(w))) actions.push(group);
  }

  return { species, actions };
}

module.exports = { readSightings, writeSightings, moderate, autoTag };
