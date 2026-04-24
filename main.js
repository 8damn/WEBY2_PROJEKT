import { renderApp } from './src/views.js';
import { subscribe, dispatchAction } from './src/dispatch.js';
import { initRouter } from './src/router.js';
import { restoreUserFromToken } from './src/auth.js';
import { appState, setState } from './src/state.js';

// 1. Pokusíme se obnovit relaci ze SessionStorage (po F5)
const restoredUser = restoreUserFromToken(appState.data.users);
if (restoredUser) {
    const newState = JSON.parse(JSON.stringify(appState));
    newState.auth.currentUser = restoredUser;
    newState.auth.role = restoredUser.role;
    setState(newState);
}

// 2. Systémová kontrola: překlápí ACTIVE výpůjčky po termínu na OVERDUE
//    a CONFIRMED/PENDING rezervace po termínu na EXPIRED.
//    Spouští se při každém startu aplikace jako náhrada za chybějící backend scheduler.
dispatchAction({ type: "SYSTEM_CHECK" });

// 3. Zaregistrujeme překreslení UI při jakékoliv změně stavu
subscribe(renderApp);

// 4. Inicializujeme router (to vyvolá první akci NAVIGATE a následně první render)
initRouter();