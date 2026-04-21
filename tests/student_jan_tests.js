import { transitionLoanState } from '../src/state.js';
import { getActiveLoans } from '../src/selectors.js';

export function testScenario_loanTransitions() {
    console.log("--- Test (Jan): Stavový automat Výpůjčky ---");
    
    // --- GIVEN ---
    const draftLoan = { id: "loan-99", status: "DRAFT_LOAN" };

    // --- WHEN ---
    const activeLoan = transitionLoanState(draftLoan, "ACTIVATE");
    const returnedLoan = transitionLoanState(activeLoan, "RETURN_OK");

    // --- THEN ---
    console.assert(
        activeLoan.status === "ACTIVE",
        "Chyba: DRAFT_LOAN by se měl po ACTIVATE změnit na ACTIVE"
    );
    console.assert(
        returnedLoan.status === "RETURNED_OK",
        "Chyba: ACTIVE by se měl po RETURN_OK změnit na RETURNED_OK"
    );
    console.log("Výsledek: OK - Přechody stavů Loan fungují.\n");
}

export function testScenario_activeLoansSelector() {
    console.log("--- Test (Jan): Selektor aktivních výpůjček ---");
    
    // --- GIVEN ---
    const mockState = {
        data: {
            loans: [
                { id: "L1", status: "ACTIVE" },
                { id: "L2", status: "RETURNED_OK" },
                { id: "L3", status: "OVERDUE" }
            ]
        }
    };

    // --- WHEN ---
    const activeLoans = getActiveLoans(mockState);

    // --- THEN ---
    console.assert(
        activeLoans.length === 2,
        "Chyba: Selektor by měl vrátit pouze 2 výpůjčky (ACTIVE a OVERDUE)"
    );
    console.log("Výsledek: OK - Selektor správně filtruje výpůjčky.\n");
}

testScenario_loanTransitions();
testScenario_activeLoansSelector();