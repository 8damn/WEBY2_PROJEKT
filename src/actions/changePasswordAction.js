export async function changePasswordAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;
    
    setState({ ...state, ui: { ...state.ui, loading: true, error: null } });

    const result = await api.changePassword({ token, newPassword: payload.newPassword });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({
            ...freshState,
            ui: { ...freshState.ui, loading: false, error: null, notification: { type: "SUCCESS", message: "Heslo úspěšně změněno." } }
        });
    } else {
        setState({
            ...freshState,
            ui: { ...freshState.ui, loading: false, error: result.reason, notification: { type: "WARNING", message: "Chyba: " + result.reason } }
        });
    }
}
