// seed-briefs.mjs
//
// Posts five seed briefs to the gi-sydney-2026 workshop on terrain.civicinterplay.io.
// Resolves tag labels to UUIDs by fetching /api/tags first.
//
// Requires Node 18+ (built-in fetch). No external deps.
// Run:  node seed-briefs.mjs

const API = 'https://terrain.civicinterplay.io';
const WORKSHOP = 'gi-sydney-2026';

const BRIEFS = [
  {
    participant_name: 'a historian carrying Collingwood',
    practice_area: 'public history, archives, question-and-answer',
    what_im_working_on:
      'treating AI outputs as historical sources to be interrogated, reconstructing the question each output is quietly answering',
    question_im_carrying:
      'when the model gives me a confident answer, what is the question I never quite asked, and whose interests does the slippage serve?',
    what_push_i_want: 'challenge me',
    tag_labels: ['technology critique', 'governance', 'storytelling'],
  },
  {
    participant_name: 'a listener after twenty years of place-work',
    practice_area: 'place-based listening across seasons',
    what_im_working_on:
      'refusing the engineering mode at the level of method, not just at the level of preference',
    question_im_carrying:
      'what is the dawn already trying to tell us, that we have been too busy specifying outputs to hear?',
    what_push_i_want: 'leave me space',
    tag_labels: ['country', 'more-than-human', 'ecology'],
  },
  {
    participant_name: 'a practitioner of ecological grief',
    practice_area: 'sound, field recordings, super-organism frame',
    what_im_working_on:
      'AI as a carrying vessel for soundscapes that no longer exist in place, neither oracle nor tool',
    question_im_carrying:
      'how does an emergent body grieve the lives it once carried?',
    what_push_i_want: 'connect me',
    tag_labels: ['ecology', 'more-than-human', 'storytelling'],
  },
  {
    participant_name: 'a workshop participant after the two-pass dig',
    practice_area: 'history as method, dialectical inquiry into AI outputs',
    what_im_working_on:
      "writing my own protocol, a discipline of question-and-answer for working with these systems on the real projects I carry",
    question_im_carrying:
      'which pass produced something I would actually take to a community, and what does my answer tell me about how I have been working until now?',
    what_push_i_want: 'connect me',
    tag_labels: ['community practice', 'technology critique', 'governance'],
  },
  {
    participant_name: 'a platform researcher carrying ten years of critique',
    practice_area: 'platform urbanism pivoting toward civic AI',
    what_im_working_on:
      'where the redistribution of authorial authority actually happens, structurally, in the figure of the AI system itself',
    question_im_carrying:
      'how does a vessel speak with a voice that does not originate the carryings it holds?',
    what_push_i_want: 'challenge me',
    tag_labels: ['data sovereignty', 'technology critique', 'governance'],
  },
];

async function main() {
  console.log(`Fetching tags from ${API}/api/tags ...`);
  const tagsRes = await fetch(`${API}/api/tags`);
  if (!tagsRes.ok) {
    console.error(`Could not fetch tags: ${tagsRes.status}`);
    process.exit(1);
  }
  const tags = await tagsRes.json();
  const tagIdByLabel = Object.fromEntries(tags.map((t) => [t.label, t.id]));

  console.log(`Found ${tags.length} tags. Posting ${BRIEFS.length} briefs to "${WORKSHOP}".\n`);

  for (const b of BRIEFS) {
    const tag_ids = b.tag_labels
      .map((label) => tagIdByLabel[label])
      .filter(Boolean);

    const body = {
      workshop_slug: WORKSHOP,
      participant_name: b.participant_name,
      practice_area: b.practice_area,
      what_im_working_on: b.what_im_working_on,
      question_im_carrying: b.question_im_carrying,
      what_push_i_want: b.what_push_i_want,
      tag_ids,
    };

    process.stdout.write(`  ${b.participant_name.padEnd(52)} `);
    try {
      const res = await fetch(`${API}/api/briefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        console.log('ok');
      } else {
        const err = await res.text();
        console.log(`failed (${res.status}: ${err.slice(0, 80)})`);
      }
    } catch (err) {
      console.log(`network error: ${err.message}`);
    }
  }

  console.log(
    `\nDone. View the landscape at ${API}/${WORKSHOP} or fetch the API at ${API}/api/briefs?workshop=${WORKSHOP}.`
  );
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
