import { lazy, Suspense, useEffect, useState } from 'react';

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

export function App() {
  const hash = useHash();
  let page: JSX.Element;
  if (hash.startsWith('#/gallery/art')) page = <ArtGallery />;
  else if (hash.startsWith('#/gallery/terrain')) page = <TerrainGallery />;
  else if (hash.startsWith('#/gallery/kit')) page = <KitGallery />;
  else page = <div style={{ fontFamily: 'Cinzel', padding: 40 }}>Commands &amp; Colors: Ancients</div>;
  return <Suspense fallback={null}>{page}</Suspense>;
}
