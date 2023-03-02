async function parseTableData(raw, getInfo, userId, queryDate) {
    const elementMap = raw.data.result.data.elements;
    const data = raw.data.result.data.elementPeriods[userId];

    const week = [[], [], [], [], []];

    for (const e of data) {
        const teacher = {...elementMap.find(a => a.type === 2 && a.id === e.elements.find(b => b.type === 2).id)};
        const lesson = {...elementMap.find(a => a.type === 3 && a.id === e.elements.find(b => b.type === 3).id)};
        lesson.teacher = teacher;
        lesson.id = parseInt("" + lesson.id + teacher.id);

        let date = "" + e.date;
        date = new Date(date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6));
        let day = date.getDay() - queryDate.getDay();
        if (!["CANCEL"].includes(e.cellState)) {
            let start = new Date(date), end = new Date(date);
            start.setHours(parseInt(("" + e.startTime).substring(0, 2))+1, parseInt(("" + e.startTime).substring(2)));
            end.setHours(parseInt(("" + e.endTime).substring(0, 2))+1, parseInt(("" + e.endTime).substring(2)));
            e.info = await getInfo(start, end);
            e.lesson = lesson;
            const contains = week[day].find(v => v.startTime === e.startTime);
            if (contains) {
                contains.periodText += e.periodText;
            } else {
                week[day].push(e);
            }
        }
    }

    week.map(day => day.sort((a, b) =>
        a.startTime > b.startTime ? 1 : a.startTime < b.startTime ? -1 : 0
    ));

    return week;
}

module.exports.parseTableData = parseTableData