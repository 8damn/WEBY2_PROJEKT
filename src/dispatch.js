// autor: Martin Teply (IR02)
// centralni dispatcher - rozcestnik ktery deleguje na jednotlive akce
import { appState, setState } from './state.js';
import { createApi } from './asyncApi.js';

import { enterLoginAction, enterDashboardAction, enterAdminAction } from './actions/navigationAction.js';
import { loginAction } from './actions/loginAction.js';
import { registerAction } from './actions/registerAction.js';
import { logoutAction } from './actions/logoutAction.js';
import { reserveAction } from './actions/reserveAction.js';
import { updateTermAction } from './actions/updateTermAction.js';
import { cancelReservationAction } from './actions/cancelReservationAction.js';
import { confirmReservationAction } from './actions/confirmReservationAction.js';
import { fulfillReservationAction } from './actions/fulfillReservationAction.js';
import { expireReservationAction } from './actions/expireReservationAction.js';
import { returnItemAction } from './actions/returnItemAction.js';
import { reportLossAction } from './actions/reportLossAction.js';
import { manageItemAction } from './actions/manageItemAction.js';
import { manageUserAction } from './actions/manageUserAction.js';
import { systemCheckAction } from './actions/systemCheckAction.js';

const listeners = [];
export function subscribe(fn) { listeners.push(fn); }

// mapovani typu akce na handler
const actionMap = {
    ENTER_LOGIN: enterLoginAction,
    ENTER_DASHBOARD: enterDashboardAction,
    ENTER_ADMIN: enterAdminAction,
    LOGIN_START: loginAction,
    REGISTER_START: registerAction,
    LOGOUT: logoutAction,
    RESERVE_START: reserveAction,
    UPDATE_TERM_START: updateTermAction,
    CANCEL_RESERVATION: cancelReservationAction,
    CONFIRM_RESERVATION: confirmReservationAction,
    FULFILL_RESERVATION: fulfillReservationAction,
    EXPIRE_RESERVATION: expireReservationAction,
    RETURN_ITEM: returnItemAction,
    REPORT_LOSS: reportLossAction,
    MANAGE_ITEM: manageItemAction,
    MANAGE_USER: manageUserAction,
    SYSTEM_CHECK: systemCheckAction,
};

// store objekt pro akce
function createStore() {
    return {
        getState: () => appState,
        setState: (newState) => {
            setState(newState);
            listeners.forEach(fn => fn(appState));
        },
    };
}

// hlavni dispatch funkce - uz jen deleguje na spravnou akci
export function dispatchAction(action) {
    const handler = actionMap[action.type];
    if (!handler) return;

    // clear notification akce (jedina inline - je trivialni)
    if (action.type === "CLEAR_NOTIFICATION") {
        const newState = JSON.parse(JSON.stringify(appState));
        newState.ui.notification = null;
        setState(newState);
        listeners.forEach(fn => fn(appState));
        return;
    }

    const store = createStore();
    const api = createApi(appState.data);
    handler({ ...store, api, payload: action.payload });
}