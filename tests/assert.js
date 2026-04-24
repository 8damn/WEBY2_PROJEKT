export function assert(condition, message) {
    if (!condition) {
        console.error("FAIL:", message);
    } else {
        console.log("PASS:", message);
    }
}
