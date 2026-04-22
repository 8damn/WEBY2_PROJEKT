import { renderApp } from './src/views.js';
import { subscribe, dispatchAction } from './src/dispatch.js';
import { initRouter } from './src/router.js';
import { appState } from './src/state.js';
import { restoreUserFromToken } from './src/auth.js';

// 1. Zaregistrujeme překreslení UI při jakékoliv změně stavu
subscribe(renderApp);

// 2. Obnovíme session po F5 (pokud token existuje a účet není zablokovaný)
const restoredUser = restoreUserFromToken(appState.data.users);
if (restoredUser) {
    dispatchAction({ type: "LOGIN_SUCCESS", payload: restoredUser });
}

// 3. Inicializujeme router (to vyvolá první akci NAVIGATE a následně první render)
initRouter();
