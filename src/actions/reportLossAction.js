// nahlaseni ztraty
export async function reportLossAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;

    const result = await api.reportLoss({ token, loanId: payload.loanId });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({ ...freshState, data: { ...freshState.data, loans: result.data.loans } });
    }
}
