// src/selectors.js

export function getAvailableItems(state) {
    return state.data.items.filter(item => item.status === "AVAILABLE");
}

export function getUserReservations(state) {
    if (!state.auth.currentUser) return [];
    return state.data.reservations.filter(res => res.userId === state.auth.currentUser.id);
}

export function isLoggedIn(state) {
    return state.auth.currentUser !== null;
}

// --- NOVÉ SELEKTORY PRO ADMINISTRÁTORA ---

export function isAdmin(state) {
    return state.auth.role === "ADMIN";
}

export function getActiveLoans(state) {
    // Vrátíme všechny výpůjčky, které ještě nebyly vráceny
    return state.data.loans.filter(loan => loan.status === "ACTIVE" || loan.status === "OVERDUE");
}

export function getAllUsers(state) {
    return state.data.users;
}