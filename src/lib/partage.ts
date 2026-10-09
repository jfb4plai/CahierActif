export function nomFichier(titre: string): string {
  const propre = titre
    .replace(/[\/:*?"<>|]+/g, ' - ')
    .replace(/\s+/g, ' ')
    .replace(/(\s-\s)+/g, ' - ')
    .replace(/[\s-]+$/g, '')
    .trim()
    .slice(0, 80);
  return propre || 'cahier';
}

/** Feuille de partage de la tablette si disponible (Teams, Smartschool, mail…), sinon téléchargement. */
export async function partagerOuTelecharger(blob: Blob, nom: string): Promise<void> {
  const fichier = new File([blob], nom, { type: blob.type });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nom });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return; // l'élève a fermé la feuille de partage
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
