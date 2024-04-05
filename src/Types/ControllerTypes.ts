export type EmitterEvents = {
    [key: string]: (...args: any[]) => void;
}