'use strict';
const TelegramBot = require('node-telegram-bot-api');
let config = require('./config.json');
let token = config.token;
const {google} = require('googleapis');
const keys = require('./secret.json');
let emoji = require('node-emoji').emoji;

const dateLib = require('./particles/data.js');
const clientLib = require('./particles/client.js');
const statesLib = require('./particles/helpers');

async function gsrun(cl, range) {
    const gsapi = google.sheets({ version: 'v4', auth: cl });
    const opt = {
        spreadsheetId: config.spreadsheetId,
        range: range
    };
    let data = await gsapi.spreadsheets.values.get(opt);
    return data.data.values.flat();
}

const bot = new TelegramBot(token, { polling: true });
const PhoneRegex = /^((\+7|7|8)+(\-?\s*?[0-9]){10})$/;
let dialoges = [];
let endpoint;

function fillInKeyboard(list, opt, reset) {
    let keyboard = [];
    for (let i = 0; i < list.length; i++) {
        keyboard.push([{'text': list[i], 'callback_data': (opt + (i + 1))}]);
        if (i === list.length - 1){
            if ( endpoint === true ){
                keyboard.push(
                    [{text: 'Назад', callback_data: reset}],
                    [{text: 'В конец', callback_data: 'wait_for_accept'}]
                );
            } else {
                keyboard.push(
                    [{text: 'Назад', callback_data: reset}]
                );
            }
        }
    }
    return keyboard;
}

bot.onText(/\/echo (.+)/, (msg, match) => {
    const dialog = dialoges.find(x => x.chatId === id);
    console.log("dateTime: " + dateLib.dateTime);
    console.log("date: " + dateLib.date);

    const chatId = msg.chat.id;
    const resp = match[1];
    bot.sendMessage(chatId, resp);
});

async function listServices(id, del){

    const dialogIndex = dialoges.indexOf(x => x.chatId === id);
    if(del && dialogIndex >= 0){
        dialoges.splice(dialogIndex, 1);
        endpoint = false;
    }
    console.log(id);

    const gsapi = google.sheets({ version: 'v4', auth: clientLib.client });
    const getAllData = {
        spreadsheetId: config.spreadsheetId,
        range: `${config.listRegister}!A2:A` //get all chat IDs
    };
    let data = await gsapi.spreadsheets.values.get(getAllData);
    let result = data.data.values;
    console.log("result: " + result);

    if (result === undefined ){
        let promo = 'Добро пожаловать в TelegramBot Учета отгрузок \n';
        await bot.sendMessage(id, promo + 'Вы не зарегистрированы в системе бота.\nОбратитесь к администратору для получения инструкций. После чего нажмите на кнопку ниже.', {
            reply_markup: JSON.stringify({
                keyboard: [
                    [{text: statesLib.ServiceList.newUser, callback_data: 'register'}],
                ],
                resize_keyboard :true,
                one_time_keyboard: true
            })
        });
    } else {
        let resultForArray = [].concat(...result);
        for (let i = 0; i < resultForArray.length; i++) {
            if (resultForArray[i] === id.toString()) {
                console.log('true');
                let promo = 'Выберите действие:';
                await bot.sendMessage(id, promo, {
                    reply_markup: JSON.stringify({
                        keyboard: [
                            [{text: statesLib.ServiceList.shipment, callback_data: 'makeChoice1'}],
                            [{text: statesLib.ServiceList.reception, callback_data: 'makeChoice2'}],
                        ],
                        resize_keyboard :true,
                        one_time_keyboard: true
                    }),
                    parse_mode: 'Markdown'
                });
                return;
            }
        }
        let promo = 'Добро пожаловать в TelegramBot Учета отгрузок \n';
        await bot.sendMessage(id, promo + 'Вы не зарегистрированы в системе бота.\nОбратитесь к администратору для получения инструкций. После чего нажмите на кнопку ниже.', {
            reply_markup: JSON.stringify({
                keyboard: [
                    [{text: statesLib.ServiceList.newUser, callback_data: 'register'}],
                ],
                resize_keyboard :true,
                one_time_keyboard: true
            })
        });
    }
}

