'use strict';
const TelegramBot = require('node-telegram-bot-api');
let config = require('./config.json');
let token = config.token;
const {google} = require('googleapis');
const keys = require('./secret.json');
let emoji = require('node-emoji').emoji;

let date_ob = new Date();
let day = ("0" + date_ob.getDate()).slice(-2);
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
let year = date_ob.getFullYear();

let date = day + "-" + month + "-" + year;

let hours = date_ob.getHours();
let minutes = date_ob.getMinutes();
let seconds = date_ob.getSeconds();

let dateTime = hours + ":" + minutes + ":" + seconds;

const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);

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
let dialoges = [];
let endpoint;

const ServiceList = {
    shipment: '__Отгрузка__',
    reception: '__Прием__',
    point: 'ожидание выбора точки на которуб будет происходит акт приема/отгрузки',
    targetObject: '',
    apparatOptions: '',
    numberOfApparat: '',
    modelValue: '',
    responsibleForShipment: '',
    responsibleDelivery: '',
    comment: '',
    extraDel: '',
    extraShip: '',
    extraModel: '',
};

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

const DialogesStates =
{
    // ожидание выбора прием или отгрузка
    waitForChoseShipment: "wait_for_chose_shipment",
    waitForChose: 'wait_for_chose',
    waitForChoseReception: "wait_for_chose_reception",
    // ожидание выбора точки на которуб будет происходит акт приема/отгрузки
    waitForPoint: "wait_for_point",
    // ожидание на определение целевого объекта приемаёпередачи
    waitForTargetObject: "wait_for_target_object",
    // ожидание выбора модели целевого оборудования в случае выбора "Аппараты"
    waitForApparatOptions: "wait_apparat_options",
    // ожидание введения количества объектов (int)
    waitForNumberOfApparat: "wait_for_number_apparat",
    // ожидание введения данных ответственного за отгрузку
    waitForResponsibleForShipment: "wait_for_responsible_for_shipment",
    // ожидание введения данных ответственного за перевозку
    waitForResponsibleForDelivery: "wait_for_responsible_for_delivery",
    // ожидание введение коментария
    waitForComment: "wait_for_comment",
    // ожидание подтверждения данных пользователем
    waitForAccept: "wait_for_accept",
    // загрузка
    loading: "loading"
};


bot.onText(/\/echo (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const resp = match[1];
    bot.sendMessage(chatId, resp);
});

async function listServices(id, del){
    if (del){
        const dialog = dialoges.find(x => x.chatId === id);
        delete dialog.chatId;
        delete dialog.state;
        delete dialog.value;
        delete dialog.valueOfPoint;
        delete dialog.targetObject;
        delete dialog.modelValue;
        delete dialog.numberOfApparat;
        delete dialog.responsibleForDelivery;
        delete dialog.responsibleForShipment;
        delete dialog.comment;
        delete dialog.extra;
        delete dialog.extraDel;
        delete dialog.extraShip;
        delete dialog.extraModel;
        endpoint = false;
    }

    const dialogIndex = dialoges.indexOf(x => x.chatId === id);
    console.log(id);

    const gsapi = google.sheets({ version: 'v4', auth: client });
    const getAllData = {
        spreadsheetId: config.spreadsheetId,
        range: `Лист3!A2:A` //get all chat IDs
    };
    let data = await gsapi.spreadsheets.values.get(getAllData);
    let result = data.data.values;
    let qwe = [].concat(...result);
    console.log(qwe);
    let registered;
    for (let i = 0; i < qwe.length; i++){
        if ( qwe[i] === id.toString() ) {
            console.log('true');
            registered = true;
        }
        else {
            console.log('false');
            registered = false;
        }
    }
    if (registered){
        let promo = 'Выберите действие:';
        await bot.sendMessage(id, promo, {
            reply_markup: JSON.stringify({
                keyboard: [
                    [{text: ServiceList.shipment, callback_data: 'makechose1'}],
                    [{text: ServiceList.reception, callback_data: 'makechose2'}],
                ],
                resize_keyboard :true,
                one_time_keyboard: true
            }),
            parse_mode: 'Markdown'
        });
    } else{
        let promo = 'Добро пожаловать в TelegramBot Учета отгрузок \n';
        await bot.sendMessage(id, promo + 'Вы незарегистрированны в системе бота, пожалуйста введите команду "/register"  через пробел укажите ФИО');
    }

    // let promo = 'Выберите действие:';
    // if (dialogIndex > -1) dialoges.splice(dialogIndex, 1);
    // else promo = 'Добро пожаловать в TelegramBot Учета отгрузок \n' + promo;
    // await bot.sendMessage(id, promo, {
    //     reply_markup: JSON.stringify({
    //         keyboard: [
    //             [{text: ServiceList.shipment, callback_data: 'makechose1'}],
    //             [{text: ServiceList.reception, callback_data: 'makechose2'}],
    //         ],
    //         resize_keyboard :true,
    //         one_time_keyboard: true
    //     }),
    //     parse_mode: 'Markdown'
    // });
}

