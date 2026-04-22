// src/dispatch.js
import { appState, setState, transitionItemState, transitionLoanState, transitionReservationState, transitionUserState } from './state.js';
import { fetchLogin, fetchReserveItem } from './asyncApi.js';
import { saveAuthToken, clearAuthToken } from './auth.js';

const listeners = [];
export function subscribe(fn) { listeners.push(fn); }

function isReservationActive(reservation) {
    return reservation.status !== "CANCELLED" && reservation.status !== "EXPIRED";
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

        case "RESERVE_START":
            // Business pravidlo: SUSPENDED uživatel nesmí tvořit rezervace.
            // Status uživatele je autoritativně uložen v data.users, nikoli v auth.currentUser.
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

        // Dříve chybějící případ – bez něj nebylo možné zpracovat chybu z fetchReserveItem
        case "RESERVE_ERROR":
            newState.ui.loading = false;
            newState.ui.error = action.payload;
            break;
            
        case "RESERVE_SUCCESS":
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

        case "CANCEL_RESERVATION":
            const resIdx = newState.data.reservations.findIndex(r => r.id === action.payload.resId);
            if (resIdx > -1) {
                newState.data.reservations[resIdx] = transitionReservationState(newState.data.reservations[resIdx], "CANCEL");
                const iIdx = newState.data.items.findIndex(i => i.id === action.payload.itemId);
                if (iIdx > -1) newState.data.items[iIdx] = transitionItemState(newState.data.items[iIdx], "CANCEL_RESERVE");
            }
            break;

        case "CONFIRM_RESERVATION":
            const rcIdx = newState.data.reservations.findIndex(r => r.id === action.payload);
            if (rcIdx > -1) newState.data.reservations[rcIdx] = transitionReservationState(newState.data.reservations[rcIdx], "CONFIRM");
            break;

        case "FULFILL_RESERVATION":
            const rfIdx = newState.data.reservations.findIndex(r => r.id === action.payload.id);
            if (rfIdx > -1) {
                const res = newState.data.reservations[rfIdx];
                newState.data.reservations[rfIdx] = transitionReservationState(res, "FULFILL");
                const itIdx = newState.data.items.findIndex(i => i.id === res.itemId);
                if (itIdx > -1) newState.data.items[itIdx] = transitionItemState(newState.data.items[itIdx], "FULFILL");
                // Výpůjčka vzniká přímou aktivací (bez DRAFT_LOAN mezistavu, protože vydání probíhá na pobočce ihned)
                newState.data.loans.push({ 
                    id: "loan-" + Date.now(), 
                    userId: res.userId, 
                    itemId: res.itemId, 
                    status: "ACTIVE",
                    startDate: new Date().toISOString().split("T")[0],
                    dueDate: null,
                    returnDate: null,
                    penaltyAmount: 0
                });
            }
            break;

        case "EXPIRE_RESERVATION": {
            const exIdx = newState.data.reservations.findIndex(r => r.id === action.payload);
            if (exIdx > -1) {
                const res = newState.data.reservations[exIdx];
                // 1. Změní stav rezervace na EXPIRED
                newState.data.reservations[exIdx] = transitionReservationState(res, "EXPIRE");
                
                // 2. Uvolní předmět zpět zákazníkům (vrátí ho z RESERVED do AVAILABLE)
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
                // Provede přechod (VERIFY nebo BLOCK) podle payloadu
                newState.data.users[uIdx] = transitionUserState(newState.data.users[uIdx], action.payload.transition);
            }
            break;
        }

        case "RETURN_ITEM":
            const lIdx = newState.data.loans.findIndex(l => l.id === action.payload.loanId);
            if (lIdx > -1) {
                const loan = newState.data.loans[lIdx];
                const type = action.payload.isDamaged ? "RETURN_DAMAGED" : "RETURN_OK";
                newState.data.loans[lIdx] = transitionLoanState(loan, type);
                newState.data.loans[lIdx].returnDate = new Date().toISOString().split("T")[0];
                
                const itemIdx = newState.data.items.findIndex(i => i.id === loan.itemId);
                if (itemIdx > -1) newState.data.items[itemIdx] = transitionItemState(newState.data.items[itemIdx], type);
                
                // Business pravidlo: poškozené vrácení → zákazník dostane SUSPENDED
                if (action.payload.isDamaged) {
                    const uIdx = newState.data.users.findIndex(u => u.id === loan.userId);
                    if (uIdx > -1) newState.data.users[uIdx] = transitionUserState(newState.data.users[uIdx], "SUSPEND");
                }
            }
            break;

        case "MANAGE_ITEM":
            const mIdx = newState.data.items.findIndex(i => i.id === action.payload.id);
            if (mIdx > -1) newState.data.items[mIdx] = transitionItemState(newState.data.items[mIdx], action.payload.task);
            break;
    }
    
    setState(newState);
    listeners.forEach(fn => fn());
}