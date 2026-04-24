// autor: Jan Hofmann (IR05)
// vybirani a filtrovani dat ze stavu pro UI
// views nedostane zadne "surove" statusy - vsechno rozhodovani je tady

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

// capabilities pro login stranku
export function selectAuthCapabilities(state) {
    const isLoggedIn = state.auth.currentUser !== null;
    return {
        isLoggedIn,
        canLogin: !isLoggedIn,
        canRegister: !isLoggedIn,
        canLogout: isLoggedIn,
    };
}

// capabilities pro zakaznicky pohled
export function selectCustomerView(state) {
    const currentUser = state.auth.currentUser;
    const userData = currentUser ? state.data.users.find(u => u.id === currentUser.id) : null;
    const isSuspended = userData?.status === "SUSPENDED";

    return {
        canReserve: !isSuspended,
        availableItems: getAvailableItems(state),
        unavailableItems: state.data.items.filter(i =>
            i.status === "RESERVED" || i.status === "UNAVAILABLE" || i.status === "IN_REPAIR"
        ),
        reservations: getUserReservations(state).map(r => ({
            ...r,
            canEdit: r.status === "PENDING" || r.status === "CONFIRMED",
            canCancel: r.status === "PENDING" || r.status === "CONFIRMED",
            itemName: (state.data.items.find(i => i.id === r.itemId) || {}).name || r.itemId,
        })),
        loans: getUserLoans(state).map(l => ({
            ...l,
            canReportLoss: l.status === "ACTIVE" || l.status === "OVERDUE",
            itemName: (state.data.items.find(i => i.id === l.itemId) || {}).name || l.itemId,
        })),
        error: state.ui.error,
        loading: state.ui.loading,
    };
}

// capabilities pro admin pohled
export function selectAdminView(state) {
    return {
        pendingUsers: state.data.users.filter(u => u.status === "REGISTERED").map(u => ({
            ...u,
            canVerify: true,
        })),
        pendingReservations: state.data.reservations.filter(r => r.status === "PENDING").map(r => ({
            ...r,
            canConfirm: true,
            canReject: true,
            userEmail: (state.data.users.find(u => u.id === r.userId) || {}).email || r.userId,
            itemName: (state.data.items.find(i => i.id === r.itemId) || {}).name || r.itemId,
        })),
        confirmedReservations: state.data.reservations.filter(r => r.status === "CONFIRMED").map(r => ({
            ...r,
            canFulfill: true,
            canReject: true,
            userEmail: (state.data.users.find(u => u.id === r.userId) || {}).email || r.userId,
            itemName: (state.data.items.find(i => i.id === r.itemId) || {}).name || r.itemId,
        })),
        activeLoans: getActiveLoans(state).map(l => ({
            ...l,
            canReturnOk: true,
            canReturnDamaged: true,
            userEmail: (state.data.users.find(u => u.id === l.userId) || {}).email || l.userId,
            itemName: (state.data.items.find(i => i.id === l.itemId) || {}).name || l.itemId,
        })),
        items: state.data.items.filter(i => i.status !== "RETIRED").map(i => ({
            ...i,
            canFix: i.status === "IN_REPAIR",
            canRetire: i.status !== "UNAVAILABLE",
        })),
        users: getAllUsers(state).filter(u => u.status !== "REGISTERED").map(u => ({
            ...u,
            canUnblock: u.status === "SUSPENDED" || u.status === "BLOCKED",
            canBlock: u.status !== "BLOCKED" && u.role !== "ADMIN",
        })),
    };
}