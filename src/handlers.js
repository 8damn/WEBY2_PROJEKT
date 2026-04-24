// src/handlers.js
import { dispatchAction } from './dispatch.js';

export const onLogin = (e) => { 
    e.preventDefault(); 
    dispatchAction({ type: "LOGIN_START", payload: { email: e.target.elements.email.value } }); 
};
export const onLogout = () => dispatchAction({ type: "LOGOUT" });
export const onReserve = (itemId) => {
    const from = document.getElementById(`from-${itemId}`)?.value || "";
    const to = document.getElementById(`to-${itemId}`)?.value || "";
    dispatchAction({ type: "RESERVE_START", payload: { itemId, from, to } });
};

// --- HANDLERY ZÁKAZNÍKA ---
export const onCancelRes = (resId, itemId) => dispatchAction({ type: "CANCEL_RESERVATION", payload: { resId, itemId } });
export const onChangeReservationTerm = (resId) => {
    const from = document.getElementById(`edit-from-${resId}`)?.value ?? "";
    const to = document.getElementById(`edit-to-${resId}`)?.value ?? "";
    dispatchAction({ type: "UPDATE_TERM_START", payload: { resId, newFrom: from, newTo: to } });
};
// Zákazník nahlásí ztrátu nebo odcizení svého zapůjčeného předmětu.
export const onReportLoss = (loanId) => dispatchAction({ type: "REPORT_LOSS", payload: { loanId } });

// --- HANDLERY SPRÁVCE ---
export const onConfirmRes = (id) => dispatchAction({ type: "CONFIRM_RESERVATION", payload: id });
export const onFulfillRes = (res) => dispatchAction({ type: "FULFILL_RESERVATION", payload: res });
export const onReturn = (loanId, isDamaged) => dispatchAction({ type: "RETURN_ITEM", payload: { loanId, isDamaged } });
export const onFix = (id) => dispatchAction({ type: "MANAGE_ITEM", payload: { id, task: "FIX" } });
export const onExpireReservation = (resId) => dispatchAction({ type: "EXPIRE_RESERVATION", payload: resId });
export const onManageUser = (userId, transition) => dispatchAction({ type: "MANAGE_USER", payload: { userId, transition } });