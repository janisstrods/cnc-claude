// Triumphs: the player's battle record on the main menu. A one-line tally of medals and battles fought, and a dialog
// with every battle, box by box, each with its two medals; a battle clicked there opens in the picker. The record can
// be saved to a file and loaded back (merged), as a backup or to carry it to another browser.
import { useRef, useState } from 'react';
import { SCENARIOS } from '../../scenarios';
import { Button, Modal } from '../kit';
import { exportRecord, importRecord, mergeRecords, recordTotals, saveRecord, type BattleRecord, type Totals } from '../record';
import { Medal, MedalPair, pairText } from './Medal';
import { PICKER_TABS, battlesOf } from './picker';

const ALL_IDS = SCENARIOS.map((s) => s.id);

export function tallyText(t: Totals): string {
  return `${t.gold} gold, ${t.silver} silver, ${t.bronze} bronze of ${t.sides} medals; ${t.fought} of ${t.battles} battles fought`;
}

/** Medals by metal (each side counted once, by its best) and the battles fought. */
export function MedalTally({ totals: t, className }: { totals: Totals; className?: string }) {
  const text = tallyText(t);
  return (
    <div className={`tally${className ? ` ${className}` : ''}`} role="img" aria-label={text} title={text}>
      <span className="tally-n"><Medal standing="gold" size={18} />{t.gold}</span>
      <span className="tally-n"><Medal standing="silver" size={18} />{t.silver}</span>
      <span className="tally-n"><Medal standing="bronze" size={18} />{t.bronze}</span>
      <span className="tally-fought">{t.fought} of {t.battles} battles fought</span>
    </div>
  );
}

/** The menu's line: the tally over every battle, once anything is recorded. */
export function MenuTally({ record }: { record: BattleRecord }) {
  const totals = recordTotals(record, ALL_IDS);
  return totals.fought ? <MedalTally totals={totals} className="menu-tally" /> : null;
}

const LEGEND: { standing: 'gold' | 'silver' | 'bronze' | 'fought' | 'none'; text: string }[] = [
  { standing: 'gold', text: 'beat the Consul' },
  { standing: 'silver', text: 'beat the Tribune' },
  { standing: 'bronze', text: 'beat the Recruit' },
  { standing: 'fought', text: 'fought, not won' },
  { standing: 'none', text: 'not fought' },
];

/** Offer `text` as a file download named `name`. */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TriumphsDialog(p: {
  open: boolean;
  record: BattleRecord;
  onClose: () => void;
  /** The record changed (a file was loaded into it). */
  onRecord: (rec: BattleRecord) => void;
  /** A battle was clicked: open it in the picker. */
  onPick: (battleId: string) => void;
}) {
  const { record } = p;
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const close = () => {
    setStatus(null);
    p.onClose();
  };
  const save = () => {
    const file = exportRecord(record);
    download(file.name, file.text);
    setStatus(`Saved as ${file.name}.`);
  };
  const load = async (file: File) => {
    const rec = importRecord(await file.text());
    if (!rec) {
      setStatus(`${file.name} is not a Triumphs record.`);
      return;
    }
    const merged = mergeRecords(record, rec);
    saveRecord(merged);
    p.onRecord(merged);
    const n = Object.keys(rec).length;
    setStatus(`Loaded ${file.name}: ${n} ${n === 1 ? 'battle' : 'battles'}, merged into this record.`);
  };
  return (
    <Modal open={p.open} title="Triumphs" onClose={close} width={980}>
      <div className="triumphs">
        <p className="triumphs-intro">
          Win a battle to earn a medal for the army you commanded: bronze against the Recruit, silver against the
          Tribune, gold against the Consul. Every battle has two to win, one for each side.
        </p>
        <div className="triumphs-top">
          <MedalTally totals={recordTotals(record, ALL_IDS)} />
          <ul className="triumphs-legend">
            {LEGEND.map((l) => (
              <li key={l.standing}><Medal standing={l.standing} size={15} />{l.text}</li>
            ))}
          </ul>
        </div>
        <div className="triumphs-scroll">
          {PICKER_TABS.map((t) => {
            const battles = battlesOf(SCENARIOS, t.id);
            return (
              <section key={t.id} className="triumphs-box" aria-label={t.label}>
                <h3>
                  {t.label}
                  <MedalTally totals={recordTotals(record, battles.map((s) => s.id))} className="is-small" />
                </h3>
                <div className="triumphs-grid">
                  {battles.map((s) => (
                    <button key={s.id} type="button" className="tri-cell" onClick={() => p.onPick(s.id)} title={`${s.name}: ${pairText(record, s)}`}>
                      <span className="tri-num">{Number(s.id)}</span>
                      <span className="tri-name">{s.name}</span>
                      <MedalPair rec={record} sc={s} size={18} />
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <div className="triumphs-foot">
          <Button variant="secondary" onClick={save}>Save record</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>Load record</Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void load(f);
            }}
          />
          <p className="triumphs-note" role="status">
            {status ?? 'The record is kept in this browser only. Save it to keep a copy, or to carry it to another browser.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
