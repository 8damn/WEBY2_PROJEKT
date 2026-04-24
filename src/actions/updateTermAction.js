// zmena terminu rezervace
export async function updateTermAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;
    setState({ ...state, ui: { ...state.ui, error: null } });

    try {
        const result = await api.updateReservationTerm({ token, resId: payload.resId, newFrom: payload.newFrom, newTo: payload.newTo });
        const freshState = getState();

        if (result.status === "SUCCESS") {
            setState({ ...freshState, data: { ...freshState.data, reservations: result.data.reservations } });
        } else {
            setState({ ...freshState, ui: { ...freshState.ui, error: result.reason } });
        }
    } catch (e) {
        const s = getState();
        setState({ ...s, ui: { ...s.ui, error: e.message } });
    }
}
