const { v4: uuidv4 } = require('uuid');
const { writeSightings } = require('./storage');

const seed = [
  { text: 'A magpie calling from the fig tree, very insistent this morning', location: 'Back lane', kind: 'ecological' },
  { text: 'The smell of jasmine coming from somewhere I still haven\'t found', location: 'Vernon St', kind: 'sensory' },
  { text: 'Three people stopped to look at the same puddle after the rain', location: 'Corner store', kind: 'social' },
  { text: 'Old sandstone wall with ferns growing in every crack', location: 'Railway cutting', kind: 'cultural' },
  { text: 'Stormwater rushing through the drain, brown and fast', location: 'End of the street', kind: 'water' },
  { text: 'A bee working the lavender with real dedication', location: 'Front garden', kind: 'ecological' },
  { text: 'The sound of someone practising scales at 7am', location: 'Apartment block', kind: 'sensory' },
  { text: 'Chalk drawings on the footpath, arrows pointing somewhere', location: 'Schoolyard', kind: 'cultural' },
  { text: 'Two elderly men playing chess under the awning, same table every week', location: 'Cafe strip', kind: 'social' },
  { text: 'Puddles reflecting the plane trees, sky doubled', location: 'Park path', kind: 'water' }
];

const sightings = seed.map((s, i) => ({
  id: uuidv4(),
  ...s,
  species: [],
  actions: [],
  status: 'approved',
  moderationReason: null,
  timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  x: 0.15 + Math.random() * 0.7,
  y: 0.15 + Math.random() * 0.7
}));

writeSightings(sightings);
console.log(`Seeded ${sightings.length} sightings.`);
