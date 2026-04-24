// src/dispatch.js
import { appState, setState, transitionItemState, transitionLoanState, transitionReservationState, transitionUserState } from './state.js';
import { createAuthApi, fetchReserveItem } from './asyncApi.js';
import { saveAuthToken, clearAuthToken, getAuthToken } from './auth.js';

const listeners = [];
export function subscribe(fn) { listeners.push(fn); }

// -------------------------------------------------------
// Pomocné funkce pro rezervace
// -------------------------------------------------------

// Rezervace blokuje termín pouze pokud ještě nebyla vyřízena ani nevypršela.
function isReservationActive(reservation) {
    return reservation.status !== "CANCELLED"
        && reservation.status !== "EXPIRED"
        && reservation.status !== "FULFILLED";
}

function hasDateOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

function hasReservationConflict(reservations, itemId, from, to, ignoreReservationId = null) {
    return reservations
        .filter(r => r.itemId === itemId)
        .filter(r => isReservationActive(r))
        .filter(r => r.id !== ignoreReservationId)
        .some(r => r.requestedFrom && r.requestedTo && hasDateOverlap(from, to, r.requestedFrom, r.requestedTo));
}

function today() {
    return new Date().toISOString().split("T")[0];
}

// -------------------------------------------------------
// Dispatcher
// -------------------------------------------------------

