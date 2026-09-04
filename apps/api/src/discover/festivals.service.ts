import { Injectable } from '@nestjs/common';
import { getMovieDetails, getTvDetails } from '@emdb/tmdb-client';
import {
  getRecentEditions,
  getEditionSelection,
  FestivalEdition,
  FestivalNominee,
} from '@emdb/wikidata-client';
import { DiscoverService, DiscoverTitleResult } from './discover.service';

export interface FestivalNomineeResult extends DiscoverTitleResult {
  categorie: string | null;
  gagnant: boolean;
}

/**
 * Service métier pour le module "Sélection" de la page Découvrir : éditions
 * récentes de festivals de cinéma / cérémonies (Cannes, Berlinale, Golden
 * Globes...) et leur sélection (nommés + gagnants), alimenté par Wikidata
 * (`@emdb/wikidata-client`) plutôt que TMDB — TMDB n'a pas de notion de
 * "sélection officielle d'un festival".
 *
 * Les fiches (poster, note, date de sortie) sont ensuite enrichies via TMDB
 * à partir du `tmdb_id` résolu côté Wikidata, pour rester au même format
 * (`DiscoverTitleResult`) que les autres modules Découvrir et réutiliser
 * telles quelles les cartes/mécanique "get or import" du front.
 */
@Injectable()
export class FestivalsService {
  constructor(private readonly discoverService: DiscoverService) {}

  async getEditions(): Promise<FestivalEdition[]> {
    return getRecentEditions();
  }

  async getSelection(editionId: string): Promise<FestivalNomineeResult[]> {
    const nominees = await getEditionSelection(editionId);

    const enriched = await Promise.all(nominees.map((n) => this.enrichNominee(n)));
    const withDetails = enriched.filter((n): n is FestivalNomineeResult => n !== null);

    const localised = await this.discoverService.attachLocalInfo(withDetails);
    // `attachLocalInfo` ne connaît pas `categorie`/`gagnant` (forme
    // `DiscoverTitleResult` standard) — on les recolle par index plutôt que
    // par tmdb_id : un même titre peut apparaître plusieurs fois avec des
    // catégories différentes (ex. nommé Palme d'or ET gagnant Prix du jury),
    // et `attachLocalInfo` préserve l'ordre/la longueur (simple `.map`).
    return localised.map((item, i) => ({
      ...item,
      categorie: withDetails[i].categorie,
      gagnant: withDetails[i].gagnant,
    }));
  }

  private async enrichNominee(nominee: FestivalNominee): Promise<FestivalNomineeResult | null> {
    if (!nominee.tmdbId) return null;

    try {
      const type = nominee.tmdbType ?? 'film';
      const details = await (type === 'serie' ? getTvDetails(nominee.tmdbId) : getMovieDetails(nominee.tmdbId));
      if (!details || details.success === false) return null;

      const titre = type === 'film' ? details.title : details.name;
      const original = type === 'film' ? details.original_title : details.original_name;
      const dateSortie = type === 'film' ? details.release_date : details.first_air_date;

      return {
        tmdb_id: nominee.tmdbId,
        titre_vo: original || titre || nominee.titre,
        titre_vf: titre ?? nominee.titre,
        poster_path: details.poster_path ?? null,
        type,
        note_imdb: details.vote_average ?? null,
        date_sortie: dateSortie || null,
        local: false,
        categorie: nominee.categorie,
        gagnant: nominee.gagnant,
      };
    } catch {
      // TMDB peut ne pas connaître un titre pourtant présent sur Wikidata
      // (id périmé, contenu retiré...) — on l'omet plutôt que de faire
      // échouer toute la sélection.
      return null;
    }
  }
}
