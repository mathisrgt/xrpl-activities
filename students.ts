import * as fs from 'fs';
import * as path from 'path';

export interface User {
    username: string;
    email: string;
    password: string;
    role: "student" | "teacher" | "admin";
}

const USERS_FILE = path.join(__dirname, 'users.json');
const students: User[] = [];

function randomString(length: number) {
    return Math.random().toString(36).substring(2, 2 + length);
}

export function generateTeachers(nb: number) {
    const users = retreiveUsers();
    for (let i = 1; i <= nb; i++) {
        const username = `teacher${users.length + i}`;
        const email = `teacher${users.length + i}@school.com`;
        const password = randomString(8);

        users.push({
            username,
            email,
            password,
            role: 'teacher'
        });
    }
    saveUsers(users);
}

export function generateStudents(nb: number) {
    const users = retreiveUsers();
    for (let i = 1; i <= nb; i++) {
        const username = `student${users.length + i}`;
        const email = `student${users.length + i}@school.com`;
        const password = randomString(8);

        users.push({
            username,
            email,
            password,
            role: 'student'
        });
    }

    saveUsers(users);
}

function saveUsers(users: User[]) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function retreiveUsers(): User[] {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
}

export function removeUser(username: string) {
    let users = retreiveUsers();
    users = users.filter(user => user.username !== username);
    saveUsers(users);
}

export function removeAllUsers() {
    saveUsers([]);
}