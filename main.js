
import { renderApp } from './src/views.js';
import { subscribe, dispatchAction } from './src/dispatch.js';
import { initRouter, updateUrl } from './src/router.js';
import { restoreUserFromToken, hashPassword } from './src/auth.js';
import { appState, setState } from './src/state.js';

async function ensureDefaultPasswordHashes() {
    const defaultPasswords = {
        "zakaznik@test.cz": "zakaznik123",
        "admin@test.cz":    "admin123",
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

function restoreSession() {
    const restoredUser = restoreUserFromToken(appState.data.users);
    if (restoredUser) {
        const newState = JSON.parse(JSON.stringify(appState));
        newState.auth.currentUser = restoredUser;
        newState.auth.role = restoredUser.role;
        setState(newState);
    }
}

function runSystemCheck() {
    dispatchAction({ type: "SYSTEM_CHECK" });
}

async function init() {
    await ensureDefaultPasswordHashes();
    restoreSession();
    runSystemCheck();

    subscribe(renderApp);

    subscribe(updateUrl);

    initRouter();
}

init();