bot.onText(/\/register (.+)/, (msg, match) => {
    let FIO = (msg.text).replace('/register ', '');
    bot.sendMessage(msg.chat.id, "Введите номер телефона: \n").then(r =>
        bot.onText(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im, (msg, match) => {
            let tel = msg.text;
            async function gsrun_FIO(cl) {
                const gsapi = google.sheets({ version: 'v4', auth: cl });
                const rowCounter = {
                    spreadsheetId: config.spreadsheetId,
                    range: `Лист3!A1:A`
                };
                let lastRowData = await gsapi.spreadsheets.values.get(rowCounter);
                let lastRow = lastRowData.data.values.length + 1;
                const updateOptions = {
                    spreadsheetId: config.spreadsheetId,
                    range: `Лист3!A${lastRow}:C${lastRow}`,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [[ msg.chat.id, FIO, tel ]],
                    }
                };
                let data = await gsapi.spreadsheets.values.update(updateOptions);
                console.log(data);
                await bot.sendMessage(msg.chat.id, "Регистрирую данные");
                if ( (data.status === 200)){
                    delete msg.text;
                    await bot.sendMessage(msg.chat.id, "Данные успешно зарегистрированы");
                    await listServices(msg.chat.id);
                } else {
                    await bot.sendMessage(msg.chat.id, "Не удалось загрузить данные в таблицу, попробуйте еще раз.");
                }
            }
            gsrun_FIO(client);
        })
    );
});

bot.onText(/\/(help|start|services|back)/, async (msg) => {
    await listServices(msg.chat.id);
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
    if (msg.text === ServiceList.shipment) await actionHandler('makechose1', msg);
    else if (msg.text === ServiceList.reception) await actionHandler('makechose2', msg);
});

