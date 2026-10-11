// AI vs AI (recruit) plays the 3rd, 6th, 9th... battle of SCENARIOS to the end with legal answers (describeRecruitGames,
// helpers.ts). The battles are split over three files so that they run in parallel.
import { describeRecruitGames } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

describeRecruitGames(2, 3);
