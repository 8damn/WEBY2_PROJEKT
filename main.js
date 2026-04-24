// inicializace aplikace
import { renderApp } from './src/views.js';
import { subscribe, dispatchAction } from './src/dispatch.js';
import { initRouter, updateUrl } from './src/router.js';
import { getAuthToken, clearAuthToken, hashPassword } from './src/auth.js';
import { appState, setState } from './src/state.js';
import { createApi } from './src/asyncApi.js';

async function ensureDefaultPasswordHashes() {
    const defaultPasswords = {
        "zakaznik@test.cz": "zakaznik123",
        "admin@test.cz": "admin123",
    };

    const newState = JSON.parse(JSON.stringify(appState));
    let changed = false;

    for (const user of newState.data.users) {
        if (!user.hashedPassword && defaultPasswords[user.email]) {
            user.hashedPassword = await hashPassword(defaultPasswords[user.email]);
            changed = true;
        }
    }

    if (changed) setState(newState);
}

// obnova session pomoci whoAmI API
async function restoreSession() {
    const token = getAuthToken();
    if (!token) return;

    const api = createApi(appState.data);
    const result = await api.whoAmI(token);

    if (result.status === "SUCCESS") {
        const newState = JSON.parse(JSON.stringify(appState));
        newState.auth.currentUser = result.user;
        newState.auth.role = result.user.role;
        setState(newState);
    } else {
        clearAuthToken();
    }
}

async function init() {
    // 1. zobraz loading stav
    renderApp();

    // 2. hash vychozich hesel (pokud jeste nejsou)
    await ensureDefaultPasswordHashes();

    // 3. obnova session pres API
    await restoreSession();

    // 4. systemova kontrola (overdue, expirace)
    dispatchAction({ type: "SYSTEM_CHECK" });

    // 5. subscribe a prepnuti do READY
    subscribe(renderApp);
    subscribe(updateUrl);

    const readyState = JSON.parse(JSON.stringify(appState));
    readyState.ui.status = "READY";
    setState(readyState);

    // 6. spusteni routeru (prvni navigace podle URL)
    initRouter();
}

init();