bot.on('message', (msg) => {
    let valueOfNumber = msg.text;
    const dialog = dialoges.find(x => x.chatId === msg.chat.id);
    if (dialog){
        if ( (dialog.state === 'wait_for_target_object') && (valueOfNumber.match(/^\d+$/))){
            console.log(valueOfNumber);
            const dialog = dialoges.find(x => x.chatId === msg.chat.id);
            if (dialog){
                dialog.state = statesLib.DialogsStates.waitForNumberOfApparat;
                dialog.numberOfApparat = valueOfNumber;
            }
            else dialoges.push({
                chatId: msg.chat.id,
                state: statesLib.DialogsStates.waitForNumberOfApparat,
                numberOfApparat: valueOfNumber,
                extra: null
            });
            console.log(dialoges);
            let farmNumber = (dialog.valueOfPoint).slice((dialog.valueOfPoint).length - 1);
            if (endpoint === true){
                bot.sendMessage(msg.chat.id, 'Количество: ' + valueOfNumber + '\n', {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: 'Выбор ответственного за отгрузку', callback_data: 'wait_for_responsible_for_shipment'}],
                            [{text: 'Назад', callback_data: 'farm' + farmNumber }],
                            [{text: 'В конец', callback_data: 'wait_for_accept'}]
                        ]
                    }),
                    parse_mode: 'Markdown'
                });
                delete msg.text;
            } else {
                bot.sendMessage(msg.chat.id, 'Количество: ' + valueOfNumber + '\n', {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: 'Выбор ответственного за отгрузку', callback_data: 'wait_for_responsible_for_shipment'}],
                            [{text: 'Назад', callback_data: 'farm' + farmNumber }]
                        ]
                    }),
                    parse_mode: 'Markdown'
                });
                delete msg.text;
            }
        }
        if ( (dialog.state === 'wait_for_target_object') && (!valueOfNumber.match(/^\d+$/))){
            bot.sendMessage(msg.chat.id, 'Неправильно введено количество.\nПопробуйте еще раз: ');
            return;
        }
        if ( (dialog.state === 'wait_for_responsible_for_delivery') && ( (msg.text).match(/(.+)/) )){
            if ( (msg.text === 'Отгрузка Товара') || (msg.text === 'Прием Товара')) return;
            let commentValue = msg.text;
            const dialog = dialoges.find(x => x.chatId === msg.chat.id);
            if (dialog){
                dialog.state = statesLib.DialogsStates.waitForComment;
                dialog.comment = commentValue;
            }
            else dialoges.push({
                chatId: msg.chat.id,
                state: statesLib.DialogsStates.waitForComment,
                numberOfApparat: commentValue,
                extra: null
            });
            console.log(dialoges);
            if (endpoint === true){
                bot.sendMessage(msg.chat.id, 'Комментарий успешно сохранен\n', {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: 'Подтвердить данные', callback_data: 'wait_for_accept'}],
                            [{text: 'Назад', callback_data: 'responsibleDelivery' + dialog.extraDel}],
                            [{text: 'В конец', callback_data: 'wait_for_accept'}]
                        ]
                    }),
                    parse_mode: 'Markdown'
                });
                delete msg.text;
            } else {
                bot.sendMessage(msg.chat.id, 'Комментарий успешно сохранен\n', {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: 'Подтвердить данные', callback_data: 'wait_for_accept'}],
                            [{text: 'Назад', callback_data: 'responsibleDelivery' + dialog.extraDel }],
                        ]
                    }),
                    parse_mode: 'Markdown'
                });
                delete msg.text;
            }
        }
    }
});

