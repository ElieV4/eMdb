-- Un test dbt "singulier" : la requete doit retourner 0 ligne pour passer.
-- Ici, aucune duree de visionnage ne doit etre negative.
select watch_id, duree_minutes
from {{ ref('int_watches_enriched') }}
where duree_minutes < 0
