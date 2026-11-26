import type { CahierDoc, Dossier } from '../model/types';

/** `miniature` : petite image (data URL JPEG) de la première page, pour la liste de la bibliothèque. */
export type MetaDoc = { id: string; titre: string; modifie: number; dossierId?: string; miniature?: string };

/** Seule porte vers le stockage : la v2 (HubActif) branchera ici un adaptateur serveur. */
export interface StorageAdapter {
  lister(): Promise<MetaDoc[]>;
  charger(id: string): Promise<CahierDoc | undefined>;
  /** Conserve le dossier du document s'il en a un. */
  enregistrer(doc: CahierDoc): Promise<void>;
  supprimer(id: string): Promise<void>;
  /** Change le titre du document, sans toucher à ses pages ni à la date de modification. */
  renommer(id: string, titre: string): Promise<void>;
  /** Met à jour la miniature de la fiche légère seulement (jamais le PDF). */
  enregistrerMiniature(id: string, miniature: string): Promise<void>;
  /** Classement : ne touche que la fiche légère, jamais le PDF. dossierId null = sans dossier. */
  deplacer(id: string, dossierId: string | null): Promise<void>;
  listerDossiers(): Promise<Dossier[]>;
  enregistrerDossier(d: Dossier): Promise<void>;
  /** Les documents du dossier ne sont pas supprimés : ils passent « sans dossier ». */
  supprimerDossier(id: string): Promise<void>;
}