async function actionHandler(action, msg) {
    delete msg.text;
    let menu;
    if (action.match(/makechose\d/)) {
        let finalObject = action.slice(action.length - 1);
        let serviceListValue;
        let dialogStateValue;
        if (finalObject === '1'){
            serviceListValue = ServiceList.shipment;
            dialogStateValue = DialogesStates.waitForChoseShipment
        } else {
            serviceListValue = ServiceList.reception;
            dialogStateValue = DialogesStates.waitForChoseReception
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
            menu = await gsrun(client, `${config.listNameMenu}!A2:A`);
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
        // if (endpoint === true){
        //     await bot.sendMessage(msg.chat.id, 'Вы выбрали *' + serviceListValue + '*\n', {
        //         reply_markup: JSON.stringify({
        //             inline_keyboard: [
        //                 [{text: 'Выбор точки для акта *' + serviceListValue + '*', callback_data: 'wait_for_point'}],
        //                 [{text: 'Назад', callback_data: 'reset'}],
        //                 [{text: 'В конец', callback_data: 'wait_for_accept'}]
        //             ]
        //         }),
        //         parse_mode: 'Markdown'
        //     });
        // } else {
        //     await bot.sendMessage(msg.chat.id, 'Вы выбрали *' + serviceListValue + '*\n', {
        //         reply_markup: JSON.stringify({
        //             inline_keyboard: [
        //                 [{text: 'Выбор точки для акта *' + serviceListValue + '*', callback_data: 'wait_for_point'}],
        //                 [{text: 'Назад', callback_data: 'reset'}]
        //             ]
        //         }),
        //         parse_mode: 'Markdown'
        //     });
        // }
    }
    // else if (action === 'wait_for_point') {
    //     let wayBack;
    //     const dialog = dialoges.find(x => x.chatId === msg.chat.id);
    //     if (dialog.value === ServiceList.shipment) {
    //         wayBack = 'wait_for_chose_shipment';
    //     }else {
    //         wayBack = 'wait_for_chose_reception';
    //     }
    //     if (dialog){
    //         dialog.state = DialogesStates.waitForPoint;
    //     }
    //     else dialoges.push({
    //         chatId: msg.chat.id,
    //         state: DialogesStates.waitForPoint,
    //         extra: null
    //     });
    //
    //     console.log(dialoges);
    //     try {
    //         menu = await gsrun(client, 'Лист2!A2:A');
    //     } catch (e) {
    //         console.log(e);
    //     }
    //     let keyboard_model = fillInKeyboard(menu, 'farm', wayBack);
    //     await bot.sendMessage(msg.chat.id, 'Выберите точку\n', {
    //         reply_markup: JSON.stringify({
    //             inline_keyboard: keyboard_model
    //         }),
    //         parse_mode: 'Markdown'
    //     });
    // }
    else if (action.match(/farm\d/)) {
        let valueOfPointRus = "Ферма " + action.slice(action.length - 1);
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog) {
            dialog.state = DialogesStates.waitForPoint;
            dialog.valueOfPoint = valueOfPointRus;
        } else dialoges.push({
            chatId: msg.chat.id,
            state: DialogesStates.waitForPoint,
            valueOfPoint: valueOfPointRus,
            extra: null
        });
        console.log(dialoges);
        try {
            menu = await gsrun(client, `${config.listNameMenu}!B2:B`);
        } catch (e) {
            console.log(e);
        }
        let choseNumber;
        if ( dialog.value === '__Отгрузка__') choseNumber = 1;
        else choseNumber = 0;
        delete dialog.modelValue;
        let keyboard_model = fillInKeyboard(menu, 'targetObject', 'makechose' + choseNumber);
        await bot.sendMessage(msg.chat.id, 'Выберите целевой объект\n', {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard_model
            }),
            parse_mode: 'Markdown'
        });
    }
        // if (endpoint === true){
        //     await bot.sendMessage(msg.chat.id, 'Выбрана ' + valueOfPointRus + '\n', {
        //         reply_markup: JSON.stringify({
        //             inline_keyboard: [
        //                 [{text: 'Выбор целевого объекта', callback_data: 'wait_for_target_object'}],
        //                 [{text: 'Назад', callback_data: 'wait_for_point'}],
        //                 [{text: 'В конец', callback_data: 'wait_for_accept'}]
        //             ]
        //         }),
        //         parse_mode: 'Markdown'
        //     });
        // } else {
        //     try {
        //         menu = await gsrun(client, 'Лист2!B2:B');
        //     } catch (e) {
        //         console.log(e);
        //     }
        //     let keyboard_model = fillInKeyboard(menu, 'targetObject', 'wait_for_point');
        //     await bot.sendMessage(msg.chat.id, 'Выберите целевой объект\n', {
        //         reply_markup: JSON.stringify({
        //             inline_keyboard: keyboard_model
        //         }),
        //         parse_mode: 'Markdown'
        //     });
        //     // await bot.sendMessage(msg.chat.id, 'Выбрана ' + valueOfPointRus + '\n', {
        //     //     reply_markup: JSON.stringify({
        //     //         inline_keyboard: [
        //     //             [{text: 'Выбор целевого объекта', callback_data: 'wait_for_target_object'}],
        //     //             [{text: 'Назад', callback_data: 'wait_for_point'}]
        //     //         ]
        //     //     }),
        //     //     parse_mode: 'Markdown'
        //     // });
        // }
    // } else if (action === 'wait_for_target_object'){
    //     const dialog = dialoges.find(x => x.chatId === msg.chat.id);
    //     if (dialog){
    //         dialog.state = DialogesStates.waitForTargetObject;
    //     }else dialoges.push({
    //         chatId: msg.chat.id,
    //         state: DialogesStates.waitForTargetObject,
    //         extra: null
    //     });
    //     console.log(dialoges);
    //     try {
    //         menu = await gsrun(client, 'Лист2!B2:B');
    //     } catch (e) {
    //         console.log(e);
    //     }
    //     let keyboard_model = fillInKeyboard(menu, 'targetObject', 'wait_for_point');
    //     await bot.sendMessage(msg.chat.id, 'Выберите целевой объект\n', {
    //         reply_markup: JSON.stringify({
    //             inline_keyboard: keyboard_model
    //         }),
    //         parse_mode: 'Markdown'
    //     });
    // }
    else if(action.match(/targetObject\d/)){
        try {
            menu = await gsrun(client, `${config.listNameMenu}!B2:B`);
        } catch (e) {
            console.log(e);
        }
        let finalObject = action.slice(action.length - 1) - 1; //получение последней цифры в TargetObject
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog){
            dialog.state = DialogesStates.waitForTargetObject;
            dialog.targetObject = menu[finalObject];
            dialog.extra = finalObject; //позиция в массиве для возможности вернуться обратно сюда из сл меню
        }
        else dialoges.push({
            chatId: msg.chat.id,
            state: DialogesStates.waitForTargetObject,
            targetObject: menu[finalObject],
            extra: finalObject,
        });
        console.log(dialoges);
        let farmNumber = (dialog.valueOfPoint).slice((dialog.valueOfPoint).length - 1);
        if ( menu[finalObject] === 'Аппараты'){
            try {
                menu = await gsrun(client, 'Лист2!C2:C');
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
        // if (endpoint === true){
        //     if ( menu[finalObject] === 'Аппараты'){
        //         await bot.sendMessage(msg.chat.id, 'Выбрано ' + menu[finalObject] + '\n', {
        //             reply_markup: JSON.stringify({
        //                 inline_keyboard: [
        //                     [{text: 'Выбрать модель: ', callback_data: 'wait_apparat_options'}],
        //                     [{text: 'Назад', callback_data: 'wait_for_target_object'}],
        //                     [{text: 'В конец', callback_data: 'wait_for_accept'}]
        //                 ]
        //             }),
        //             parse_mode: 'Markdown'
        //         });
        //     } else {
        //         await bot.sendMessage(msg.chat.id, 'Выбрано ' + menu[finalObject] + '\n', {
        //             reply_markup: JSON.stringify({
        //                 inline_keyboard: [
        //                     [{text: 'Ввести количество: ', callback_data: 'wait_for_number_apparat'}],
        //                     [{text: 'Назад', callback_data: 'wait_for_target_object'}],
        //                     [{text: 'В конец', callback_data: 'wait_for_accept'}]
        //                 ]
        //             }),
        //             parse_mode: 'Markdown'
        //         });
        //     }
        // } else {
        //     if ( menu[finalObject] === 'Аппараты'){
        //         await bot.sendMessage(msg.chat.id, 'Выбрано ' + menu[finalObject] + '\n', {
        //             reply_markup: JSON.stringify({
        //                 inline_keyboard: [
        //                     [{text: 'Выбрать модель: ', callback_data: 'wait_apparat_options'}],
        //                     [{text: 'Назад', callback_data: 'wait_for_target_object'}],
        //                 ]
        //             }),
        //             parse_mode: 'Markdown'
        //         });
        //     } else {
        //         await bot.sendMessage(msg.chat.id, 'Выбрано ' + menu[finalObject] + '\n', {
        //             reply_markup: JSON.stringify({
        //                 inline_keyboard: [
        //                     [{text: 'Ввести количество: ', callback_data: 'wait_for_number_apparat'}],
        //                     [{text: 'Назад', callback_data: 'wait_for_target_object'}]
        //                 ]
        //             }),
        //             parse_mode: 'Markdown'
        //         });
        //     }
        // }
    }
    // else if (action === 'wait_apparat_options'){
    //     const dialog = dialoges.find(x => x.chatId === msg.chat.id);
    //     if (dialog){
    //         dialog.state = DialogesStates.waitForApparatOptions;
    //     }
    //     else dialoges.push({
    //         chatId: msg.chat.id,
    //         state: DialogesStates.waitForApparatOptions,
    //         extra: null
    //     });
    //
    //     console.log(dialoges);
    //     try {
    //         menu = await gsrun(client, 'Лист2!C2:C');
    //     } catch (e) {
    //         console.log(e);
    //     }
    //     let keyboard_model = fillInKeyboard(menu, 'modelValue', 'wait_for_target_object');
    //     await bot.sendMessage(msg.chat.id, 'Выберите модель\n', {
    //         reply_markup: JSON.stringify({
    //             inline_keyboard: keyboard_model
    //         }),
    //         parse_mode: 'Markdown'
    //     });
    // }
    else if( action.match(/modelValue\d/)){
        try {
            menu = await gsrun(client, `${config.listNameMenu}!C2:C`);
        } catch (e) {
            console.log(e);
        }
        let finalObject = action.slice(action.length - 1) - 1;
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog){
            dialog.state = DialogesStates.waitForApparatOptions;
            dialog.modelValue = menu[finalObject];
            dialog.extraModel = finalObject;
        }
        else dialoges.push({
            chatId: msg.chat.id,
            state: DialogesStates.waitForApparatOptions,
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
        bot.onText(/^\d+$/, (msg, match) => {
            let valueOfNumber = msg.text;
            console.log(valueOfNumber);
            const dialog = dialoges.find(x => x.chatId === msg.chat.id);
            if (dialog){
                dialog.state = DialogesStates.waitForNumberOfApparat;
                dialog.numberOfApparat = valueOfNumber;
            }
            else dialoges.push({
                chatId: msg.chat.id,
                state: DialogesStates.waitForNumberOfApparat,
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
        });
        delete msg.text;
    } else if (action === 'wait_for_responsible_for_shipment'){
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog){
            dialog.state = DialogesStates.waitForResponsibleForShipment;
        }else dialoges.push({
            chatId: msg.chat.id,
            state: DialogesStates.waitForResponsibleForShipment,
            extra: null
        });
        console.log(dialoges);
        try {
            menu = await gsrun(client, `${config.listNameMenu}!D2:D`);
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
    } else if(action.match(/responsibleShipment\d/)){
        try {
            menu = await gsrun(client, 'Лист2!D2:D');
        } catch (e) {
            console.log(e);
        }
        let finalObject = action.slice(action.length - 1) - 1; //получение последней цифры в TargetObject
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog){
            dialog.state = DialogesStates.waitForResponsibleForShipment;
            dialog.responsibleForShipment = menu[finalObject];
            dialog.extraShip = finalObject;
        }
        else dialoges.push({
            chatId: msg.chat.id,
            state: DialogesStates.waitForResponsibleForShipment,
            responsibleForShipment: menu[finalObject],
            extraShip: finalObject,
            extra: null
        });
        console.log(dialoges);
        try {
            menu = await gsrun(client, `${config.listNameMenu}!E2:E`);
        } catch (e) {
            console.log(e);
        }
        let keyboard_model = fillInKeyboard(menu, 'responsibleDelivery', 'wait_for_responsible_for_shipment');
        await bot.sendMessage(msg.chat.id, 'Выбран: ' + menu[finalObject] + '\n');
        await bot.sendMessage(msg.chat.id, 'Выберите ответственного за доставку\n', {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard_model
            }),
            parse_mode: 'Markdown'
        });
        // await bot.sendMessage(msg.chat.id, 'Выбран: ' + menu[finalObject] + '\n', {
        //     reply_markup: JSON.stringify({
        //         inline_keyboard: [
        //             [{text: 'Выберите ответственного за доставку', callback_data: 'wait_for_responsible_for_delivery'}],
        //             [{text: 'Назад', callback_data: 'wait_for_responsible_for_shipment'}]
        //         ]
        //     }),
        //     parse_mode: 'Markdown'
        // });
    }
    // else if (action === 'wait_for_responsible_for_delivery') {
    //     const dialog = dialoges.find(x => x.chatId === msg.chat.id);
    //     if (dialog) {
    //         dialog.state = DialogesStates.waitForResponsibleForDelivery;
    //     } else dialoges.push({
    //         chatId: msg.chat.id,
    //         state: DialogesStates.waitForResponsibleForDelivery,
    //         extra: null
    //     });
    //     console.log(dialoges);
    //     try {
    //         menu = await gsrun(client, 'Лист2!E2:E');
    //     } catch (e) {
    //         console.log(e);
    //     }
    //     let keyboard_model = fillInKeyboard(menu, 'responsibleDelivery', 'wait_for_responsible_for_shipment');
    //     await bot.sendMessage(msg.chat.id, 'Выберите ответственного за доставку\n', {
    //         reply_markup: JSON.stringify({
    //             inline_keyboard: keyboard_model
    //         }),
    //         parse_mode: 'Markdown'
    //     });
    // }
    else if(action.match(/responsibleDelivery\d/)) {
        try {
            menu = await gsrun(client, 'Лист2!E2:E');
        } catch (e) {
            console.log(e);
        }
        let finalObject = action.slice(action.length - 1) - 1; //получение последней цифры в TargetObject
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog) {
            dialog.state = DialogesStates.waitForResponsibleForDelivery;
            dialog.responsibleForDelivery = menu[finalObject];
            dialog.extraDel = finalObject;
        } else dialoges.push({
            chatId: msg.chat.id,
            state: DialogesStates.waitForResponsibleForDelivery,
            responsibleForDelivery: menu[finalObject],
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
        bot.onText(/(.+)/, (msg) => {
            if ( (msg.text.match(/(.+)__Отгрузка__/)) || (msg.text.match(/(.+)__Прием__/))) return;
            let commentValue = msg.text;
            const dialog = dialoges.find(x => x.chatId === msg.chat.id);
            if (dialog){
                dialog.state = DialogesStates.waitForComment;
                dialog.comment = commentValue;
            }
            else dialoges.push({
                chatId: msg.chat.id,
                state: DialogesStates.waitForComment,
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
                            [{text: 'Назад', callback_data: 'responsibleDelivery' + dialog.extraDel}],
                        ]
                    }),
                    parse_mode: 'Markdown'
                });
                delete msg.text;
            }
        });
        delete msg.text;
    }else if (action === 'wait_for_accept'){
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog) {
            dialog.state = DialogesStates.waitForAccept;
        } else dialoges.push({
            chatId: msg.chat.id,
            state: DialogesStates.waitForAccept,
            extra: null
        });
        console.log(dialoges);
        if (dialog.comment === undefined ) dialog.comment = 'Отсутствует';
        if (dialog.modelValue === undefined ) dialog.modelValue = ' - ';
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
    } else if ( action === 'unconfirmed'){
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);
        if (dialog) {
            dialog.state = DialogesStates.waitForAccept;
        } else dialoges.push({
            chatId: msg.chat.id,
            state: DialogesStates.waitForAccept,
            extra: null
        });
        console.log(dialoges);
        endpoint = true;

        let choseNumber;
        if ( dialog.value === '__Отгрузка__') choseNumber = 1;
        else choseNumber = 0;
        let farmNumber = (dialog.valueOfPoint).slice((dialog.valueOfPoint).length - 1);

        await bot.sendMessage(msg.chat.id, '\nПодтвердите данные:\n', {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: 'Тип: ' + dialog.value, callback_data: 'reset'}],
                    [{text: 'Ферма: ' + dialog.valueOfPoint, callback_data: 'makechose' + choseNumber }],
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
    } else if (action === 'confirmed'){
        const dialog = dialoges.find(x => x.chatId === msg.chat.id);

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
                    values: [[ date, dateTime, (dialog.value).slice(2, -2), dialog.valueOfPoint, dialog.targetObject, dialog.numberOfApparat, dialog.modelValue, dialog.responsibleForShipment, dialog.responsibleForDelivery, dialog.comment ]],
                }
            };
            let data = await gsapi.spreadsheets.values.update(updateOptions);
            console.log(data);
            if ( (data.status === 200)){
                delete msg.text;
                await listServices(msg.chat.id, true);
            } else {
                await bot.sendMessage(msg.chat.id, "Не удалось загрузить данные в таблицу, попробуйте еще раз.");
                await actionHandler('unconfirmed', msg.chat.id);
            }
        }
        gsrun_final(client, true);
    } else if (action === 'reset') {
        await listServices(msg.chat.id);
    }
}



