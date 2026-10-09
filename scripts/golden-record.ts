// Prints the golden-game fixtures (JSON) to stdout:  npx vite-node scripts/golden-record.ts > tests/golden/fixtures.json
import { goldenGames } from '../tests/golden/record';

process.stdout.write(JSON.stringify(goldenGames(), null, 1) + '\n');
