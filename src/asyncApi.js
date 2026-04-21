// src/asyncApi.js

// Simulace přihlášení na server
export function fetchLogin(email) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Jednoduchá simulace: pokud je to admin@test.cz, vrátíme admina, jinak zákazníka
            if (email === "admin@test.cz") {
                resolve({ id: "u999", email: email, role: "ADMIN", status: "VERIFIED" });
            } else if (email.includes("@")) {
                resolve({ id: "u123", email: email, role: "CUSTOMER", status: "VERIFIED" });
            } else {
                reject(new Error("Neplatný e-mail pro přihlášení. Musí obsahovat zavináč."));
            }
        }, 800); // 800ms simulované zpoždění sítě
    });
}

// Simulace požadavku na rezervaci předmětu
export function fetchReserveItem(itemId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulujeme, že server požadavek úspěšně přijal
            resolve({ success: true, itemId: itemId });
        }, 500);
    });
}