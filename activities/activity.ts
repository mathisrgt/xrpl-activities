import { Classroom } from "../classrooms";

export interface Activity {
    id: string;
    name: string;
    description: string;
    content: string;
    wallets: { username: string, pubKey: string, prvKey: string, classicAddress: string, seed: string | undefined }[];
    grades: { username: string, grade: number }[];
    status: { username: string, status: "NoStarted" | "InProgress" | "Done", txHash?: string }[];
    classrooms: Classroom[];
    metaData: any
}