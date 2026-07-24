# Phase Frontend 1.0 — Pages d'authentification

> **Objectif** : Implémenter les pages de connexion et d'inscription (login/register) avec validation, gestion d'erreurs, et protection de routes.

**Contexte source** : `docs/emdb_roadmap_frontend.md` (Phase 1) + `docs/phase-frontend-0.0-socle.md` (Phase 0) + backend `apps/api/src/auth/` (Module 1).

---

## Objectifs

- [x] Implémenter le formulaire de connexion (login) avec validation email/password.
- [x] Implémenter le formulaire d'inscription (register) avec validation email, pseudo, password, confirmation.
- [x] Créer le composant `AuthInput` réutilisable (label, input, error message, accessibilité).
- [x] Connecter les formulaires aux hooks `useLogin` / `useRegister` (React Query mutations).
- [x] Gérer les états loading / error / success dans les formulaires.
- [x] Rediriger vers `/` (ou `?redirect=`) après login/register réussis.
- [x] Afficher les erreurs API (401 email/password invalide, 409 email/pseudo déjà utilisé).
- [x] Implémenter la protection de routes via le middleware Next.js (cookie `emdb_access_token`).
- [x] Corriger l'`apiClient` pour envoyer le header `Authorization: Bearer <token>` depuis le store Zustand.
- [x] Ajouter le `refreshToken` au store Zustand (pour le rafraîchissement futur).
- [x] Tests unitaires (Jest + RTL) pour `LoginForm`, `RegisterForm`, `AuthInput`.
- [x] Tests unitaires améliorés pour les hooks `useLogin`, `useRegister`, `useLogout`, `useAuth`.
- [x] Scénarios Cypress e2e (non exécutés en CI).
- [x] Validation : `next build`, `next lint`, `prettier --check`, `jest`.

---

## Pages à créer/modifier

| Page                           | Action       | Description                                                                               |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| `app/(auth)/login/page.tsx`    | **Modifier** | Formulaire login : email, password, validation, erreur 401, redirect.                     |
| `app/(auth)/register/page.tsx` | **Modifier** | Formulaire register : email, pseudo, password, confirm, validation, erreur 409, redirect. |
| `app/(auth)/layout.tsx`        | **Modifier** | Layout centré (card sombre) sans header/footer.                                           |

---

## Composants à créer

