// registrace noveho uzivatele
export async function registerAction({ getState, setState, api, payload }) {
    const state = getState();
    setState({ ...state, ui: { ...state.ui, loading: true, error: null } });

    try {
        const result = await api.register({ email: payload.email, password: payload.password });
        const freshState = getState();

        if (result.status === "SUCCESS") {
            setState({
                ...freshState,
                ui: {
                    ...freshState.ui, loading: false, currentRoute: "login",
                    notification: { type: "SUCCESS", message: "Registrace proběhla úspěšně. Nyní se přihlaste." }
                }
            });
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
