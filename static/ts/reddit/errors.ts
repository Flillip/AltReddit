export class NoToken extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class NotInitialized extends Error {
    constructor(message: string) {
        super(message);
    }
}