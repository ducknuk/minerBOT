const {google} = require('googleapis');
const keys = require('./secret.json');
const config = require('./config.json');

const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);

async function gsrun(cl, final) {
    const gsapi = google.sheets({ version: 'v4', auth: cl });
    let x = (await getterLastRow(client)).flat(2);
    let y = Number.parseInt(x);
    console.log(y);
    const updateOptions = {
        spreadsheetId: config.spreadsheetId,
        range: 'Лист1!A' + y +':B' + y,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [[ '1', '1' ]],
        }
    };
    const updateCounter = {
        spreadsheetId: config.spreadsheetId,
        range: 'Лист1!K1',
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [[ y + 1 ]],
        }
    };
    const testCounter = {
        spreadsheetId: config.spreadsheetId,
        range: 'Лист1!A1:A'
    };
    let data = await gsapi.spreadsheets.values.update(updateOptions);
    let data2 = await gsapi.spreadsheets.values.get(testCounter);
    console.log(data2.data.values.length);
}

async function getterLastRow(cl){
    const gsapi = google.sheets({ version: 'v4', auth: cl });
    const opt = {
        spreadsheetId: config.spreadsheetId,
        range: 'Лист1!K1',
    };
    let data = await gsapi.spreadsheets.values.get(opt);
    return data.data.values;
}

gsrun(client);