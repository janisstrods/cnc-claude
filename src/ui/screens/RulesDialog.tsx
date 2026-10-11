// The rules dialog: How to Play on the main menu, the Rules Reference in a battle. The rules text is its own chunk, loaded
// when the dialog first opens (the dialog's frame shows at once, the text a moment later).
import { lazy, Suspense } from 'react';
import type { ScenarioInfo } from '../../scenarios';
import { Modal } from '../kit';
// the rules' styles, loaded with the dialog as before the text was split off (same place in the stylesheet's order)
import './screens.css';

const RulesReference = lazy(() =>
  import('./RulesReference').then(
    (m) => ({ default: m.RulesReference }),
    // offline since the page loaded: say so in the dialog rather than fail the screen behind it
    (e: unknown) => {
      console.error('Could not load the rules', e);
      return { default: () => <p className="modal-p">The rules could not be loaded. Check your connection and reload the page.</p> };
    },
  ),
);

/** `scenario`: in a battle, whose special rules are shown above the tabs. */
export function RulesDialog({ open, title, scenario, onClose }: { open: boolean; title: string; scenario?: ScenarioInfo; onClose: () => void }) {
  return (
    <Modal open={open} title={title} onClose={onClose} width={880}>
      <Suspense fallback={null}>
        <RulesReference scenario={scenario} />
      </Suspense>
    </Modal>
  );
}
