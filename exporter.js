const ExcelJS = require("exceljs");
const config = require("./config.json");

async function generateSheet(week, name, queryDate) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(config.workbookPath);

    const sheetName = queryDate.getFullYear() + "_KW" + queryDate.getWeekNumber();
    let worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
        const template = workbook.worksheets[workbook.worksheets.length-1];
        worksheet = workbook.addWorksheet(sheetName);
        worksheet.model = template.model;
        for (let merge in template._merges) {
            merge = template._merges[merge];
            worksheet.mergeCells(merge.top,merge.left,merge.bottom,merge.right)
        }
        worksheet.name = sheetName;
    }

    worksheet.getCell("D2").value = name;

    for (let i = 6; i <= 40; i++) {
        for (const j of ["C","D","J"]) {
            worksheet.getCell(j+i).value = undefined;
        }
    }

    week.forEach((day, i) => {
        let added = [];
        let lii = 0;
        for (let li in day) {
            let l = day[li];
            li = parseInt(li);
            let f = added.find(ll => ll.lessonId === l.lessonId);
            if (!f) {
                l.row = (i * 7 + 6 + lii);
                l.h = 1;
                added.push(l);
                lii++;
            } else {
                f.h++;
                if (f.info.teachingContent) {
                    if (!f.info.teachingContent.includes(l.info.teachingContent)) {
                        f.info.teachingContent += " - " + l.info.teachingContent;
                    }
                } else {
                    f.info.teachingContent = l.info.teachingContent;
                }
            }
        }
        added.forEach(l => {
            worksheet.getCell("C" + l.row).value = l.lesson.longName;
            worksheet.getCell("D" + l.row).value = l.info.teachingContent;
            worksheet.getCell("J" + l.row).value = 4.1666666666666664E-2 * l.h;
        });
    });

    await workbook.xlsx.writeFile(config.workbookPath);
    return sheetName;
}
module.exports.generateSheet = generateSheet;