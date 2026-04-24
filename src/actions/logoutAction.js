// odhlaseni uzivatele
import { clearAuthToken } from '../auth.js';

export async function logoutAction({ getState, setState, api }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;

    await api.logout(token);

    const freshState = getState();
    const newState = JSON.parse(JSON.stringify(freshState));
    newState.auth.currentUser = null;
    newState.auth.role = "GUEST";
    clearAuthToken();
    newState.ui.notification = { type: "SUCCESS", message: "Odhlášení proběhlo úspěšně." };
    newState.ui.currentRoute = "login";
    setState(newState);
}
