// systemova kontrola - overdue a expirace
export function systemCheckAction({ getState, setState, api }) {
    const result = api.systemCheck();
    const freshState = getState();

    if (result.status === "SUCCESS") {
        setState({
            ...freshState,
            data: { ...freshState.data, items: result.data.items, loans: result.data.loans, reservations: result.data.reservations }
        });
    }
}
