// Regenerates tests/golden/fixtures.json. During the Phase 1 refactor the fixtures must NOT be regenerated; after merging main changes that alter the AI, regenerate only the ai-* entries.
// Prints the golden-game fixtures (JSON) to stdout:  npx vite-node scripts/golden-record.ts > tests/golden/fixtures.json
import { goldenGames } from '../tests/golden/record';

process.stdout.write(JSON.stringify(goldenGames(), null, 1) + '\n');
