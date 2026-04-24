// login akce - zavola api a zpracuje odpoved
import { saveAuthToken } from '../auth.js';

export async function loginAction({ getState, setState, api, payload }) {
    const state = getState();
    setState({ ...state, ui: { ...state.ui, loading: true, error: null } });

    try {
        const result = await api.login({ email: payload.email, password: payload.password });
        const freshState = getState();

        if (result.status === "SUCCESS") {
            const newState = JSON.parse(JSON.stringify(freshState));
            const uIdx = newState.data.users.findIndex(u => u.id === result.userId);
            if (uIdx > -1) {
                newState.data.users[uIdx].token = result.token;
                newState.auth.currentUser = newState.data.users[uIdx];
            }
            newState.auth.role = result.role;
            saveAuthToken(result.token);
            newState.ui.loading = false;
            newState.ui.notification = { type: "SUCCESS", message: "Přihlášení proběhlo úspěšně." };
            newState.ui.currentRoute = result.role === "ADMIN" ? "admin" : "dashboard";
            setState(newState);
        } else {
            setState({
                ...freshState,
                ui: { ...freshState.ui, loading: false, notification: { type: "WARNING", message: result.reason } }
            });
        }
    } catch (e) {
        const s = getState();
        setState({ ...s, ui: { ...s.ui, loading: false, notification: { type: "WARNING", message: e.message } } });
    }
}
