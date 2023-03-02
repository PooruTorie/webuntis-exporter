const request = require("request");
const config = require("./config.json");
const parser = require("./parser");
const exporter = require("./exporter");
require("./expandDate");

let SESSION = "", TOKEN = "";

function parseSession(value) {
    if (value.headers) {
        if (value.headers["set-cookie"]) {
            for (const cookies of value.headers["set-cookie"]) {
                if (cookies.includes("JSESSIONID=")) {
                    SESSION = cookies.replace(/.*JSESSIONID=(.*?);.*/, "$1");
                    console.log("Session:", SESSION);
                }
            }
        }
    }
}

function auth() {
    request("https://hektor.webuntis.com/WebUntis/j_spring_security_check", {
        method: "POST",
        form: {
            school: config.schoolName,
            j_username: config.username,
            j_password: config.password
        },
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded"
        }
    }, (e, value) => {
        parseSession(value);
        const data = JSON.parse(value.body);
        if (data.state === "SUCCESS") {
            token();
        } else {
            console.error("Login not Succeeded", data);
        }
    });
}

function token() {
    request("https://hektor.webuntis.com/WebUntis/api/token/new", {
        methode: "GET",
        headers: {
            "Cookie": "JSESSIONID=" + SESSION
        }
    }, (e, value) => {
        TOKEN = value.body;
        console.log("Token:", TOKEN)
        userData();
    });
}

let PERSON_ID, PERSON_NAME;

function userData() {
    request("https://hektor.webuntis.com/WebUntis/api/rest/view/v1/app/data", {
        methode: "GET",
        headers: {
            "Cookie": "JSESSIONID=" + SESSION,
            "Authorization": "Bearer " + TOKEN
        }
    }, async (e, value) => {
        const data = JSON.parse(value.body);

        PERSON_ID = data.user.person.id;
        PERSON_NAME = data.user.person.displayName;
        console.log("Person Id:", PERSON_ID);
        console.log("Person Name:", PERSON_NAME);

        for (const date of config.exportWeeks.sort()) {
            await tableData(new Date(date));
        }
    });
}

function getInfo(start, end) {
    start.setMinutes(start.getMinutes() - 15);
    end.setMinutes(end.getMinutes() - 15);
    return new Promise((resolve) =>
        request("https://hektor.webuntis.com/WebUntis/api/rest/view/v1/calendar-entry/detail?elementType=5&homeworkOption=DUE&elementId=" + PERSON_ID + "&startDateTime=" + start.toISOString() + "&endDateTime=" + end.toISOString(), {
            methode: "GET",
            followRedirects: false,
            headers: {
                "Cookie": "JSESSIONID=" + SESSION,
                "Authorization": "Bearer " + TOKEN
            }
        }, (e, v) => {
            let data = JSON.parse(v.body);

            if (data.calendarEntries) {
                if (data.calendarEntries.length > 0) {
                    resolve(data.calendarEntries[0]);
                    return;
                }
            }
            resolve({});
        }));
}

function tableData(queryDate) {
    return new Promise((resolve) => {
        let weekStart = queryDate.getWeekStart();
        request("https://hektor.webuntis.com/WebUntis/api/public/timetable/weekly/data?elementType=5&elementId=" + PERSON_ID + "&date=" + weekStart.toISOString().split("T")[0], {
            methode: "GET",
            followRedirects: false,
            headers: {
                "Cookie": "JSESSIONID=" + SESSION
            }
        }, async (e, value) => {
            let data = JSON.parse(value.body);

            data = await parser.parseTableData(data, getInfo, PERSON_ID, weekStart);
            const sheetName = await exporter.generateSheet(data, PERSON_NAME, weekStart);
            console.log("Exported Sheet:", sheetName);
            resolve(sheetName);
        });
    });
}

auth();