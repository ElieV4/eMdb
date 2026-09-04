-- Colonnes de titres utiles a la dataviz uniquement.
select
    id as title_id,
    duree_minutes,
    is_animation
from {{ source('emdb', 'titles') }}