// bot.onText(/\/phone\s*(.+)/, async (msg, match) => {
//     const dialog = dialoges.find(x => x.chatId === msg.chat.id);
//     if (!dialog){
//         await bot.sendMessage(msg.chat.id, 'Сначала начните с /register');
//         return;
//     }
//     let phone = match[1].replace(/\/phone\s*/, '');
//     console.log(phone);
//     if ( !phone.match(/^((\+7|7|8)+(\-?\s*?[0-9]){10})$/) ){
//         await bot.sendMessage(msg.chat.id, 'Неверно введен номер телефона.\nВведите пожалуйста еще раз');
//         return;
//     }
//     dialog.phone = phone;
//
//     console.log(dialoges);
//     const gsapi = google.sheets({ version: 'v4', auth: clientLib.client });
//     const rowCounter = {
//         spreadsheetId: config.spreadsheetId,
//         range: `${config.listRegister}!A1:A`
//     };
//     let lastRowData = await gsapi.spreadsheets.values.get(rowCounter);
//     let lastRow = lastRowData.data.values.length + 1;
//     const updateOptions = {
//         spreadsheetId: config.spreadsheetId,
//         range: `${config.listRegister}!A${lastRow}:C${lastRow}`,
//         valueInputOption: 'USER_ENTERED',
//         resource: {
//             values: [[ msg.chat.id, dialog.FIO, phone.replace('+', '') ]],
//         }
//     };
//     try {
//         let data = await gsapi.spreadsheets.values.update(updateOptions);
//         console.log(data);
//         await bot.sendMessage(msg.chat.id, "Регистрирую данные");
//         if ( (data.status === 200)){
//             dialog.regState = "Done";
//             await bot.sendMessage(msg.chat.id, "Данные успешно зарегистрированы");
//             return await listServices(msg.chat.id, true);
//         } else {
//             await bot.sendMessage(msg.chat.id, "Не удалось загрузить данные в таблицу, попробуйте еще раз.");
//             await listServices(msg.chat.id, true);
//         }
//     } catch (e) {
//         console.log(e);
//     }
// });
// bot.onText(/\/register\s*(.+)/, (msg) => {
//     let FIO = (msg.text).replace('/register ', '');
//     const dialog = dialoges.find(x => x.chatId === msg.chat.id);
//
//     if (dialog){
//         dialog.FIO = FIO;
//         dialog.regState = "PhoneWait";
//     }
//     else dialoges.push({
//         chatId: msg.chat.id,
//         FIO,
//         regState: "PhoneWait"
//     });
//     bot.sendMessage(msg.chat.id, 'Введите номер телефона с помощью команды "/phone": \n');
// });


bot.onText(/\/(help|start|services|back)/, async (msg) => {
    await listServices(msg.chat.id, true);
});

bot.on("polling_error", (msg) => console.log(msg));
bot.on('callback_query', async function onCallbackQuery(data) {
    const action = data.data;
    const msg = data.message;
    await actionHandler(action, msg);
});

bot.onText(/^[^/].+/, async (msg) => {
    const dialog = dialoges.find(x => x.chatId === msg.chat.id);
    let message = msg.text.trim().toUpperCase();
    if (dialog && dialog.state === 'loading') {
        await bot.sendMessage(msg.chat.id, 'Ожидайте выполнения операции...');
        return;
    }
    if (msg.text === statesLib.ServiceList.shipment) await actionHandler('makechose1', msg);
    else if (msg.text === statesLib.ServiceList.reception) await actionHandler('makechose2', msg);
    else if ( msg.text === statesLib.ServiceList.newUser ) await actionHandler( 'register', msg)
});