export function dispatchAction(action) {
    let newState = JSON.parse(JSON.stringify(appState));
    newState.ui.error = null;

    switch (action.type) {

        // -------------------------------------------------------
        // IR04: Navigační akce (Router → Dispatcher)
        // Každá akce ověří oprávnění (route guard) a nastaví currentRoute.
        // -------------------------------------------------------

        case "ENTER_LOGIN": {
            // Přihlášený uživatel nemá co dělat na login stránce
            if (newState.auth.currentUser) {
                newState.ui.currentRoute = newState.auth.role === "ADMIN" ? "admin" : "dashboard";
            } else {
                newState.ui.currentRoute = "login";
            }
            break;
        }

        case "ENTER_DASHBOARD": {
            // Nepřihlášený uživatel → zpět na login
            if (!newState.auth.currentUser) {
                newState.ui.currentRoute = "login";
            } else if (newState.auth.role === "ADMIN") {
                // Admin patří na admin panel, ne zákaznický dashboard
                newState.ui.currentRoute = "admin";
            } else {
                newState.ui.currentRoute = "dashboard";
            }
            break;
        }

        case "ENTER_ADMIN": {
            if (!newState.auth.currentUser) {
                newState.ui.currentRoute = "login";
            } else if (newState.auth.role !== "ADMIN") {
                // Zákazník nemá přístup na admin panel
                newState.ui.currentRoute = "dashboard";
            } else {
                newState.ui.currentRoute = "admin";
            }
            break;
        }

        // -------------------------------------------------------
        // IR08: Autentizace (Adam Diblík)
        // Vychází ze vzoru loginUser / registerUser / logoutUser z referenčního projektu.
        // -------------------------------------------------------

        case "LOGIN_START": {
            newState.ui.loading = true;
            // createAuthApi dostane snapshot uživatelů z aktuálního stavu
            const authApi = createAuthApi({ users: newState.data.users });
            authApi.login({ email: action.payload.email, password: action.payload.password })
                .then(result => dispatchAction({ type: "LOGIN_RESULT", payload: result }))
                .catch(e => dispatchAction({ type: "LOGIN_RESULT", payload: { status: "ERROR", reason: e.message } }));
            break;
        }

        case "LOGIN_RESULT": {
            newState.ui.loading = false;
            const { status, reason, role, userId, token } = action.payload;

            if (status === "SUCCESS") {
                // Uložíme token k uživateli v datech (pro obnovu session po F5)
                const uIdx = newState.data.users.findIndex(u => u.id === userId);
                if (uIdx > -1) {
                    newState.data.users[uIdx].token = token;
                    newState.auth.currentUser = newState.data.users[uIdx];
                }
                newState.auth.role = role;
                saveAuthToken(token);
                newState.ui.notification = { type: "SUCCESS", message: "Přihlášení proběhlo úspěšně." };
                newState.ui.currentRoute = role === "ADMIN" ? "admin" : "dashboard";
            }

            if (status === "REJECTED") {
                newState.ui.notification = { type: "WARNING", message: reason };
            }

            if (status === "ERROR") {
                newState.ui.notification = { type: "WARNING", message: reason };
            }
            break;
        }

        case "REGISTER_START": {
            newState.ui.loading = true;
            // db.users je reference na newState.data.users.
            // authApi.register přidá nového uživatele přímo do tohoto pole.
            // Po setState(newState) bude nový uživatel součástí appState.data.users.
            const authApi = createAuthApi({ users: newState.data.users });
            authApi.register({ email: action.payload.email, password: action.payload.password })
                .then(result => dispatchAction({ type: "REGISTER_RESULT", payload: result }))
                .catch(e => dispatchAction({ type: "REGISTER_RESULT", payload: { status: "ERROR", reason: e.message } }));
            break;
        }

        case "REGISTER_RESULT": {
            newState.ui.loading = false;
            const { status, reason } = action.payload;

            if (status === "SUCCESS") {
                // Nový uživatel je již v appState.data.users (přidán přes db.users reference
                // v createAuthApi.register) – stačí nastavit notifikaci a přepnout na login.
                newState.ui.notification = {
                    type: "SUCCESS",
                    message: "Registrace proběhla úspěšně. Nyní se přihlaste.",
                };
                newState.ui.currentRoute = "login";
            }

            if (status === "REJECTED" || status === "ERROR") {
                newState.ui.notification = { type: "WARNING", message: reason };
            }
            break;
        }

        case "LOGOUT": {
            if (newState.auth.currentUser) {
                const uIdx = newState.data.users.findIndex(u => u.id === newState.auth.currentUser.id);
                if (uIdx > -1) newState.data.users[uIdx].token = null;
            }
            const token = getAuthToken();
            const authApi = createAuthApi({ users: newState.data.users });
            authApi.logout(token);

            // Odhlásíme okamžitě na UI straně bez čekání na odpověď API
            newState.auth.currentUser = null;
            newState.auth.role = "GUEST";
            clearAuthToken();
            newState.ui.notification = { type: "SUCCESS", message: "Odhlášení proběhlo úspěšně." };
            newState.ui.currentRoute = "login";
            break;
        }

        // Smazání notifikace po skončení CSS animace (animationend listener v renderApp)
        case "CLEAR_NOTIFICATION": {
            newState.ui.notification = null;
            break;
        }

        // -------------------------------------------------------
        // Rezervace (Odpovědnost: Adam Diblík)
        // -------------------------------------------------------

        case "RESERVE_START": {
            const reservingUserData = newState.data.users.find(u => u.id === newState.auth.currentUser.id);
            if (reservingUserData?.status === "SUSPENDED") {
                newState.ui.error = "Účet pozastaven. Nelze provést rezervaci.";
                break;
            }
            if (!action.payload.from || !action.payload.to) {
                newState.ui.error = "Vyplňte termín Od a Do.";
                break;
            }
            if (action.payload.from < today()) {
                newState.ui.error = "Datum Od nesmí být v minulosti.";
                break;
            }
            if (action.payload.from >= action.payload.to) {
                newState.ui.error = "Neplatný termín. Datum Od musí být dříve než Do.";
                break;
            }
            if (hasReservationConflict(newState.data.reservations, action.payload.itemId, action.payload.from, action.payload.to)) {
                newState.ui.error = "Předmět je v tomto termínu již rezervován.";
                break;
            }
            newState.ui.loading = true;
            fetchReserveItem(action.payload.itemId)
                .then(() => dispatchAction({ type: "RESERVE_SUCCESS", payload: action.payload }))
                .catch(e => dispatchAction({ type: "RESERVE_ERROR", payload: e.message }));
            break;
        }

        case "RESERVE_ERROR":
            newState.ui.loading = false;
            newState.ui.error = action.payload;
            break;

        case "RESERVE_SUCCESS": {
            newState.ui.loading = false;
            const p = typeof action.payload === "string"
                ? { itemId: action.payload, from: null, to: null }
                : action.payload;
            const itmIdx = newState.data.items.findIndex(i => i.id === p.itemId);
            if (itmIdx > -1) newState.data.items[itmIdx] = transitionItemState(newState.data.items[itmIdx], "RESERVE");
            newState.data.reservations.push({
                id: "res-" + Date.now(),
                itemId: p.itemId,
                userId: newState.auth.currentUser.id,
                status: "PENDING",
                requestedFrom: p.from,
                requestedTo: p.to
            });
            break;
        }

        case "UPDATE_TERM_START": {
            const resIdx = newState.data.reservations.findIndex(r => r.id === action.payload.resId);
            if (resIdx === -1) break;
            const res = newState.data.reservations[resIdx];
            if (res.status !== "PENDING" && res.status !== "CONFIRMED") {
                newState.ui.error = "Termín lze změnit jen u čekající nebo potvrzené rezervace.";
                break;
            }
            if (!action.payload.newFrom || !action.payload.newTo) { newState.ui.error = "Vyplňte termín Od a Do."; break; }
            if (action.payload.newFrom < today()) { newState.ui.error = "Datum Od nesmí být v minulosti."; break; }
            if (action.payload.newFrom >= action.payload.newTo) { newState.ui.error = "Neplatný termín."; break; }
            if (hasReservationConflict(newState.data.reservations, res.itemId, action.payload.newFrom, action.payload.newTo, res.id)) {
                newState.ui.error = "Předmět je v tomto termínu již rezervován.";
                break;
            }
            newState.data.reservations[resIdx] = transitionReservationState(
                { ...res, requestedFrom: action.payload.newFrom, requestedTo: action.payload.newTo },
                "UPDATE_TERM"
            );
            break;
        }

        case "CANCEL_RESERVATION": {
            const resIdx = newState.data.reservations.findIndex(r => r.id === action.payload.resId);
            if (resIdx > -1) {
                newState.data.reservations[resIdx] = transitionReservationState(newState.data.reservations[resIdx], "CANCEL");
                const iIdx = newState.data.items.findIndex(i => i.id === action.payload.itemId);
                if (iIdx > -1) newState.data.items[iIdx] = transitionItemState(newState.data.items[iIdx], "CANCEL_RESERVE");
            }
            break;
        }

        case "CONFIRM_RESERVATION": {
            const rcIdx = newState.data.reservations.findIndex(r => r.id === action.payload);
            if (rcIdx > -1) newState.data.reservations[rcIdx] = transitionReservationState(newState.data.reservations[rcIdx], "CONFIRM");
            break;
        }

        case "FULFILL_RESERVATION": {
            const rfIdx = newState.data.reservations.findIndex(r => r.id === action.payload.id);
            if (rfIdx > -1) {
                const res = newState.data.reservations[rfIdx];
                newState.data.reservations[rfIdx] = transitionReservationState(res, "FULFILL");
                const itIdx = newState.data.items.findIndex(i => i.id === res.itemId);
                if (itIdx > -1) newState.data.items[itIdx] = transitionItemState(newState.data.items[itIdx], "FULFILL");
                // DRAFT_LOAN je záměrně vynechán – vydání probíhá okamžitě na pobočce.
                newState.data.loans.push({
                    id: "loan-" + Date.now(),
                    userId: res.userId,
                    itemId: res.itemId,
                    status: "ACTIVE",
                    startDate: today(),
                    dueDate: res.requestedTo || null,
                    returnDate: null,
                    penaltyAmount: 0
                });
            }
            break;
        }

        case "EXPIRE_RESERVATION": {
            const exIdx = newState.data.reservations.findIndex(r => r.id === action.payload);
            if (exIdx > -1) {
                const res = newState.data.reservations[exIdx];
                newState.data.reservations[exIdx] = transitionReservationState(res, "EXPIRE");
                const itemIdx = newState.data.items.findIndex(i => i.id === res.itemId);
                if (itemIdx > -1) newState.data.items[itemIdx] = transitionItemState(newState.data.items[itemIdx], "CANCEL_RESERVE");
            }
            break;
        }

        case "MANAGE_USER": {
            const uIdx = newState.data.users.findIndex(u => u.id === action.payload.userId);
            if (uIdx > -1) newState.data.users[uIdx] = transitionUserState(newState.data.users[uIdx], action.payload.transition);
            break;
        }

        case "RETURN_ITEM": {
            const lIdx = newState.data.loans.findIndex(l => l.id === action.payload.loanId);
            if (lIdx > -1) {
                const loan = newState.data.loans[lIdx];
                const type = action.payload.isDamaged ? "RETURN_DAMAGED" : "RETURN_OK";
                newState.data.loans[lIdx] = transitionLoanState(loan, type);
                newState.data.loans[lIdx].returnDate = today();
                const itemIdx = newState.data.items.findIndex(i => i.id === loan.itemId);
                if (itemIdx > -1) newState.data.items[itemIdx] = transitionItemState(newState.data.items[itemIdx], type);
                if (action.payload.isDamaged) {
                    const uIdx = newState.data.users.findIndex(u => u.id === loan.userId);
                    if (uIdx > -1) newState.data.users[uIdx] = transitionUserState(newState.data.users[uIdx], "SUSPEND");
                }
            }
            break;
        }

        case "REPORT_LOSS": {
            const lIdx = newState.data.loans.findIndex(l => l.id === action.payload.loanId);
            if (lIdx > -1) newState.data.loans[lIdx] = transitionLoanState(newState.data.loans[lIdx], "NOT_RETURNED");
            break;
        }

        case "MANAGE_ITEM": {
            const mIdx = newState.data.items.findIndex(i => i.id === action.payload.id);
            if (mIdx > -1) newState.data.items[mIdx] = transitionItemState(newState.data.items[mIdx], action.payload.task);
            break;
        }

        // Systémová kontrola při startu aplikace (náhrada za backend scheduler).
        // ACTIVE výpůjčky po termínu → OVERDUE
        // CONFIRMED/PENDING rezervace po termínu → EXPIRED + předmět AVAILABLE
        case "SYSTEM_CHECK": {
            const nowDate = today();
            newState.data.loans.forEach((loan, i) => {
                if (loan.status === "ACTIVE" && loan.dueDate && loan.dueDate < nowDate) {
                    newState.data.loans[i] = transitionLoanState(loan, "MARK_OVERDUE");
                }
            });
            newState.data.reservations.forEach((res, i) => {
                if ((res.status === "CONFIRMED" || res.status === "PENDING") && res.requestedTo && res.requestedTo < nowDate) {
                    newState.data.reservations[i] = transitionReservationState(res, "EXPIRE");
                    const itemIdx = newState.data.items.findIndex(it => it.id === res.itemId);
                    if (itemIdx > -1) newState.data.items[itemIdx] = transitionItemState(newState.data.items[itemIdx], "CANCEL_RESERVE");
                }
            });
            break;
        }
    }

    setState(newState);
    listeners.forEach(fn => fn(appState));
}