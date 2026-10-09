import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Side } from '../engine';
import { GameController, clearSaved, loadSaved, newSessionConfig, type Difficulty, type SavedGame, type SessionConfig } from './game/controller';
import { GameScreen } from './game/GameScreen';
import { makeOpponent } from './game/makeOpponent';
import { MainMenu, ScenarioSelect } from './screens/Menus';
import { ErrorBoundary } from './ErrorBoundary';
import './kit';

const ArtGallery = lazy(() => import('../dev/ArtGallery'));
const TerrainGallery = lazy(() => import('../dev/TerrainGallery'));
const KitGallery = lazy(() => import('../dev/KitGallery'));

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

type Screen = { kind: 'menu' } | { kind: 'select' } | { kind: 'game'; controller: GameController };

function startController(config: SessionConfig, answers: SavedGame['answers'] = []): GameController {
  return new GameController(config, makeOpponent(config), answers);
}

export function App() {
  const hash = useHash();
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });
  const devStarted = useRef(false);
  useEffect(() => {
    // Dev shortcut: #/play/<scenario>/<top|bottom>/<difficulty>[/<seed>] starts a battle directly.
    if (devStarted.current) return;
    const m = window.location.hash.match(/^#\/play\/(\d{3})\/(top|bottom)\/(recruit|tribune|consul)(?:\/(\d+))?/);
    if (!m) return;
    devStarted.current = true;
    const cfg = newSessionConfig(m[1], m[2] as Side, m[3] as Difficulty);
    if (m[4]) cfg.seed = Number(m[4]);
    const cards = window.location.hash.match(/[?&]cards=([a-zA-Z0-9,]+)/);
    if (cards) cfg.devCards = cards[1].split(',') as SessionConfig['devCards'];
    setScreen({ kind: 'game', controller: startController(cfg) });
  }, []);
  const [saved, setSaved] = useState<SavedGame | null>(() => loadSaved());


  if (hash.startsWith('#/gallery/art')) return <Suspense fallback={null}><ArtGallery /></Suspense>;
  if (hash.startsWith('#/gallery/terrain')) return <Suspense fallback={null}><TerrainGallery /></Suspense>;
  if (hash.startsWith('#/gallery/kit')) return <Suspense fallback={null}><KitGallery /></Suspense>;

  const toMenu = () => {
    if (screen.kind === 'game') screen.controller.dispose();
    setSaved(loadSaved());
    setScreen({ kind: 'menu' });
  };

  if (screen.kind === 'game') {
    return (
      <ErrorBoundary onReset={toMenu}>
        <GameScreen key={screen.controller.config.seed} controller={screen.controller} onExit={toMenu} />
      </ErrorBoundary>
    );
  }
  if (screen.kind === 'select') {
    return (
      <ScenarioSelect
        onBack={toMenu}
        onStart={(id: string, side: Side, diff: Difficulty) => {
          clearSaved();
          setScreen({ kind: 'game', controller: startController(newSessionConfig(id, side, diff)) });
        }}
      />
    );
  }
  return (
    <MainMenu
      saved={saved}
      onNew={() => setScreen({ kind: 'select' })}
      onContinue={() => {
        if (!saved) return;
        try {
          setScreen({ kind: 'game', controller: startController(saved.config, saved.answers) });
        } catch (e) {
          console.error('Could not resume', e);
          clearSaved();
          setSaved(null);
        }
      }}
    />
  );
}
