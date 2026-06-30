<script lang="ts">
  import type { AppState, ActionRecordWithId } from '../app-state'
  import { amountToLocaleString } from '../format-amounts'
  import { getContext } from 'svelte'
  import { fly, fade } from 'svelte/transition'
  import Button, { Label } from '@smui/button'
  import Card, { Content, Actions } from '@smui/card'

  const app: AppState = getContext('app')

  export let action: ActionRecordWithId
  export let show = () => { app.showAction(action.actionId) }
  export let color: string = 'primary'

  function activate(): void {
    app.startInteraction()
    show()
  }

  function getButtonLabel(action: ActionRecordWithId): string {
    switch (action.actionType) {
    case 'CreateTransfer':
      return 'Плати'
    case 'AbortTransfer':
      return action.transfer.result ? "Покажи неуспешното плащане" : "Покажи забавеното плащане"
    case 'CreateAccount':
      return 'Потвърди откриването на сметка'
    case "AckAccountInfo":
      return 'Покажи промените'
    case 'ApprovePeg':
      return 'Одобри фиксиран курс'
    case 'ApproveAmountDisplay':
      return 'Одобри начин на показване'
    case 'ApproveDebtorName':
      return 'Одобри име на валута'
    case 'ConfigAccount':
      return 'Управление на сметка'
    case 'UpdatePolicy':
      return 'Промени правилата'
    case 'PaymentRequest':
      return 'Получи плащане'
    default:
      return 'Неизвестен вид действие'
    }
  }

  function getDebtorName(accountUri: string): string | undefined {
    return app.accountsMap.getAccountDisplay(accountUri)?.debtorName
  }

  function removeEndingDot(s: string): string {
    const lastDotIndex = s.search(/\.\s*$/u)
    return lastDotIndex > 0 ? s.slice(0, lastDotIndex) : s
  }

  function getDescription(action: ActionRecordWithId): string {
    switch (action.actionType) {
      case "CreateTransfer": {
        const payeeName = action.paymentInfo.payeeName
        const amount = action.editedAmount
        const display = app.accountsMap.getAccountDisplay(action.accountUri)
        if (display) {
          const unit = display.unit
          const unitAmount = amountToLocaleString(amount, display.amountDivisor, display.decimalPlaces)
          return `Плати ${unitAmount} ${unit} на ${payeeName}.`
        } else {
          const unit = "\u00a4"
          const unitAmount = amountToLocaleString(amount, 1, 0n)
          return `Плати ${unitAmount} ${unit} на ${payeeName}.`
        }
      }
      case "AbortTransfer": {
        const transfer = action.transfer
        const title = transfer.result ? "Неуспешно плащане" : "Забавено плащане"
        const payeeName = transfer.paymentInfo.payeeName
        let amountDivisor = 1
        let decimalPlaces = 0n
        let unit = "\u00a4"
        if (action.accountUri !== undefined) {
          const display = app.accountsMap.getAccountDisplay(action.accountUri)
          if (display) {
            amountDivisor = display.amountDivisor
            decimalPlaces = display.decimalPlaces
            unit = display.unit ?? "\u00a4"
          }
        }
        const unitAmount = amountToLocaleString(transfer.amount, amountDivisor, decimalPlaces)
        return `${title}: ${unitAmount} ${unit} на ${payeeName}.`
      }
      case "CreateAccount": {
        const editedDebtorName = action.accountCreationState?.editedDebtorName
        const descripiton = editedDebtorName !== undefined
          ? `Потвърди откриването на сметка към „${editedDebtorName}“.`
          : "Открий нова сметка."
        return descripiton
      }
      case "AckAccountInfo": {
        const debtorName = getDebtorName(action.accountUri)
        const descripiton = debtorName
          ? `Има промени във валутата „${debtorName}“.`
          : 'Има промени в една от валутите.'
        return descripiton
      }
      case 'ApprovePeg': {
        const debtorName = getDebtorName(action.accountUri)
        const descripiton = debtorName
          ? `Одобри фиксиран курс на обмен между „${debtorName}“ и друга валута.`
          : 'Одобри фиксиран курс на обмен между две валути.'
        return descripiton
      }
      case 'ApproveAmountDisplay': {
        const debtorName = getDebtorName(action.accountUri)
        return debtorName ?
          `Одобри нов начин на показване на сумите във валутата „${debtorName}“.` :
          'Одобри нов начин на показване на суми.'
      }
      case 'ApproveDebtorName': {
        const debtorName = getDebtorName(action.accountUri)
        return debtorName ? `Одобри ново име на валутата „${debtorName}“.` : 'Одобри ново име на валута.'
      }
      case 'ConfigAccount': {
        const debtorName = getDebtorName(action.accountUri)
        return debtorName
          ? `Управление на сметката ми към „${debtorName}“.`
          : 'Управление на сметка.'
      }
      case 'UpdatePolicy': {
        const debtorName = getDebtorName(action.accountUri)
        return debtorName
          ? `Промяна на правилата за автоматична обмяна по сметката ми към „${debtorName}“.`
          : 'Промяна на правилата за автоматична обмяна по една от сметките.'
      }
      case 'PaymentRequest': {
        const debtorName = getDebtorName(action.accountUri)
        if (!debtorName) {
          return 'Получи плащане.'
        }
        if (action.sealedAt === undefined) {
          return `Получи плащане през „${debtorName}“.`
        } else {
          const n = 120  // number of characters to show from the payment note.
          const s = action.editedNote
          const nonemptyNote = /\S/u.test(s)
          const note = nonemptyNote
            ? (s.length <= n ? `: ${removeEndingDot(s)}` : `: ${s.slice(0, n)}..`)
            : `: ${action.sealedAt.toLocaleString('bg-BG')}`
          const display = app.accountsMap.getAccountDisplay(action.accountUri)
          if (action.editedAmount && display) {
            const unitAmount = amountToLocaleString(action.editedAmount, display.amountDivisor, display.decimalPlaces)
            return `Получи ${unitAmount} ${display.unit} през „${debtorName}“${note}.`
          } else {
            return `Получи плащане през „${debtorName}“${note}.`
          }
        }
      }
      default:
        return "Неизвестен вид действие"
    }
  }
</script>

<div in:fly|local="{{ x: -350, duration: 1000 }}" out:fade|local="{{ duration: 1000 }}">
  <Card>
    <Content style="word-break: break-word">{getDescription(action)}</Content>
    <Actions fullBleed>
      <Button {color} on:click={activate}>
        <Label>{getButtonLabel(action)}</Label>
        <i class="material-icons" aria-hidden="true">arrow_forward</i>
      </Button>
    </Actions>
  </Card>
</div>
