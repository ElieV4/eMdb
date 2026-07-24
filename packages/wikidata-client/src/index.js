"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWikipediaUrlFromWikidataId = getWikipediaUrlFromWikidataId;
async function getWikipediaUrlFromWikidataId(wikidataId, lang = 'fr') {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(wikidataId)}&props=sitelinks/urls&format=json&formatversion=2`;
    const res = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
    });
    if (!res.ok) {
        throw new Error(`Wikidata request failed ${res.status}: ${res.statusText}`);
    }
    const json = (await res.json());
    const siteLinks = json.entities?.[wikidataId]?.sitelinks;
    if (!siteLinks) {
        return null;
    }
    const siteKey = `${lang}wiki`;
    return siteLinks[siteKey]?.url ?? null;
}
//# sourceMappingURL=index.js.map