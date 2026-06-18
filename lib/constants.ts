// ---------------------------------------------------------------------------
// Constantes partagees du projet FanBar Arena.
// Importees dans les services et composants pour eviter la duplication.
// ---------------------------------------------------------------------------

/** Capacite maximale du bar (nombre de personnes). */
export const VENUE_CAPACITY = 50;

/** Limite legale indicative d'alcoolemie (g/L). */
export const ALCOHOL_LIMIT = 0.5;

/** Nombre maximal de points dans les mini-graphes ecosysteme. */
export const ECO_HISTORY_LENGTH = 40;

/** Intervalle de rafraichissement eco-mode (ms). */
export const ECO_REFRESH_MS = 15_000;

/** Intervalle de rafraichissement normal (ms). */
export const LIVE_REFRESH_MS = 2_000;

/** Intervalle de rafraichissement du suivi alcool client (ms). */
export const ALCOHOL_REFRESH_MS = 5_000;

/** Nombre maximal de lignes chargees depuis la table d'alcoolemie. */
export const ALCOHOL_MAX_ROWS = 2_000;
