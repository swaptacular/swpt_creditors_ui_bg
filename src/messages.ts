// Messages for payment error codes:
export const CANCELED_BY_THE_SENDER = "Плащането е отменено от платеца."
export const SENDER_IS_UNREACHABLE = "Сметката на платеца не съществува или не може да извършва изходящи преводи."
export const RECIPIENT_IS_UNREACHABLE = "Сметката на получателя не съществува или не приема входящи плащания."
export const RECIPIENT_SAME_AS_SENDER = "Сметката на получателя е същата като сметката на платеца."
export const NO_RECIPIENT_CONFIRMATION = "Необходимо е потвърждение от получателя, но такова не е получено."
export const TRANSFER_NOTE_IS_TOO_LONG = "Броят байтове на бележката към плащането е твърде голям."
export const INSUFFICIENT_AVAILABLE_AMOUNT = "Исканата сума не е налична в сметката на платеца."
export const TIMEOUT = "Плащането е прекратено поради изтекъл срок."
export const NEWER_INTEREST_RATE = (
  "Плащането е прекратено, защото текущият лихвен процент по сметката е по-нов" +
  " от посоченото време за лихвения процент."
)

// Operational alerts:
export const OPERATION_REQUIRES_AUTHENTICATION = "Тази операция изисква оторизация. Ще бъдете пренасочени към страницата за вход."
export const PROBLEM_ON_THE_SERVER = "Възникна проблем със сървъра. Моля, опитайте отново по-късно."
export const NETWORK_PROBLEM = "Възникна мрежов проблем. Моля, проверете интернет връзката си."
export const SERVER_SYNC_ERROR = "Възникна проблем със сървъра."
export const UNEXPECTED_ERROR = "Опа! Нещо се обърка."
export const INVALID_SCANNED_COIN = (
  "Невалидна дигитална монета. "
  + "Уверете се, че сканирате правилния QR код "
  + "за съответната дигитална монета."
)
export const INVALID_PAYMENT_REQUEST = (
  "Невалидна покана за плащане. Уверете се, че сканирате правилния" +
  " QR код за съответната покана за плащане."
)
export const WRONG_PIN = (
  "Въведен е грешен ПИН код. "
  + "Имайте предвид, че разполагате с ограничен брой опити "
  + "да въведете правилния ПИН код, преди той да бъде блокиран."
)
export const COIN_FETCH_ERROR = (
  "Не може да бъде намерена необходимата "
  + "информация за валутата, определена от дигиталната монета. Това може да е "
  + "временен проблем или дигиталната монета не е настроена правилно."
)
export const CIRCULAR_PEG = (
  "Одобряването на този фиксиран курс не е възможно, "
  + "защото би създало циклична верига от фиксирани курсове."
)
export const PEG_DISPLAY_MISMATCH = (
  "Информацията, посочена от издателя "
  + "на валутата с фиксиран курс, не съответства на наличната информация "
  + "за опорната валута. Първо се уверете, че сте потвърдили последните "
  + "промени в опорната валута. След това можете да опитате да одобрите "
  + "фиксирания курс отново или да решите да не го одобрявате."
)
export const BUYING_IS_FORBIDDEN = (
  "Автоматичното купуване не е разрешено "
  + "за тази сметка. Това може да е само временно състояние, ако "
  + "сметката е открита съвсем наскоро или все още не сте потвърдили"
  + "последните промени по сметката."
)
export const ACCOUNT_DOES_NOT_EXIST = (
  "Нямате сметка в заявената валута."
)
export const ACCOUNT_CAN_NOT_MAKE_PAYMENTS = (
  "Имате сметка "
  + "в заявената валута, но извършването на плащания от тази сметка не е "
  + "разрешено. Това може да е само временно състояние, ако сметката е "
  + "открита съвсем наскоро."
)

// This message will be shown when the user wants to view the details of a
// payment (a transfer) that the user has made, but for some reason
// the payment do not exist.
export const PAYMENT_DOES_NOT_EXIST = "Заявената транзакция не съществува."

// Problems with handling "Actions":
export const CAN_NOT_PERFORM_ACTOIN = "Заявеното действие не може да бъде извършено."
export const ACTION_DOES_NOT_EXIST = "Заявеното действие не съществува."

// Generates a message to be shown in a tooltip. Change this function
// to return a translated string.
export function getTransferStatusDetails(t: any): string {
  const initiatedAt = new Date(t.initiatedAt).toLocaleString()
  if (t.result) {
    const finalizedAt = new Date(t.result.finalizedAt).toLocaleString()
    if (t.result.error) {
      const reason = getFailureReason(t.result.error.errorCode)
      return `Плащането е започнало на ${initiatedAt}`
        + ` и е завършило неуспешно на ${finalizedAt}.`
        + ` Причината за неуспеха е: "${reason}".`
    } else {
      const paymentRefernece = t.paymentInfo.payeeReference
      if (paymentRefernece) {
        const maxLength = 64
        const shortRef = paymentRefernece.length <= maxLength
          ? paymentRefernece
          : `${paymentRefernece.slice(0, maxLength)}...`
        return `Плащането е започнало на ${initiatedAt}`
          + ` и е завършило успешно на ${finalizedAt}.`
          + ` Идентификатор на плащането: "${shortRef}".`
      } else {
        return `Плащането е започнало на ${initiatedAt}`
          + ` и е завършило успешно на ${finalizedAt}.`
      }
    }
  }
  return `Плащането е започнало на ${initiatedAt}.`
}

function getFailureReason(errorCode: string): string {
  switch (errorCode) {
    case 'CANCELED_BY_THE_SENDER':
      return CANCELED_BY_THE_SENDER
    case 'SENDER_IS_UNREACHABLE':
      return SENDER_IS_UNREACHABLE
    case 'RECIPIENT_IS_UNREACHABLE':
      return RECIPIENT_IS_UNREACHABLE
    case 'RECIPIENT_SAME_AS_SENDER':
      return RECIPIENT_SAME_AS_SENDER
    case 'NO_RECIPIENT_CONFIRMATION':
      return NO_RECIPIENT_CONFIRMATION
    case 'TRANSFER_NOTE_IS_TOO_LONG':
      return TRANSFER_NOTE_IS_TOO_LONG
    case 'INSUFFICIENT_AVAILABLE_AMOUNT':
      return INSUFFICIENT_AVAILABLE_AMOUNT
    case 'TIMEOUT':
      return TIMEOUT
    case 'NEWER_INTEREST_RATE':
      return NEWER_INTEREST_RATE
    default:
      return errorCode
  }
}
