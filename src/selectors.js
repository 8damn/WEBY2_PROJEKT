// autor: Jan Hofmann (IR05)
// vybirani a filtrovani dat ze stavu pro UI
export function getAvailableItems(state) {
    return state.data.items.filter(item => item.status === "AVAILABLE");
}

export function getUserReservations(state) {
    if (!state.auth.currentUser) return [];
    return state.data.reservations.filter(res => res.userId === state.auth.currentUser.id);
}

export function getUserLoans(state) {
    if (!state.auth.currentUser) return [];
    return state.data.loans.filter(
        loan => loan.userId === state.auth.currentUser.id
            && (loan.status === "ACTIVE" || loan.status === "OVERDUE")
    );
}

export function isAdmin(state) {
    return state.auth.role === "ADMIN";
}

export function getActiveLoans(state) {
    return state.data.loans.filter(loan => loan.status === "ACTIVE" || loan.status === "OVERDUE");
}

export function getAllUsers(state) {
    return state.data.users;
}