// if ( match ){
//     let valueOfNumber = msg.text;
//     console.log(valueOfNumber);
//     const dialog = dialoges.find(x => x.chatId === msg.chat.id);
//     if (dialog){
//         dialog.state = DialogesStates.waitForNumberOfApparat;
//         dialog.numberOfApparat = valueOfNumber;
//     }
//     else dialoges.push({
//         chatId: msg.chat.id,
//         state: DialogesStates.waitForNumberOfApparat,
//         numberOfApparat: valueOfNumber,
//         extra: null
//     });
//     console.log(dialoges);
//     if (endpoint === true){
//         bot.sendMessage(msg.chat.id, 'Количество: ' + valueOfNumber + '\n', {
//             reply_markup: JSON.stringify({
//                 inline_keyboard: [
//                     [{text: 'Выбор ответственного за отгрузку', callback_data: 'wait_for_responsible_for_shipment'}],
//                     [{text: 'Назад', callback_data: 'wait_for_target_object'}],
//                     [{text: 'В конец', callback_data: 'wait_for_accept'}]
//                 ]
//             }),
//             parse_mode: 'Markdown'
//         });
//         delete msg.text;
//     } else {
//         bot.sendMessage(msg.chat.id, 'Количество: ' + valueOfNumber + '\n', {
//             reply_markup: JSON.stringify({
//                 inline_keyboard: [
//                     [{text: 'Выбор ответственного за отгрузку', callback_data: 'wait_for_responsible_for_shipment'}],
//                     [{text: 'Назад', callback_data: 'wait_for_target_object'}]
//                 ]
//             }),
//             parse_mode: 'Markdown'
//         });
//         delete msg.text;
//     }
// } else {
//     bot.sendMessage(msg.chat.id, 'Введите только цифры без других вспомогательных символов.', {
//         reply_markup: JSON.stringify({
//             inline_keyboard: [
//                 [{text: 'Ввести еще раз', callback_data: 'wait_for_number_apparat'}],
//                 [{text: 'Назад', callback_data: 'wait_for_target_object'}]
//             ]
//         }),
//         parse_mode: 'Markdown'
//     });
//     delete msg.text;
// }