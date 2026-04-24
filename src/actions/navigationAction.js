// navigacni akce - synchronni zmena currentRoute
export function enterLoginAction({ getState, setState }) {
    const state = getState();
    const newState = JSON.parse(JSON.stringify(state));
    if (newState.auth.currentUser) {
        newState.ui.currentRoute = newState.auth.role === "ADMIN" ? "admin" : "dashboard";
    } else {
        newState.ui.currentRoute = "login";
    }
    setState(newState);
}

export function enterDashboardAction({ getState, setState }) {
    const state = getState();
    const newState = JSON.parse(JSON.stringify(state));
    if (!newState.auth.currentUser) {
        newState.ui.currentRoute = "login";
    } else if (newState.auth.role === "ADMIN") {
        newState.ui.currentRoute = "admin";
    } else {
        newState.ui.currentRoute = "dashboard";
    }
    setState(newState);
}

export function enterAdminAction({ getState, setState }) {
    const state = getState();
    const newState = JSON.parse(JSON.stringify(state));
    if (!newState.auth.currentUser) {
        newState.ui.currentRoute = "login";
    } else if (newState.auth.role !== "ADMIN") {
        newState.ui.currentRoute = "dashboard";
    } else {
        newState.ui.currentRoute = "admin";
    }
    setState(newState);
}
