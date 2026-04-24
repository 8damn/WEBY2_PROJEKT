// zruseni rezervace
export async function cancelReservationAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;

    const result = await api.cancelReservation({ token, resId: payload.resId, itemId: payload.itemId });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({ ...freshState, data: { ...freshState.data, items: result.data.items, reservations: result.data.reservations } });
    }
}
