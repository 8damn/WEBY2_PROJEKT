// src/router.js
import { dispatchAction } from './dispatch.js';
import { appState } from './state.js';

// Inicializace routeru - spustí se jen jednou při načtení aplikace v main.js
export function initRouter() {
    // Poslouchá změny v URL adrese
    window.addEventListener("hashchange", handleHashChange);
    // Zpracuje aktuální URL hned po načtení stránky
    handleHashChange();
}

function handleHashChange() {
    let hash = window.location.hash.replace("#", "") || "login";
    
    // Jednoduchý Route Guard: pokud se někdo snaží jít na dashboard a není přihlášen, vyhodíme ho na login
    if (hash === "dashboard" && appState.auth.currentUser === null) {
        window.location.hash = "#login";
        return;
    }

    // URL překlopíme na akci a pošleme do Dispatcheru
    dispatchAction({ type: "NAVIGATE", payload: hash });
}