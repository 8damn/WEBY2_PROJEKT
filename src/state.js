
// autor: Martin Teply (IR01)
// centralni data a stavove automaty
const APP_DATA_STORAGE_KEY = "tnpw2_app_data_v2";

const defaultData = {
    items: [
        { id: "item-1", name: "Vrtačka Bosch", status: "AVAILABLE" },
        { id: "item-2", name: "Pila ocaska", status: "UNAVAILABLE" },
        { id: "item-3", name: "Svářečka", status: "IN_REPAIR" }
    ],
    loans: [

        { id: "loan-1", userId: "u123", itemId: "item-2", status: "ACTIVE", startDate: "2026-04-01", dueDate: "2026-04-30", returnDate: null, penaltyAmount: 0 }
    ],
    reservations: [],

    users: [
        { id: "u123", email: "zakaznik@test.cz", role: "CUSTOMER", status: "VERIFIED", hashedPassword: null, token: null },
        { id: "u999", email: "admin@test.cz", role: "ADMIN", status: "VERIFIED", hashedPassword: null, token: null }
    ]
};

function clone(data) {
    return JSON.parse(JSON.stringify(data));
}

function loadPersistedData() {
    try {
        const raw = localStorage.getItem(APP_DATA_STORAGE_KEY);
        if (!raw) return clone(defaultData);

        const parsed = JSON.parse(raw);
        const isValid = parsed
            && Array.isArray(parsed.items)
            && Array.isArray(parsed.loans)
            && Array.isArray(parsed.reservations)
            && Array.isArray(parsed.users);

        return isValid ? parsed : clone(defaultData);
    } catch {
        return clone(defaultData);
    }
}

function persistData(data) {
    try {
        localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
    } catch {

    }
}

export let appState = {
    auth: { currentUser: null, role: "GUEST" },
    ui: {
        status: "LOADING",
        loading: false,
        error: null,
        currentRoute: "login",
        notification: null,
    },
    data: loadPersistedData()
};

export function setState(newState) {
    appState = newState;
    persistData(appState.data);
}

export function resetState() {
    if (confirm("Opravdu chcete smazat všechna data a resetovat aplikaci do výchozího stavu?")) {
        localStorage.removeItem(APP_DATA_STORAGE_KEY);
        location.reload();
    }
}

export function transitionItemState(item, actionType) {
    const newItem = { ...item };
    switch (actionType) {
        case "STOCK": if (item.status === "NEW") newItem.status = "AVAILABLE"; break;
        case "RESERVE": if (item.status === "AVAILABLE") newItem.status = "RESERVED"; break;
        case "CANCEL_RESERVE": if (item.status === "RESERVED") newItem.status = "AVAILABLE"; break;
        case "FULFILL": if (item.status === "RESERVED") newItem.status = "UNAVAILABLE"; break;
        case "DIRECT_LOAN": if (item.status === "AVAILABLE") newItem.status = "UNAVAILABLE"; break;
        case "RETURN_OK": if (item.status === "UNAVAILABLE") newItem.status = "AVAILABLE"; break;
        case "RETURN_DAMAGED": if (item.status === "UNAVAILABLE") newItem.status = "IN_REPAIR"; break;
        case "FIX": if (item.status === "IN_REPAIR") newItem.status = "AVAILABLE"; break;
        case "RETIRE": newItem.status = "RETIRED"; break;
    }
    return newItem;
}

export function transitionLoanState(loan, actionType) {
    const newLoan = { ...loan };
    switch (actionType) {
        case "ACTIVATE": if (loan.status === "DRAFT_LOAN") newLoan.status = "ACTIVE"; break;
        case "RETURN_OK": if (loan.status === "ACTIVE" || loan.status === "OVERDUE") newLoan.status = "RETURNED_OK"; break;
        case "RETURN_DAMAGED": if (loan.status === "ACTIVE" || loan.status === "OVERDUE") newLoan.status = "RETURNED_DAMAGED"; break;
        case "MARK_OVERDUE": if (loan.status === "ACTIVE") newLoan.status = "OVERDUE"; break;
        case "NOT_RETURNED": if (loan.status === "ACTIVE" || loan.status === "OVERDUE") newLoan.status = "NOT_RETURNED"; break;
    }
    return newLoan;
}

export function transitionReservationState(res, actionType) {
    const newRes = { ...res };
    switch (actionType) {
        case "CONFIRM": if (res.status === "PENDING") newRes.status = "CONFIRMED"; break;
        case "FULFILL": if (res.status === "CONFIRMED") newRes.status = "FULFILLED"; break;
        case "UPDATE_TERM": if (res.status === "CONFIRMED" || res.status === "PENDING") newRes.status = "PENDING"; break;
        case "EXPIRE": if (res.status === "CONFIRMED" || res.status === "PENDING") newRes.status = "EXPIRED"; break;
        case "CANCEL": if (res.status === "PENDING" || res.status === "CONFIRMED") newRes.status = "CANCELLED"; break;
    }
    return newRes;
}

export function transitionUserState(user, actionType) {
    const newUser = { ...user };
    switch (actionType) {
        case "VERIFY": if (user.status === "REGISTERED" || user.status === "SUSPENDED" || user.status === "BLOCKED") newUser.status = "VERIFIED"; break;
        case "SUSPEND": if (user.status === "VERIFIED") newUser.status = "SUSPENDED"; break;
        case "BLOCK": newUser.status = "BLOCKED"; break;
    }
    return newUser;
}