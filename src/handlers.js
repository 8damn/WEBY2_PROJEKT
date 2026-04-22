// src/handlers.js
import { dispatchAction } from './dispatch.js';

export const onLogin = (e) => { 
    e.preventDefault(); 
    dispatchAction({ type: "LOGIN_START", payload: { email: e.target.elements.email.value } }); 
};
export const onLogout = () => dispatchAction({ type: "LOGOUT" });
export const onReserve = (itemId) => dispatchAction({ type: "RESERVE_START", payload: { itemId } });

// --- NOVÉ HANDLERY ---
export const onCancelRes = (resId, itemId) => dispatchAction({ type: "CANCEL_RESERVATION", payload: { resId, itemId } });
export const onConfirmRes = (id) => dispatchAction({ type: "CONFIRM_RESERVATION", payload: id });
export const onFulfillRes = (res) => dispatchAction({ type: "FULFILL_RESERVATION", payload: res });
export const onReturn = (loanId, isDamaged) => dispatchAction({ type: "RETURN_ITEM", payload: { loanId, isDamaged } });
export const onFix = (id) => dispatchAction({ type: "MANAGE_ITEM", payload: { id, task: "FIX" } });

// --- Expirace rezervace (Admin) ---
export const onExpireReservation = (resId) => dispatchAction({ type: "EXPIRE_RESERVATION", payload: resId });

// --- Správa uživatelů (Admin - Zablokování / Odblokování) ---
export const onManageUser = (userId, transition) => dispatchAction({ type: "MANAGE_USER", payload: { userId, transition } });