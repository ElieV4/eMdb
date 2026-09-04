import type { CapacitorConfig } from '@capacitor/cli';

// L'APK charge le site de prod à distance (server.url) plutôt que de
// bundler un build statique : le contenu web (UI, logique) reste à jour à
// chaque ouverture de l'app sans avoir à republier l'APK. Seuls les
// changements natifs (icône, permissions, plugins) nécessitent un nouveau
// build. Distribution en APK privé (sideload), pas de publication Play Store.
const config: CapacitorConfig = {
  appId: 'com.emdb.app',
  appName: 'eMdb',
  webDir: 'out',
  server: {
    url: 'https://emdb-web.vercel.app',
    androidScheme: 'https',
  },
};

export default config;
