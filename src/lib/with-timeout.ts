// Corrida entre uma promessa e um timeout; rejeita se o tempo estourar antes
// de a promessa assentar. Usado pelo gate de consentimento para transformar
// uma RPC pendurada em uma falha explícita (fail-closed) em vez de um estado
// de verificação eterno.
export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("guardian_consent_timeout")), ms);
        Promise.resolve(promise).then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            },
        );
    });
}