| Composant      | Fichier                            | Description                                                                                                                                       |
| -------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthInput`    | `components/auth/AuthInput.tsx`    | Input avec label, error message, support type text/email/password, accessibilité ARIA.                                                            |
| `LoginForm`    | `components/auth/LoginForm.tsx`    | Formulaire login complet : validation, appel `useLogin`, états loading/error/success, redirect.                                                   |
| `RegisterForm` | `components/auth/RegisterForm.tsx` | Formulaire register complet : validation (pseudo 3-30, password min 8, confirmation), appel `useRegister`, états loading/error/success, redirect. |

---

## Hooks à modifier

| Hook          | Fichier                     | Modifications                                                                                                      |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `useLogin`    | `hooks/auth/useLogin.ts`    | Stocker `refreshToken` dans le store, set cookie `emdb_access_token`, exposer `error`/`isPending` via React Query. |
| `useRegister` | `hooks/auth/useRegister.ts` | Stocker `refreshToken` dans le store, set cookie `emdb_access_token`, exposer `error`/`isPending` via React Query. |
| `useLogout`   | `hooks/auth/useLogout.ts`   | Clear cookie `emdb_access_token` en plus du store.                                                                 |
| `useAuth`     | `hooks/auth/useAuth.ts`     | Aucun changement (déjà retourne le store).                                                                         |

---

## Store à modifier

| Store       | Fichier              | Modifications                                                      |
| ----------- | -------------------- | ------------------------------------------------------------------ |
| `authStore` | `store/authStore.ts` | Ajouter `refreshToken: string \| null` + action `setRefreshToken`. |

---

## API Client à modifier

| Fichier                | Modifications                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `lib/api/apiClient.ts` | Lire `accessToken` depuis le store Zustand via `getState()` et ajouter le header `Authorization: Bearer <token>`. |

---

## Middleware à modifier

| Fichier         | Modifications                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `middleware.ts` | Vérifier le cookie `emdb_access_token` sur les routes protégées. Rediriger vers `/login` si absent. Routes publiques : `/`, `/login`, `/register`. |

---

## Endpoints API consommés (vérifiés côté backend)

| Endpoint         | Méthode | Auth | Status backend | DTO                                                                     |
| ---------------- | ------- | ---- | -------------- | ----------------------------------------------------------------------- |
| `/auth/login`    | POST    | ❌   | ✅ Existe      | `LoginDto` (email IsEmail, password IsNotEmpty)                         |
| `/auth/register` | POST    | ❌   | ✅ Existe      | `RegisterDto` (email IsEmail, pseudo IsNotEmpty, password MinLength(8)) |
| `/auth/logout`   | POST    | ✅   | ✅ Existe      | —                                                                       |
| `/auth/refresh`  | POST    | ❌   | ✅ Existe      | `RefreshDto` (refreshToken IsNotEmpty)                                  |
| `/auth/me`       | GET     | ✅   | ✅ Existe      | —                                                                       |

**Réponse auth** : `{ user: AuthenticatedUser, accessToken: string, refreshToken: string }`

**JWT strategy** : `ExtractJwt.fromAuthHeaderAsBearerToken()` → le token est lu depuis le header `Authorization: Bearer <token>`.

---

## Gestion des états (loading/error/empty)

- **Loading** : bouton désactivé + `LoadingSpinner` à l'intérieur.
- **Error** : message d'erreur affiché sous le formulaire (ex: "Email ou mot de passe invalide" pour 401, "Ce pseudo est déjà utilisé" pour 409).
- **Success** : redirect vers `/` ou `?redirect=` via `useRouter` dans le composant formulaire.
- **Validation** : erreurs champ par champ (email invalide, password trop court, confirmation ne correspond pas).

---

## Décisions prises

| Décision            | Choix                                                                            | Justification                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Form library        | Aucun (validation manuelle)                                                      | Phase 1 simple, pas de dépendance supplémentaire, react-hook-form ajouté aux phases métier si besoin.                                |
| Auth storage        | Zustand (accessToken + refreshToken) + cookie `emdb_access_token` (non-httpOnly) | Middleware a besoin d'un cookie pour la protection de routes. Le cookie httpOnly sera géré par le backend dans une future itération. |
| API auth            | Header `Authorization: Bearer <token>`                                           | Le backend JWT strategy utilise `fromAuthHeaderAsBearerToken()`.                                                                     |
| Redirect            | `useRouter` dans les composants formulaire                                       | Séparation des responsabilités : hooks = mutations, composants = navigation.                                                         |
| Validation password | Min 8 (backend)                                                                  | Aligné sur `RegisterDto.MinLength(8)`. La roadmap dit min 6 mais le backend impose 8.                                                |
| Validation pseudo   | 3-30 chars (frontend)                                                            | UX améliorée ; le backend ne valide que `IsNotEmpty`.                                                                                |

---

## Points ambigus (résolus)

1. **Cookie httpOnly vs non-httpOnly** : Le backend ne set pas de cookie. Le frontend set un cookie non-httpOnly pour le middleware. → Documenté comme dette technique.
2. **Password min 6 vs 8** : La roadmap dit 6, le backend impose 8. → On suit le backend (8).
3. **Pseudo validation** : La roadmap dit 3-30 chars, le backend ne valide que non-vide. → On valide 3-30 côté frontend pour l'UX.

---

## Tests

### Tests unitaires (Jest + RTL)

| Fichier                                                | Description                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| `__tests__/unit/components/auth/AuthInput.test.tsx`    | Rendu label, input, error message, types, ARIA.                 |
| `__tests__/unit/components/auth/LoginForm.test.tsx`    | Validation email/password, affichage erreur, submit, redirect.  |
| `__tests__/unit/components/auth/RegisterForm.test.tsx` | Validation pseudo/password/confirm, mismatch, submit, redirect. |
| `__tests__/unit/hooks/auth/useLogin.test.tsx`          | Mutation, store update, cookie set, error handling.             |
| `__tests__/unit/hooks/auth/useRegister.test.tsx`       | Mutation, store update, cookie set, error handling.             |
| `__tests__/unit/hooks/auth/useLogout.test.tsx`         | Mutation, store clear, cookie clear.                            |
| `__tests__/unit/hooks/auth/useAuth.test.tsx`           | Store state, isAuthenticated, isLoading.                        |

### Scénarios Cypress (e2e) — à tester manuellement

| #   | Scénario                                                                              | Priorité |
| --- | ------------------------------------------------------------------------------------- | -------- |
| 1   | Page login s'affiche avec formulaire email/password                                   | Haute    |
| 2   | Page register s'affiche avec formulaire email/pseudo/password/confirm                 | Haute    |
| 3   | Login avec email invalide affiche erreur de validation                                | Haute    |
| 4   | Register avec password < 8 affiche erreur de validation                               | Haute    |
| 5   | Register avec password ≠ confirm affiche erreur                                       | Haute    |
| 6   | Login réussi → redirect vers `/`                                                      | Haute    |
| 7   | Register réussi → redirect vers `/`                                                   | Haute    |
| 8   | Login avec mauvais credentials → erreur 401 affichée                                  | Haute    |
| 9   | Register avec email existant → erreur 409 affichée                                    | Haute    |
| 10  | Middleware redirige vers `/login` si route protégée sans cookie                       | Haute    |
| 11  | Header affiche "Déconnexion" quand connecté, "Connexion/Inscription" quand déconnecté | Moyenne  |
| 12  | Déconnexion → cookie effacé, redirect vers `/login`                                   | Moyenne  |

---

## Critères d'acceptation

- [x] `npm run build` passe.
- [x] `npm run lint` passe (0 erreur, 0 warning).
- [x] `npm run format:check` passe.
- [x] Tests unitaires Jest/RTL passent.
- [x] Formulaire login : validation, erreur 401, redirect.
- [x] Formulaire register : validation, erreur 409, redirect.
- [x] `AuthInput` réutilisable avec accessibilité.
- [x] Middleware protège les routes (cookie check).
- [x] `apiClient` envoie `Authorization: Bearer <token>`.
- [x] Store Zustand inclut `refreshToken`.
- [x] Cypress e2e scénarios documentés (non exécutés en CI).

---

## Arborescence cible Phase 1

```
apps/web/
├── src/
│   ├── app/
│   │   └── (auth)/
│   │       ├── layout.tsx          # MODIFIÉ : card centrée
│   │       ├── login/
│   │       │   └── page.tsx        # MODIFIÉ : LoginForm
│   │       └── register/
│   │           └── page.tsx        # MODIFIÉ : RegisterForm
│   ├── components/
│   │   └── auth/
│   │       ├── AuthInput.tsx       # CRÉÉ
│   │       ├── LoginForm.tsx       # CRÉÉ
│   │       └── RegisterForm.tsx    # CRÉÉ
│   ├── hooks/
│   │   └── auth/
│   │       ├── useLogin.ts         # MODIFIÉ : refreshToken + cookie
│   │       ├── useRegister.ts      # MODIFIÉ : refreshToken + cookie
│   │       ├── useLogout.ts        # MODIFIÉ : cookie clear
│   │       └── useAuth.ts          # inchangé
│   ├── lib/
│   │   └── api/
│   │       └── apiClient.ts        # MODIFIÉ : Authorization header
│   ├── store/
│   │   └── authStore.ts            # MODIFIÉ : refreshToken
│   └── ...
├── __tests__/
│   └── unit/
│       ├── components/
│       │   └── auth/
│       │       ├── AuthInput.test.tsx       # CRÉÉ
│       │       ├── LoginForm.test.tsx       # CRÉÉ
│       │       └── RegisterForm.test.tsx    # CRÉÉ
│       └── hooks/
│           └── auth/
│               ├── useLogin.test.tsx        # MODIFIÉ
│               ├── useRegister.test.tsx     # MODIFIÉ
│               ├── useLogout.test.tsx       # MODIFIÉ
│               └── useAuth.test.tsx         # MODIFIÉ
├── cypress/
│   └── e2e/
│       └── auth.cy.ts               # CRÉÉ
├── middleware.ts                   # MODIFIÉ : route protection
└── ...
```

---

## Plan d'implémentation

1. Créer le document de contexte (`docs/phase-frontend-1.0-auth.md`).
2. Modifier le store Zustand (`authStore.ts`) — ajouter `refreshToken`.
3. Modifier l'apiClient (`apiClient.ts`) — ajouter le header `Authorization`.
4. Modifier les hooks (`useLogin`, `useRegister`, `useLogout`) — refreshToken + cookie.
5. Modifier le middleware (`middleware.ts`) — protection de routes.
6. Créer les composants (`AuthInput`, `LoginForm`, `RegisterForm`).
7. Modifier les pages (`login/page.tsx`, `register/page.tsx`, `layout.tsx`).
8. Modifier le `Header.tsx` — redirect après logout.
9. Écrire les tests unitaires (Jest + RTL).
10. Écrire les scénarios Cypress e2e.
11. Valider : `next build`, `next lint`, `prettier --check`, `jest`.
12. Mettre à jour la documentation (roadmap, TECHNICAL_DETAILS, ARCHITECTURE_OVERVIEW).
13. Commit atomique (Conventional Commits) + sync.
