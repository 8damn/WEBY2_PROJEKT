// src/state.js
export let appState = {
    ui: { loading: false, error: null, currentRoute: "login" },
    auth: { currentUser: null, role: "GUEST" },
    data: {
        items: [
            { id: "item-1", name: "Vrtačka Bosch", status: "AVAILABLE" },
            // item-2 má aktivní výpůjčku (loan-1), musí být UNAVAILABLE
            { id: "item-2", name: "Pila ocaska", status: "UNAVAILABLE" },
            { id: "item-3", name: "Svářečka", status: "IN_REPAIR" }
        ],
        loans: [
            { id: "loan-1", userId: "u123", itemId: "item-2", status: "ACTIVE", startDate: "2024-12-01", dueDate: "2024-12-31", returnDate: null, penaltyAmount: 0 }
        ],
        reservations: [],
        users: [
            { id: "u123", email: "zakaznik@test.cz", role: "CUSTOMER", status: "VERIFIED" },
            { id: "u999", email: "admin@test.cz", role: "ADMIN", status: "VERIFIED" }
        ]
    }
};

export function setState(newState) { 
    appState = newState; 
}

// --- STAVOVÉ AUTOMATY (Business Pravidla) ---

// Odpovědnost: Martin Teplý (IR01)
export function transitionItemState(item, actionType) {
    const newItem = { ...item };
    switch(actionType) {
        // Naskladnění nového předmětu (NEW → AVAILABLE)
        case "STOCK":           if (item.status === "NEW") newItem.status = "AVAILABLE"; break;
        case "RESERVE":         if (item.status === "AVAILABLE") newItem.status = "RESERVED"; break;
        case "CANCEL_RESERVE":  if (item.status === "RESERVED") newItem.status = "AVAILABLE"; break;
        case "FULFILL":         if (item.status === "RESERVED") newItem.status = "UNAVAILABLE"; break;
        // Přímá výpůjčka bez rezervace (AVAILABLE → UNAVAILABLE)
        case "DIRECT_LOAN":     if (item.status === "AVAILABLE") newItem.status = "UNAVAILABLE"; break;
        case "RETURN_OK":       if (item.status === "UNAVAILABLE") newItem.status = "AVAILABLE"; break;
        case "RETURN_DAMAGED":  if (item.status === "UNAVAILABLE") newItem.status = "IN_REPAIR"; break;
        case "FIX":             if (item.status === "IN_REPAIR") newItem.status = "AVAILABLE"; break;
        // Trvale vyřazení předmětu z provozu (z jakéhokoliv stavu)
        case "RETIRE":          newItem.status = "RETIRED"; break;
    }
    return newItem;
}

// Odpovědnost: Jan Hofmann (IR01 – část Loan)
export function transitionLoanState(loan, actionType) {
    const newLoan = { ...loan };
    switch(actionType) {
        // Aktivace výpůjčky – zákazník převzal předmět (DRAFT_LOAN → ACTIVE)
        case "ACTIVATE":        if (loan.status === "DRAFT_LOAN") newLoan.status = "ACTIVE"; break;
        case "RETURN_OK":       if (loan.status === "ACTIVE" || loan.status === "OVERDUE") newLoan.status = "RETURNED_OK"; break;
        case "RETURN_DAMAGED":  if (loan.status === "ACTIVE" || loan.status === "OVERDUE") newLoan.status = "RETURNED_DAMAGED"; break;
        case "MARK_OVERDUE":    if (loan.status === "ACTIVE") newLoan.status = "OVERDUE"; break;
        // Výpůjčka propadla – věc nebyla vrácena ani po opakované výzvě
        case "NOT_RETURNED":    if (loan.status === "ACTIVE" || loan.status === "OVERDUE") newLoan.status = "NOT_RETURNED"; break;
    }
    return newLoan;
}

// Odpovědnost: Adam Diblík (IR01 – část Reservation)
export function transitionReservationState(res, actionType) {
    const newRes = { ...res };
    switch(actionType) {
        case "CONFIRM":         if (res.status === "PENDING") newRes.status = "CONFIRMED"; break;
        case "FULFILL":         if (res.status === "CONFIRMED") newRes.status = "FULFILLED"; break;
        // Zákazník upravil termín – potřeba nové kontroly kapacity (CONFIRMED → PENDING)
        case "REOPEN":          if (res.status === "CONFIRMED") newRes.status = "PENDING"; break;
        // Expirace – zákazník si věc včas nevyzvedl (CONFIRMED nebo PENDING → EXPIRED)
        case "EXPIRE":          if (res.status === "CONFIRMED" || res.status === "PENDING") newRes.status = "EXPIRED"; break;
        // Zrušení – lze z PENDING i CONFIRMED
        case "CANCEL":          if (res.status === "PENDING" || res.status === "CONFIRMED") newRes.status = "CANCELLED"; break;
    }
    return newRes;
}

// Odpovědnost: Max Jasinek (IR01 – část UserAccount)
export function transitionUserState(user, actionType) {
    const newUser = { ...user };
    switch(actionType) {
        // Ověření emailu nebo identity (REGISTERED → VERIFIED nebo SUSPENDED → VERIFIED po splacení dluhu)
        case "VERIFY":          if (user.status === "REGISTERED" || user.status === "SUSPENDED" || user.status === "BLOCKED") newUser.status = "VERIFIED"; break;
        case "SUSPEND":         if (user.status === "VERIFIED") newUser.status = "SUSPENDED"; break;
        // Trvalá blokace – z jakéhokoliv stavu (krádež, hrubé porušení pravidel)
        case "BLOCK":           newUser.status = "BLOCKED"; break;
    }
    return newUser;
}