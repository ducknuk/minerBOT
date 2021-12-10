const DialogsStates =
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
    loading: "loading",
    FIO: "FIO",
    phone: "phone",
    regState: ''
};

const ServiceList = {
    shipment: 'Отгрузка Товара',
    reception: 'Прием Товара',
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
    FIO: '',
    phone: '',
    newUser: 'Зарегистрироваться в системе бота Учета отгрузок',
    regState: ''
};

module.exports = { DialogsStates, ServiceList };