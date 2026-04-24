// admin vydani predmetu a vytvoreni loan
export async function fulfillReservationAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;

    const result = await api.fulfillReservation({ token, resId: payload.id });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({
            ...freshState,
            data: { ...freshState.data, items: result.data.items, reservations: result.data.reservations, loans: result.data.loans }
        });
    }
}
