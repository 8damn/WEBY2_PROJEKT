export async function createItemAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;
    
    setState({ ...state, ui: { ...state.ui, loading: true, error: null } });

    const result = await api.createItem({ token, name: payload.name });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({
            ...freshState,
            data: { ...freshState.data, items: result.data.items },
            ui: { ...freshState.ui, loading: false, error: null, notification: { type: "SUCCESS", message: "Předmět úspěšně vytvořen." } }
        });
    } else {
        setState({
            ...freshState,
            ui: { ...freshState.ui, loading: false, error: result.reason, notification: { type: "WARNING", message: "Chyba: " + result.reason } }
        });
    }
}
