const keys = require('../secret.json');
const {google} = require('googleapis');

const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);

module.exports = { client };