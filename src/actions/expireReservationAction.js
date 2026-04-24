// admin expirace rezervace
export async function expireReservationAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;

    const result = await api.expireReservation({ token, resId: payload });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({ ...freshState, data: { ...freshState.data, items: result.data.items, reservations: result.data.reservations } });
    }
}
