// src/dispatch.js
import { appState, setState, transitionItemState, transitionLoanState, transitionReservationState, transitionUserState } from './state.js';
import { fetchLogin, fetchReserveItem } from './asyncApi.js';
import { saveAuthToken, clearAuthToken } from './auth.js';

const listeners = [];
export function subscribe(fn) { listeners.push(fn); }

// Rezervace blokuje kalendář pouze pokud ještě nebyla vyřízena ani nevypršela.
// FULFILLED je záměrně vyloučeno — vyzvednutá rezervace už předmět neblokuje.
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

export function dispatchAction(action) {
    let newState = JSON.parse(JSON.stringify(appState));
    newState.ui.error = null;

    switch (action.type) {
        case "NAVIGATE": 
            newState.ui.currentRoute = action.payload; 
            break;
            
        case "LOGIN_START":
            newState.ui.loading = true;
            fetchLogin(action.payload.email)
                .then(u => dispatchAction({ type: "LOGIN_SUCCESS", payload: u }))
                .catch(e => dispatchAction({ type: "LOGIN_ERROR", payload: e.message }));
            break;
            
        case "LOGIN_SUCCESS":
            newState.ui.loading = false;
            const dbUser = newState.data.users.find(u => u.id === action.payload.id);
            if (dbUser?.status === "BLOCKED") { newState.ui.error = "Účet zablokován."; break; }
            newState.auth.currentUser = dbUser || action.payload;
            newState.auth.role = newState.auth.currentUser.role;
            saveAuthToken(newState.auth.currentUser.id);
            window.location.hash = "#dashboard";
            break;
            
        case "LOGIN_ERROR": 
            newState.ui.loading = false; 
            newState.ui.error = action.payload; 
            break;
            
        case "LOGOUT": 
            newState.auth.currentUser = null;
            newState.auth.role = "GUEST";
            clearAuthToken(); 
            window.location.hash = "#login"; 
            break;

        case "RESERVE_START": {
            // Business pravidlo: SUSPENDED uživatel nesmí tvořit rezervace.
            const reservingUserId = newState.auth.currentUser.id;
            const reservingUserData = newState.data.users.find(u => u.id === reservingUserId);
            if (reservingUserData?.status === "SUSPENDED") {
                newState.ui.error = "Účet pozastaven. Nelze provést rezervaci.";
                break;
            }
            if (!action.payload.from || !action.payload.to) {
                newState.ui.error = "Vyplňte termín Od a Do.";
                break;
            }
            // Validace: datum Od nesmí být v minulosti
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
            const reservePayload = typeof action.payload === "string"
                ? { itemId: action.payload, from: null, to: null }
                : action.payload;
            const itmIdx = newState.data.items.findIndex(i => i.id === reservePayload.itemId);
            if (itmIdx > -1) newState.data.items[itmIdx] = transitionItemState(newState.data.items[itmIdx], "RESERVE");
            newState.data.reservations.push({ 
                id: "res-" + Date.now(), 
                itemId: reservePayload.itemId, 
                userId: newState.auth.currentUser.id, 
                status: "PENDING",
                requestedFrom: reservePayload.from,
                requestedTo: reservePayload.to
            });
            break;
        }

        case "UPDATE_TERM_START": {
            const reservationIdx = newState.data.reservations.findIndex(r => r.id === action.payload.resId);
            if (reservationIdx === -1) break;

            const reservation = newState.data.reservations[reservationIdx];
            if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
                newState.ui.error = "Termín lze změnit jen u čekající nebo potvrzené rezervace.";
                break;
            }
            if (!action.payload.newFrom || !action.payload.newTo) {
                newState.ui.error = "Vyplňte termín Od a Do.";
                break;
            }
            // Validace: datum Od nesmí být v minulosti
            if (action.payload.newFrom < today()) {
                newState.ui.error = "Datum Od nesmí být v minulosti.";
                break;
            }
            if (action.payload.newFrom >= action.payload.newTo) {
                newState.ui.error = "Neplatný termín. Datum Od musí být dříve než Do.";
                break;
            }
            if (hasReservationConflict(newState.data.reservations, reservation.itemId, action.payload.newFrom, action.payload.newTo, reservation.id)) {
                newState.ui.error = "Předmět je v tomto termínu již rezervován.";
                break;
            }

            const updatedReservation = {
                ...reservation,
                requestedFrom: action.payload.newFrom,
                requestedTo: action.payload.newTo
            };
            newState.data.reservations[reservationIdx] = transitionReservationState(updatedReservation, "UPDATE_TERM");
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
                // dueDate se přebírá z termínu rezervace — zákazník si sám zvolil, do kdy věc vrátí.
                // Poznámka: DRAFT_LOAN mezistav je záměrně vynechán — vydání na pobočce
                // probíhá okamžitě, správce nemusí výpůjčku nejprve připravovat.
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
                if (itemIdx > -1) {
                    newState.data.items[itemIdx] = transitionItemState(newState.data.items[itemIdx], "CANCEL_RESERVE");
                }
            }
            break;
        }

        case "MANAGE_USER": {
            const uIdx = newState.data.users.findIndex(u => u.id === action.payload.userId);
            if (uIdx > -1) {
                newState.data.users[uIdx] = transitionUserState(newState.data.users[uIdx], action.payload.transition);
            }
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
                
                // Business pravidlo: poškozené vrácení → zákazník dostane SUSPENDED
                if (action.payload.isDamaged) {
                    const uIdx = newState.data.users.findIndex(u => u.id === loan.userId);
                    if (uIdx > -1) newState.data.users[uIdx] = transitionUserState(newState.data.users[uIdx], "SUSPEND");
                }
            }
            break;
        }

        // Zákazník nahlásí ztrátu nebo odcizení svého zapůjčeného předmětu.
        case "REPORT_LOSS": {
            const lIdx = newState.data.loans.findIndex(l => l.id === action.payload.loanId);
            if (lIdx > -1) {
                newState.data.loans[lIdx] = transitionLoanState(newState.data.loans[lIdx], "NOT_RETURNED");
            }
            break;
        }

        case "MANAGE_ITEM": {
            const mIdx = newState.data.items.findIndex(i => i.id === action.payload.id);
            if (mIdx > -1) newState.data.items[mIdx] = transitionItemState(newState.data.items[mIdx], action.payload.task);
            break;
        }

        // Systémová kontrola spouštěná při startu aplikace.
        // Projde všechny záznamy a provede časově podmíněné přechody stavů:
        //   - Výpůjčky po termínu (ACTIVE + dueDate < dnes) → OVERDUE
        //   - Rezervace po termínu vyzvednutí (CONFIRMED + requestedTo < dnes) → EXPIRED + předmět AVAILABLE
        // Nahrazuje chybějící backend scheduler — jde o best-effort aproximaci.
        case "SYSTEM_CHECK": {
            const nowDate = today();

            newState.data.loans.forEach((loan, i) => {
                if (loan.status === "ACTIVE" && loan.dueDate && loan.dueDate < nowDate) {
                    newState.data.loans[i] = transitionLoanState(loan, "MARK_OVERDUE");
                }
            });

            newState.data.reservations.forEach((res, i) => {
                if ((res.status === "CONFIRMED" || res.status === "PENDING")
                        && res.requestedTo && res.requestedTo < nowDate) {
                    newState.data.reservations[i] = transitionReservationState(res, "EXPIRE");
                    const itemIdx = newState.data.items.findIndex(it => it.id === res.itemId);
                    if (itemIdx > -1) {
                        newState.data.items[itemIdx] = transitionItemState(newState.data.items[itemIdx], "CANCEL_RESERVE");
                    }
                }
            });
            break;
        }
    }
    
    setState(newState);
    listeners.forEach(fn => fn());
}