async function actionHandler(action, msg) {
    delete msg.text;
    let menu;
    if ( action === 'register' ){
        await bot.sendMessage(msg.chat.id, 'Введите свое ФИО, как вам дал администратор используя команду "/name".');
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        bot.onText(/\/name\s*(.+)/, (msg) => {
            let FIO = (msg.text).replace('/name ', '');
            const dialog = dialoges.find(x => x.chatId === msg.chat.id);

            if (dialog){
                dialog.FIO = FIO;
                dialog.regState = "PhoneWait";
            }
            else dialoges.push({
                chatId: msg.chat.id,
                FIO,
                regState: "PhoneWait"
            });
            bot.sendMessage(msg.chat.id, 'Введеное ФИО: ' + FIO + '\n', {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: 'Ввести номер телефона', callback_data: 'phone'}],
                    ]
                }),
                parse_mode: 'Markdown'
            });
        });
    }
    else if( action === 'phone' ){
        await bot.sendMessage(msg.chat.id, 'Введите номер телефона, который вам дал администратор, используя команду "/phone": ');
        bot.onText(/\/phone\s*(.+)/, async (msg, match) => {
            const dialog = dialoges.find(x => x.chatId === msg.chat.id);
            if (!dialog){
                await bot.sendMessage(msg.chat.id, 'Сначала начните с /register');
                return;
            }
            let phone = match[1].replace(/\/phone\s*/, '');
            console.log(phone);
            if ( !phone.match(/^((\+7|7|8)+(\-?\s*?[0-9]){10})$/) ){
                await bot.sendMessage(msg.chat.id, 'Неверно введен номер телефона.\nВведите пожалуйста еще раз');
                return;
            }
            dialog.phone = phone;
            console.log(dialoges);

            const gsapi = google.sheets({ version: 'v4', auth: clientLib.client });
            const rowCounter = {
                spreadsheetId: config.spreadsheetId,
                range: `${config.listRegister}!A1:A`
            };
            let lastRowData = await gsapi.spreadsheets.values.get(rowCounter);
            let lastRow = lastRowData.data.values.length + 1;
            const updateOptions = {
                spreadsheetId: config.spreadsheetId,
                range: `${config.listRegister}!A${lastRow}:C${lastRow}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[ msg.chat.id, dialog.FIO, phone.replace('+', '') ]],
                }
            };
            try {
                let data = await gsapi.spreadsheets.values.update(updateOptions);
                console.log(data);
                await bot.sendMessage(msg.chat.id, "Регистрирую данные");
                if ( (data.status === 200)){
                    dialog.regState = "Done";
                    await bot.sendMessage(msg.chat.id, "Данные успешно зарегистрированы");
                    return await listServices(msg.chat.id, true);
                } else {
                    await bot.sendMessage(msg.chat.id, "Не удалось загрузить данные в таблицу, попробуйте еще раз.");
                    await listServices(msg.chat.id, true);
                }
            } catch (e) {
                console.log(e);
            }
        });
    }
    else if (action.match(/makechose\d/)) {
        let finalObject = action.slice(action.length - 1);
        let serviceListValue;
        let dialogStateValue;
        if (finalObject === '1'){
            serviceListValue = statesLib.ServiceList.shipment;
            dialogStateValue = statesLib.DialogsStates.waitForChoseShipment
        } else {
            serviceListValue = statesLib.ServiceList.reception;
            dialogStateValue = statesLib.DialogsStates.waitForChoseReception
        }
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog){
            dialog.state = dialogStateValue;
            dialog.value = serviceListValue;
        }
        else dialoges.push({
            chatId: msg.chat.id,
            state: dialogStateValue,
            value: serviceListValue,
            extra: null
        });
        console.log(dialoges);
        try {
            menu = await gsrun(clientLib.client, `${config.listMenu}!A2:A`);
        } catch (e) {
            console.log(e);
        }
        let keyboard_model = fillInKeyboard(menu, 'farm', 'reset');
        await bot.sendMessage(msg.chat.id, 'Вы выбрали *' + serviceListValue + '*\n');
        await bot.sendMessage(msg.chat.id, 'Выберите точку: ', {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard_model
            }),
            parse_mode: 'Markdown'
        });
    }
    else if (action.match(/farm\d/)) {
        let valueOfPointRus = "Ферма " + action.slice(action.length - 1);
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog) {
            dialog.state = statesLib.DialogsStates.waitForPoint;
            dialog.valueOfPoint = valueOfPointRus;
        } else dialoges.push({
            chatId: msg.chat.id,
            state: statesLib.DialogsStates.waitForPoint,
            valueOfPoint: valueOfPointRus,
            extra: null
        });
        console.log(dialoges);
        try {
            menu = await gsrun(clientLib.client, `${config.listMenu}!B2:B`);
        } catch (e) {
            console.log(e);
        }
        let choseNumber;
        if ( dialog.value === 'Отгрузка Товара') choseNumber = 1;
        else choseNumber = 0;
        delete dialog.modelValue;
        let keyboard_model = fillInKeyboard(menu, 'targetObject', 'makeChoice' + choseNumber);
        await bot.sendMessage(msg.chat.id, 'Выберите целевой объект\n', {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard_model
            }),
            parse_mode: 'Markdown'
        });
    }
    else if(action.match(/targetObject\d/)){
        try {
            menu = await gsrun(clientLib.client, `${config.listMenu}!B2:B`);
        } catch (e) {
            console.log(e);
        }
        let finalObject = action.slice(action.length - 1) - 1; //получение последней цифры в TargetObject
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog){
            dialog.state = statesLib.DialogsStates.waitForTargetObject;
            dialog.targetObject = menu[finalObject];
            dialog.extra = finalObject; //позиция в массиве для возможности вернуться обратно сюда из сл меню
        }
        else dialoges.push({
            chatId: msg.chat.id,
            state: statesLib.DialogsStates.waitForTargetObject,
            targetObject: menu[finalObject],
            extra: finalObject,
        });
        console.log(dialoges);
        let farmNumber = (dialog.valueOfPoint).slice((dialog.valueOfPoint).length - 1);
        if ( menu[finalObject] === 'Аппараты'){
            try {
                menu = await gsrun(clientLib.client, `${config.listMenu}!C2:C`);
            } catch (e) {
                console.log(e);
            }
            let keyboard_model = fillInKeyboard(menu, 'modelValue', 'farm' + farmNumber);
            await bot.sendMessage(msg.chat.id, 'Выберите модель\n', {
                reply_markup: JSON.stringify({
                    inline_keyboard: keyboard_model
                }),
                parse_mode: 'Markdown'
            });
        } else {
            if (endpoint === true){
                await bot.sendMessage(msg.chat.id, 'Выбрано ' + menu[finalObject] + '\n', {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: 'Ввести количество: ', callback_data: 'wait_for_number_apparat'}],
                            [{text: 'Назад', callback_data: 'farm' + farmNumber}],
                            [{text: 'В конец', callback_data: 'wait_for_accept'}]
                        ]
                    }),
                    parse_mode: 'Markdown'
                });
            } else {
                await bot.sendMessage(msg.chat.id, 'Выбрана ' + menu[finalObject] + '\n', {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: 'Ввести количество: ', callback_data: 'wait_for_number_apparat'}],
                            [{text: 'Назад', callback_data: 'farm' + farmNumber }]
                        ]
                    }),
                    parse_mode: 'Markdown'
                });
            }
        }
    }
    else if( action.match(/modelValue\d/)){
        try {
            menu = await gsrun(clientLib.client, `${config.listMenu}!C2:C`);
        } catch (e) {
            console.log(e);
        }
        let finalObject = action.slice(action.length - 1) - 1;
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog){
            dialog.state = statesLib.DialogsStates.waitForApparatOptions;
            dialog.modelValue = menu[finalObject];
            dialog.extraModel = finalObject;
        }
        else dialoges.push({
            chatId: msg.chat.id,
            state: statesLib.DialogsStates.waitForApparatOptions,
            valueOfPoint: menu[finalObject],
            extra: null,
            extraModel: finalObject,
        });
        console.log(dialoges);
        let farmNumber = (dialog.valueOfPoint).slice((dialog.valueOfPoint).length - 1);
        if (endpoint === true){
            await bot.sendMessage(msg.chat.id, 'Выбрана ' + menu[finalObject] + ' модель\n', {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: 'Ввести количество: ', callback_data: 'wait_for_number_apparat'}],
                        [{text: 'Назад', callback_data: 'farm' + farmNumber }],
                        [{text: 'В конец', callback_data: 'wait_for_accept'}]
                    ]
                }),
                parse_mode: 'Markdown'
            });
        } else {
            await bot.sendMessage(msg.chat.id, 'Выбрана ' + menu[finalObject] + ' модель\n', {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: 'Ввести количество: ', callback_data: 'wait_for_number_apparat'}],
                        [{text: 'Назад', callback_data: 'farm' + farmNumber }]
                    ]
                }),
                parse_mode: 'Markdown'
            });
        }
    }else if (action === 'wait_for_number_apparat') {
        await bot.sendMessage(msg.chat.id, 'Введите количество(без посторонних символов или знаков): ');
        delete msg.text;
    } else if (action === 'wait_for_responsible_for_shipment'){
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog){
            dialog.state = statesLib.DialogsStates.waitForResponsibleForShipment;
        }else dialoges.push({
            chatId: msg.chat.id,
            state: statesLib.DialogsStates.waitForResponsibleForShipment,
            extra: null
        });
        console.log(dialoges);
        try {
            menu = await gsrun(clientLib.client, `${config.listMenu}!D2:D`);
        } catch (e) {
            console.log(e);
        }
        let farmNumber = (dialog.valueOfPoint).slice((dialog.valueOfPoint).length - 1);
        let keyboard_model = fillInKeyboard(menu, 'responsibleShipment', 'farm' + farmNumber);
        await bot.sendMessage(msg.chat.id, 'Выберите ответственного за отгрузку\n', {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard_model
            }),
            parse_mode: 'Markdown'
        });
    } else if(action.match(/responsibleShipment\d/)) {
        try {
            menu = await gsrun(clientLib.client, `${config.listMenu}!D2:D`);
        } catch (e) {
            console.log(e);
        }
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        let finalObject = action.slice(action.length - 1) - 0; //получение последней цифры в responsibleShipment
        if (dialog) {
            dialog.state = statesLib.DialogsStates.waitForResponsibleForShipment;
            dialog.responsibleForShipment = menu[finalObject - 1];
            dialog.extraShip = finalObject;
        } else dialoges.push({
            chatId: msg.chat.id,
            state: statesLib.DialogsStates.waitForResponsibleForShipment,
            responsibleForShipment: menu[finalObject - 1],
            extraShip: finalObject,
            extra: null
        });
        console.log(dialoges);
        try {
            menu = await gsrun(clientLib.client, `${config.listMenu}!E2:E`);
        } catch (e) {
            console.log(e);
        }
        let keyboard_model = fillInKeyboard(menu, 'responsibleDelivery', 'wait_for_responsible_for_shipment');
        await bot.sendMessage(msg.chat.id, 'Выбран: ' + menu[finalObject - 1] + '\n');
        await bot.sendMessage(msg.chat.id, 'Выберите ответственного за доставку\n', {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard_model
            }),
            parse_mode: 'Markdown'
        });
    }
    else if(action.match(/responsibleDelivery\d/)) {
        try {
            menu = await gsrun(clientLib.client, `${config.listMenu}!E2:E`);
        } catch (e) {
            console.log(e);
        }
        let finalObject = action.slice(action.length - 1) - 0; //получение последней цифры в responsibleDelivery
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog) {
            dialog.state = statesLib.DialogsStates.waitForResponsibleForDelivery;
            dialog.responsibleForDelivery = menu[finalObject - 1];
            dialog.extraDel = finalObject;
        } else dialoges.push({
            chatId: msg.chat.id,
            state: statesLib.DialogsStates.waitForResponsibleForDelivery,
            responsibleForDelivery: menu[finalObject - 1],
            extra: null,
            extraDel: finalObject,
        });
        console.log(dialoges);

        if (dialog.targetObject === 'Другое'){
            await bot.sendMessage(msg.chat.id, 'Выбран: ' + menu[finalObject] + '\n', {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: 'Оставить комментарий', callback_data: 'waitForComment'}],
                        [{text: 'Назад', callback_data: 'responsibleShipment' + dialog.extraShip }],
                    ]
                }),
                parse_mode: 'Markdown'
            });
        } else {
            await bot.sendMessage(msg.chat.id, 'Выбран: ' + menu[finalObject] + '\n', {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: 'Оставить комментарий (необязательно)', callback_data: 'waitForComment'}],
                        [{text: 'Назад', callback_data: 'responsibleShipment' + dialog.extraShip }],
                        [{text: 'Подтвердить данные', callback_data: 'wait_for_accept'}]
                    ]
                }),
                parse_mode: 'Markdown'
            });
        }
    } else if (action === 'waitForComment'){
        await bot.sendMessage(msg.chat.id, 'Оставить комментарий: \n');
    }else if (action === 'wait_for_accept'){
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog) {
            dialog.state = statesLib.DialogsStates.waitForAccept;
        } else dialoges.push({
            chatId: msg.chat.id,
            state: statesLib.DialogsStates.waitForAccept,
            extra: null
        });
        console.log(dialoges);
        if (dialog.comment === undefined ) dialog.comment = 'Отсутствует';
        if (dialog.modelValue === undefined ){
            await bot.sendMessage(msg.chat.id,
                emoji.game_die + 'Состояние: *' + (dialog.value).slice(2, -2) + '*\n' +
                emoji.bank + 'Ферма: *' + dialog.valueOfPoint + '*\n' +
                emoji.bookmark + 'Наименование: *' + dialog.targetObject + '*\n' +
                emoji.gear + 'Количество: *' + dialog.numberOfApparat + '*\n' +
                emoji.outbox_tray + 'Ответственный за отгрузку: *' + dialog.responsibleForShipment  + '*\n' +
                emoji.inbox_tray + 'Ответственный за перевозку: *' + dialog.responsibleForDelivery + '*\n' +
                emoji.page_facing_up + 'Комментарий: *' + dialog.comment + '*\n' +
                'Подтвердите данные:\n', {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: 'Да', callback_data: 'confirmed'}],
                            [{text: 'Нет', callback_data: 'unconfirmed'}],
                        ]
                    }),
                    parse_mode: 'Markdown'
                }
            );
        } else {
            await bot.sendMessage(msg.chat.id,
                emoji.game_die + 'Состояние: *' + (dialog.value).slice(2, -2) + '*\n' +
                emoji.bank + 'Ферма: *' + dialog.valueOfPoint + '*\n' +
                emoji.bookmark + 'Наименование: *' + dialog.targetObject + '*\n' +
                emoji.gear + 'Количество: *' + dialog.numberOfApparat + '*\n' +
                emoji.package + 'Модель: *' + dialog.modelValue + '*\n' +
                emoji.outbox_tray + 'Ответственный за отгрузку: *' + dialog.responsibleForShipment  + '*\n' +
                emoji.inbox_tray + 'Ответственный за перевозку: *' + dialog.responsibleForDelivery + '*\n' +
                emoji.page_facing_up + 'Комментарий: *' + dialog.comment + '*\n' +
                'Подтвердите данные:\n', {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: 'Да', callback_data: 'confirmed'}],
                            [{text: 'Нет', callback_data: 'unconfirmed'}],
                        ]
                    }),
                    parse_mode: 'Markdown'
                }
            );
        }
    } else if ( action === 'unconfirmed'){
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog) {
            dialog.state = statesLib.DialogsStates.waitForAccept;
        } else dialoges.push({
            chatId: msg.chat.id,
            state: statesLib.DialogsStates.waitForAccept,
            extra: null
        });
        console.log(dialoges);
        endpoint = true;

        let choseNumber;
        if ( dialog.value === 'Отгрузка Товара') choseNumber = 1;
        else choseNumber = 0;
        let farmNumber = (dialog.valueOfPoint).slice((dialog.valueOfPoint).length - 1);
        if ( dialog.modelValue === undefined ){
            await bot.sendMessage(msg.chat.id, '\nПодтвердите данные:\n', {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: 'Тип: ' + dialog.value, callback_data: 'reset'}],
                        [{text: 'Ферма: ' + dialog.valueOfPoint, callback_data: 'makeChoice' + choseNumber }],
                        [{text: 'Наименование: ' + dialog.targetObject, callback_data: 'farm' + farmNumber }],
                        [{text: 'Количество: ' + dialog.numberOfApparat, callback_data: 'wait_for_number_apparat'}],
                        [{text: 'Модель: ' + dialog.modelValue, callback_data: 'modelValue' + dialog.extraModel }],
                        [{
                            text: 'Ответственный за отгрузку: ' + dialog.responsibleForShipment,
                            callback_data: 'wait_for_responsible_for_shipment'
                        }],
                        [{
                            text: 'Ответственный за перевозку: ' + dialog.responsibleForDelivery,
                            callback_data: 'responsibleShipment' + dialog.extraShip
                        }],
                        [{
                            text: 'Комментарий: ' + dialog.comment,
                            callback_data: 'wait_for_comment'
                        }],
                    ]
                }),
                parse_mode: 'Markdown'
            });
        } else {
            await bot.sendMessage(msg.chat.id, '\nПодтвердите данные:\n', {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: 'Тип: ' + dialog.value, callback_data: 'reset'}],
                        [{text: 'Ферма: ' + dialog.valueOfPoint, callback_data: 'makeChoice' + choseNumber }],
                        [{text: 'Наименование: ' + dialog.targetObject, callback_data: 'farm' + farmNumber }],
                        [{text: 'Количество: ' + dialog.numberOfApparat, callback_data: 'wait_for_number_apparat'}],
                        [{
                            text: 'Ответственный за отгрузку: ' + dialog.responsibleForShipment,
                            callback_data: 'wait_for_responsible_for_shipment'
                        }],
                        [{
                            text: 'Ответственный за перевозку: ' + dialog.responsibleForDelivery,
                            callback_data: 'responsibleShipment' + dialog.extraShip
                        }],
                        [{
                            text: 'Комментарий: ' + dialog.comment,
                            callback_data: 'wait_for_comment'
                        }],
                    ]
                }),
                parse_mode: 'Markdown'
            });
        }
    } else if (action === 'confirmed'){
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        const gsapi = google.sheets({ version: 'v4', auth: clientLib.client });
        const getDataForUpload = {
            spreadsheetId: config.spreadsheetId,
            range: `${config.listRegister}!A2:A` //get all chat IDs
        };
        let data = await gsapi.spreadsheets.values.get(getDataForUpload);
        let result = data.data.values;
        console.log("result: " + result);

        async function gsrun_final(cl) {
            const gsapi = google.sheets({ version: 'v4', auth: cl });
            const rowCounter = {
                spreadsheetId: config.spreadsheetId,
                range: `${config.listName}!A1:A`
            };
            let lastRowData = await gsapi.spreadsheets.values.get(rowCounter);
            let lastRow = lastRowData.data.values.length + 1;
            const updateOptions = {
                spreadsheetId: config.spreadsheetId,
                range: `${config.listName}!A${lastRow}:J${lastRow}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[ dateLib.date, dateLib.dateTime, (dialog.value).slice(2, -2), dialog.valueOfPoint, dialog.targetObject, dialog.numberOfApparat, dialog.modelValue, dialog.responsibleForShipment, dialog.responsibleForDelivery, dialog.comment ]],
                }
            };
            let data = await gsapi.spreadsheets.values.update(updateOptions);
            console.log(data);
            if ( (data.status === 200)){
                delete msg.text;
                await bot.sendMessage(msg.chat.id, 'Данные успешно загружены в таблицу.');
                await listServices(msg.chat.id, true);
            } else {
                await bot.sendMessage(msg.chat.id, "Не удалось загрузить данные в таблицу, попробуйте еще раз.");
                await actionHandler('unconfirmed', msg.chat.id);
            }
        }

        if (result === undefined ){
            await bot.sendMessage(msg.chat.id, 'Вы не зарегистрированы в системе бота, отгрузка невозвожна.\nОбратитесь за помощью к администратору',{
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: 'Назад', callback_data: 'reset' }],
                    ]
                }),
                parse_mode: 'Markdown'
            });
        } else {
            let resultForArray = [].concat(...result);
            for (let i = 0; i < resultForArray.length; i++) {
                if (resultForArray[i] === (msg.chat.id).toString()) {
                    await gsrun_final(clientLib.client);
                    return;
                }
            }
            await bot.sendMessage(msg.chat.id, 'Вы не зарегистрированы в системе бота, отгрузка невозвожна.\nОбратитесь за помощью к администратору',{
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: 'Назад', callback_data: 'reset' }],
                    ]
                }),
                parse_mode: 'Markdown'
            });
        }
    } else if (action === 'reset') {
        await listServices(msg.chat.id, true);
    }
}
