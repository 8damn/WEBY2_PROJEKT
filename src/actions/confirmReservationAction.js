// admin potvrzeni rezervace
export async function confirmReservationAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;

    const result = await api.confirmReservation({ token, resId: payload });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({ ...freshState, data: { ...freshState.data, reservations: result.data.reservations } });
    }
}
