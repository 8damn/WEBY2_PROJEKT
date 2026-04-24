// src/selectors.js

export function getAvailableItems(state) {
    return state.data.items.filter(item => item.status === "AVAILABLE");
}

export function getUserReservations(state) {
    if (!state.auth.currentUser) return [];
    return state.data.reservations.filter(res => res.userId === state.auth.currentUser.id);
}

// Výpůjčky aktuálního zákazníka, které ještě nebyly vráceny (zákazník je má fyzicky u sebe).
// Slouží pro sekci "Mé výpůjčky" v pohledu zákazníka, kde může nahlásit ztrátu.
export function getUserLoans(state) {
    if (!state.auth.currentUser) return [];
    return state.data.loans.filter(
        loan => loan.userId === state.auth.currentUser.id
            && (loan.status === "ACTIVE" || loan.status === "OVERDUE")
    );
}


// --- SELEKTORY PRO ADMINISTRÁTORA ---

export function isAdmin(state) {
    return state.auth.role === "ADMIN";
}

export function getActiveLoans(state) {
    return state.data.loans.filter(loan => loan.status === "ACTIVE" || loan.status === "OVERDUE");
}

export function getAllUsers(state) {
    return state.data.users;
}