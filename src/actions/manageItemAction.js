// sprava predmetu (oprava, vyrazeni)
export async function manageItemAction({ getState, setState, api, payload }) {
    const state = getState();
    const token = state.auth.currentUser?.token || null;

    const result = await api.manageItem({ token, itemId: payload.id, task: payload.task });
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({ ...freshState, data: { ...freshState.data, items: result.data.items } });
    }
}
