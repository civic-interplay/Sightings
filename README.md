# Sightings — Civic Interplay

A living installation for collective noticing. Participants share observations of hidden intelligences shaping the places they inhabit — ecological, social, sensory, cultural, hydrological.

Two views of the same data:

- **Tapestry** (`/`) — dark ambient field with generative flow particles and bezier thread connections
- **Garden** (`/garden`) — botanical growing structure where each sighting grows as a branch
- **Moderation** (`/moderate`) — host dashboard for managing what appears

## Running locally

```bash
npm install
node seed.js      # populate with demo sightings
node server.js    # start at localhost:3000
```

## Deploying to Render

1. Push this repo to GitHub under the civic-interplay organisation
2. Go to [render.com](https://render.com) → New → Web Service → connect repo
3. Render detects `render.yaml` automatically
4. Add custom domain `sightings.civicinterplay.io` in Render dashboard
5. Create CNAME record: `sightings` → `your-service.onrender.com`

**Note:** Free tier uses ephemeral storage (data resets on deploy). Seed fresh data before each workshop session. For persistent data, add a Render Disk or use Railway.

## Palette

Colours from [civicinterplay.io](https://civicinterplay.io):

| Kind | Colour | Hex |
|------|--------|-----|
| Ecological | Dark olive | `#454E41` |
| Social | Terracotta | `#D16D54` |
| Sensory | Pink/magenta | `#E076DB` |
| Cultural | Deep purple | `#7D50BD` |
| Water | Periwinkle | `#8E9BDD` |

## Architecture

- **Express** server with JSON file storage
- Three-layer moderation: auto-reject → auto-flag → auto-approve
- Auto-tagging of species and actions from sighting text
- Generative canvas: flow field particles + noise clouds + glow halos (tapestry)
- Recursive L-system-inspired botanical growth (garden)
- No database required — runs on any Node.js host
