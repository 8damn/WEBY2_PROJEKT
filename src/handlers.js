// src/handlers.js
// Odpovědnost: Max Jasinek (IR07 – Handlery a vazba UI → akce)
import { dispatchAction } from './dispatch.js';

// --- HANDLERY AUTENTIZACE (IR08, Adam Diblík) ---

export const onLogin = (e) => {
    e.preventDefault();
    dispatchAction({
        type: "LOGIN_START",
        payload: {
            email:    e.target.elements.email.value,
            password: e.target.elements.password.value,
        }
    });
};

export const onRegister = (e) => {
    e.preventDefault();
    dispatchAction({
        type: "REGISTER_START",
        payload: {
            email:    e.target.elements.regEmail.value,
            password: e.target.elements.regPassword.value,
        }
    });
};

export const onLogout = () => dispatchAction({ type: "LOGOUT" });

// --- HANDLERY ZÁKAZNÍKA ---

export const onReserve = (itemId) => {
    const from = document.getElementById(`from-${itemId}`)?.value || "";
    const to   = document.getElementById(`to-${itemId}`)?.value   || "";
    dispatchAction({ type: "RESERVE_START", payload: { itemId, from, to } });
};

export const onCancelRes = (resId, itemId) =>
    dispatchAction({ type: "CANCEL_RESERVATION", payload: { resId, itemId } });

export const onChangeReservationTerm = (resId) => {
    const from = document.getElementById(`edit-from-${resId}`)?.value ?? "";
    const to   = document.getElementById(`edit-to-${resId}`)?.value   ?? "";
    dispatchAction({ type: "UPDATE_TERM_START", payload: { resId, newFrom: from, newTo: to } });
};

export const onReportLoss = (loanId) =>
    dispatchAction({ type: "REPORT_LOSS", payload: { loanId } });

// --- HANDLERY SPRÁVCE ---

export const onConfirmRes      = (id)              => dispatchAction({ type: "CONFIRM_RESERVATION",  payload: id });
export const onFulfillRes      = (res)             => dispatchAction({ type: "FULFILL_RESERVATION",  payload: res });
export const onReturn          = (loanId, isDamaged) => dispatchAction({ type: "RETURN_ITEM",        payload: { loanId, isDamaged } });
export const onFix             = (id)              => dispatchAction({ type: "MANAGE_ITEM",          payload: { id, task: "FIX" } });
export const onRetire          = (id)              => dispatchAction({ type: "MANAGE_ITEM",          payload: { id, task: "RETIRE" } });
export const onExpireReservation = (resId)         => dispatchAction({ type: "EXPIRE_RESERVATION",   payload: resId });
export const onManageUser      = (userId, transition) => dispatchAction({ type: "MANAGE_USER",       payload: { userId, transition } });