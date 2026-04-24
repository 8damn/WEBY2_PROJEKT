// vraceni predmetu
export async function returnItemAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;

    const result = await api.returnItem({ token, loanId: payload.loanId, isDamaged: payload.isDamaged });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({
            ...freshState,
            data: { ...freshState.data, items: result.data.items, loans: result.data.loans, users: result.data.users }
        });
    }
}
