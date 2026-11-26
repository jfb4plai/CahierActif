import { useEffect, useState } from 'react';
import { choisirResultat, type PhotoPrete } from '../lib/fileRecadrage';
import { detecterCoinsPhoto } from '../lib/detectionFeuille';
import type { Quad } from '../lib/redressement';
import { RedresserPhoto } from './RedresserPhoto';

type Props = {
  photos: PhotoPrete[];
  onTermine: (photos: PhotoPrete[]) => void;
  onAnnuler: () => void;
};

/** Après la prise ou l'import : chaque photo passe par l'écran de recadrage, coins détectés d'avance. */
export function RecadrerPhotos({ photos, onTermine, onAnnuler }: Props) {
  const [rang, setRang] = useState(0);
  const [acquis, setAcquis] = useState<PhotoPrete[]>([]);
  const [detection, setDetection] = useState<{ rang: number; quad: Quad | null } | null>(null);

  useEffect(() => {
    let annule = false;
    setDetection(null);
    void detecterCoinsPhoto(photos[rang].image).then(quad => {
      if (!annule) setDetection({ rang, quad });
    });
    return () => { annule = true; };
  }, [rang, photos]);

  const suite = (redressee: PhotoPrete | null) => {
    const tous = [...acquis, choisirResultat(photos[rang], redressee)];
    if (rang + 1 >= photos.length) onTermine(tous);
    else {
      setAcquis(tous);
      setRang(rang + 1);
    }
  };

  if (!detection || detection.rang !== rang) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Recherche de la feuille" className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--bg)] p-4">
        <p className="text-xl font-semibold" role="status">Recherche de la feuille…</p>
      </div>
    );
  }
  return (
    <RedresserPhoto
      key={rang}
      image={photos[rang].image}
      numeroPage={rang + 1}
      quadInitial={detection.quad}
      import={{ rang, total: photos.length, detecte: detection.quad !== null, onGarder: () => suite(null) }}
      onAppliquer={(image, taille) => suite({ image, taille })}
      onAnnuler={onAnnuler}
    />
  );
}
