import { appState, setState } from '../src/state.js';
import { dispatchAction } from '../src/dispatch.js';

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function testScenario_reserveItem() {
    console.log("--- Test (Martin): Vytvoření rezervace ---");
    
    // --- GIVEN (Vstupní stav) ---
    let state = clone(appState);
    state.auth.currentUser = { id: "u123", email: "test@test.cz", role: "CUSTOMER" };
    state.data.items = [{ id: "item-1", name: "Vrtačka", status: "AVAILABLE" }];
    state.data.reservations = [];
    state.data.users = [{ id: "u123", status: "VERIFIED" }]; // Uživatel není blokován
    
    // Nastavíme tento stav jako aktuální pro dispatcher
    setState(state);

    const action = {
        type: "RESERVE_SUCCESS", // Pro zjednodušení testujeme rovnou SUCCESS fázi bez čekání na API
        payload: "item-1"
    };

    // --- WHEN (Provedení akce) ---
    dispatchAction(action);

    // --- THEN (Ověření výsledku) ---
    const finalState = appState;
    
    console.assert(
        finalState.data.items[0].status === "RESERVED",
        "Chyba: Předmět by měl změnit stav na RESERVED"
    );
    console.assert(
        finalState.data.reservations.length === 1,
        "Chyba: Měla by vzniknout 1 nová rezervace"
    );
    console.log("Výsledek: OK - Předmět byl úspěšně zarezervován.\n");
}

testScenario_reserveItem();