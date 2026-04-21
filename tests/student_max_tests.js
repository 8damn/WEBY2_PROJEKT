import { appState, setState } from '../src/state.js';
import { dispatchAction } from '../src/dispatch.js';

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function testScenario_suspendedUserCannotReserve() {
    console.log("--- Test (Max): Zablokování akce pro SUSPENDED uživatele ---");
    
    // --- GIVEN ---
    let state = clone(appState);
    state.auth.currentUser = { id: "u-bad", email: "zlobivy@test.cz" };
    // Zákazník je SUSPENDED (např. kvůli pokutě)
    state.data.users = [{ id: "u-bad", status: "SUSPENDED" }];
    state.data.items = [{ id: "item-1", status: "AVAILABLE" }];
    
    setState(state);

    const action = {
        type: "RESERVE_START",
        payload: { itemId: "item-1" }
    };

    // --- WHEN ---
    dispatchAction(action);

    // --- THEN ---
    const finalState = appState;
    
    console.assert(
        finalState.ui.error !== null,
        "Chyba: Měla by vyskočit chybová hláška z dispatcheru"
    );
    console.assert(
        finalState.data.items[0].status === "AVAILABLE",
        "Chyba: Předmět musí zůstat AVAILABLE, protože rezervace byla zamítnuta"
    );
    console.log("Výsledek: OK - SUSPENDED uživatel nemá oprávnění tvořit rezervace.\n");
}

testScenario_suspendedUserCannotReserve();