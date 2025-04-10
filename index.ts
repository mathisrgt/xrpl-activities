import { generateMemoActivity } from "./activities/memo-activity/memo-activity";
import { User } from "./students";

async function main() {
    const students: User[] = [{
        username: "mathis",
        email: "mathis@email.com",
        password: "123456",
        role: "student"
    }, {
        username: "melanie",
        email: "melanie@email.com",
        password: "123456",
        role: "student"
    }, {
        username: "thomas",
        email: "thomas@email.com",
        password: "123456",
        role: "student"
    }, {
        username: "luc",
        email: "luc@email.com",
        password: "123456",
        role: "student"
    }]

    generateMemoActivity(
        "IE Madrid - Workshop Tech.",
        "Technical workshop for business students from IE Madrid",
        students
    );
}

main();