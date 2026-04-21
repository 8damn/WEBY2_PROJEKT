import { transitionReservationState } from '../src/state.js';

export function testScenario_reservationExpiration() {
    console.log("--- Test (Adam): Expirace rezervace ---");
    
    // --- GIVEN ---
    const reservation = { 
        id: "res-1", 
        itemId: "item-5", 
        status: "CONFIRMED" 
    };

    // --- WHEN ---
    // Simulujeme, že vypršel čas a systém volá akci EXPIRE
    const expiredRes = transitionReservationState(reservation, "EXPIRE");

    // --- THEN ---
    console.assert(
        expiredRes.status === "EXPIRED",
        "Chyba: Rezervace by měla změnit stav na EXPIRED"
    );
    
    // Zkusíme neplatný přechod - EXPIRED rezervaci už nelze FULFILL (vyzvednout)
    const invalidFulfill = transitionReservationState(expiredRes, "FULFILL");
    console.assert(
        invalidFulfill.status === "EXPIRED",
        "Chyba: EXPIRED rezervace nesmí jít vyzvednout (zůstává EXPIRED)"
    );
    
    console.log("Výsledek: OK - Rezervace správně expiruje a brání neplatným akcím.\n");
}

testScenario_reservationExpiration();