const mySpreadSheetId = '1lqMl4u2G7cvHsvxVNwwXjisxuNMnA0Uc-Yg7xGre8wE';
const sheetName = "Лист1";

sheets.spreadsheets.values.get(
    {
        auth: jwtClient,
        spreadsheetId: mySpreadSheetId,
        range: `${sheetName}!A:A`
    },
    (err, res) => {
        if (err) {
            console.error(err);
            return;
        }
        const data = res.data.values;
        let i = 0;
        for (i = 0; i < data.length; i++) {
            if (!data[i][0]) break;
        }
        sheets.spreadsheets.values.update(
            {
                auth: jwtClient,
                spreadsheetId: mySpreadSheetId,
                range: `${sheetName}!A${i + 1}`,
                valueInputOption: "USER_ENTERED",
                resource: {
                    majorDimension: "ROWS",
                    values: [["some Text"]]
                }
            },
            (err, resp) => {
                if (err) {
                    console.log("Data Error :", err);
                    reject(err);
                }
                resolve(resp);
            }
        );
    }
);




// if (action === 'wait_for_chose_shipment') {
//     const dialog = dialoges.find(x => x.chatId === msg.chat.id);
//     if (dialog){
//         dialog.state = DialogesStates.waitForChoseShipment;
//         dialog.value = ServiceList.shipment;
//     }
//     else dialoges.push({
//         chatId: msg.chat.id,
//         state: DialogesStates.waitForChoseShipment,
//         value: ServiceList.shipment,
//         extra: null
//     });
//     console.log(dialoges);
//     if (endpoint === true){
//         await bot.sendMessage(msg.chat.id, 'Вы выбрали *'+ ServiceList.shipment + '*\n', {
//             reply_markup: JSON.stringify({
//                 inline_keyboard: [
//                     [{text: 'Выбор точки для акта *' + ServiceList.shipment + '*', callback_data: 'wait_for_point'}],
//                     [{text: 'Назад', callback_data: 'reset'}],
//                     [{text: 'В конец', callback_data: 'wait_for_accept'}]
//                 ]
//             }),
//             parse_mode: 'Markdown'
//         });
//     } else {
//         await bot.sendMessage(msg.chat.id, 'Вы выбрали *'+ ServiceList.shipment + '*\n', {
//             reply_markup: JSON.stringify({
//                 inline_keyboard: [
//                     [{text: 'Выбор точки для акта *' + ServiceList.shipment + '*', callback_data: 'wait_for_point'}],
//                     [{text: 'Назад', callback_data: 'reset'}]
//                 ]
//             }),
//             parse_mode: 'Markdown'
//         });
//     }
// } else if (action === 'wait_for_chose_reception') {
//     const dialog = dialoges.find(x => x.chatId === msg.chat.id);
//     if (dialog){
//         dialog.state = DialogesStates.waitForChoseReception;
//         dialog.value = ServiceList.reception;
//     }
//     else dialoges.push({
//         chatId: msg.chat.id,
//         state: DialogesStates.waitForChoseReception,
//         value: ServiceList.reception,
//         extra: null
//     });
//     console.log(dialoges);
//     if (endpoint === true) {
//         await bot.sendMessage(msg.chat.id, 'Вы выбрали *'+ ServiceList.reception + '*\n', {
//             reply_markup: JSON.stringify({
//                 inline_keyboard: [
//                     [{text: 'Выбор точки для акта *' + ServiceList.reception + '*', callback_data: 'wait_for_point'}],
//                     [{text: 'Назад', callback_data: 'reset'}],
//                     [{text: 'В конец', callback_data: 'wait_for_accept'}]
//                 ]
//             }),
//             parse_mode: 'Markdown'
//         });
//     } else {
//         await bot.sendMessage(msg.chat.id, 'Вы выбрали *'+ ServiceList.reception + '*\n', {
//             reply_markup: JSON.stringify({
//                 inline_keyboard: [
//                     [{text: 'Выбор точки для акта *' + ServiceList.reception + '*', callback_data: 'wait_for_point'}],
//                     [{text: 'Назад', callback_data: 'reset'}]
//                 ]
//             }),
//             parse_mode: 'Markdown'
//         });
//     }
// }