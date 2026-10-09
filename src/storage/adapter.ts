import type { CahierDoc } from '../model/types';

export type MetaDoc = { id: string; titre: string; modifie: number };

/** Seule porte vers le stockage : la v2 (HubActif) branchera ici un adaptateur serveur. */
export interface StorageAdapter {
  lister(): Promise<MetaDoc[]>;
  charger(id: string): Promise<CahierDoc | undefined>;
  enregistrer(doc: CahierDoc): Promise<void>;
  supprimer(id: string): Promise<void>;
}
