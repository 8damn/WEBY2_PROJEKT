// vytvoreni nove rezervace
export async function reserveAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;
    setState({ ...state, ui: { ...state.ui, loading: true, error: null } });

    try {
        const result = await api.reserveItem({ token, itemId: payload.itemId, from: payload.from, to: payload.to });
        const freshState = getState();

        if (result.status === "SUCCESS") {
            setState({
                ...freshState,
                ui: { ...freshState.ui, loading: false },
                data: { ...freshState.data, items: result.data.items, reservations: result.data.reservations }
            });
        } else {
            setState({ ...freshState, ui: { ...freshState.ui, loading: false, error: result.reason } });
        }
    } catch (e) {
        const s = getState();
        setState({ ...s, ui: { ...s.ui, loading: false, error: e.message } });
    }
}
