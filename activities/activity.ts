import { Classroom } from "../classrooms";

export interface Activity {
    id: string;
    name: string;
    description: string;
    content: string;
    wallets: { username: string, pubKey: string, prvKey: string }[];
    grades: { username: string, grade: number }[];
    status: { username: string, status: "NoStarted" | "InProgress" | "Done" }[];
    classrooms: Classroom[];
    metaData: any
}