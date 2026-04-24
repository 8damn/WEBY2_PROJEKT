// main.js
import { renderApp } from './src/views.js';
import { subscribe, dispatchAction } from './src/dispatch.js';
import { initRouter, updateUrl } from './src/router.js';
import { restoreUserFromToken, hashPassword } from './src/auth.js';
import { appState, setState } from './src/state.js';

// 1. Výpočet SHA-256 hashů hesel pro výchozí uživatele.
//    Výchozí data mají hashedPassword: null – vypočítáme asynchronně při startu.
//    Hesla: zakaznik@test.cz → "zakaznik123", admin@test.cz → "admin123"
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

// 2. Obnova přihlášené relace ze SessionStorage (po F5).
//    Hledáme uživatele v datech podle uloženého tokenu.
function restoreSession() {
    const restoredUser = restoreUserFromToken(appState.data.users);
    if (restoredUser) {
        const newState = JSON.parse(JSON.stringify(appState));
        newState.auth.currentUser = restoredUser;
        newState.auth.role = restoredUser.role;
        setState(newState);
    }
}

// 3. Systémová kontrola: ACTIVE výpůjčky po termínu → OVERDUE,
//    CONFIRMED/PENDING rezervace po termínu → EXPIRED.
function runSystemCheck() {
    dispatchAction({ type: "SYSTEM_CHECK" });
}

// 4. Hlavní inicializace aplikace (async kvůli SHA-256)
async function init() {
    await ensureDefaultPasswordHashes();
    restoreSession();
    runSystemCheck();

    // Přihlášení renderApp jako odběratele změn stavu
    subscribe(renderApp);

    // Přihlášení updateUrl jako odběratele změn stavu (stav → URL)
    // Inspirováno init.js z referenčního projektu (Mgr. Daniela Ponce, Ph.D., 2026)
    subscribe(updateUrl);

    // Spuštění routeru (URL → akce, naslouchání hashchange)
    initRouter();
}

init();