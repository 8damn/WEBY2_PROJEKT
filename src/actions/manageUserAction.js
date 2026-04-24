// sprava uzivatelu (overeni, blokovani)
export async function manageUserAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;

    const result = await api.manageUser({ token, userId: payload.userId, transition: payload.transition });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({ ...freshState, data: { ...freshState.data, users: result.data.users } });
    }
}
