<script lang="ts">
  import type { AppState, ConfigAccountModel, ConfigAccountActionWithId } from '../app-state'
  import { amountToString, limitAmountDivisor, calcSmallestDisplayableNumber } from '../format-amounts'
  import Fab, { Label } from '@smui/fab'
  import LayoutGrid, { Cell } from '@smui/layout-grid'
  import Textfield from '@smui/textfield'
  import TextfieldIcon from '@smui/textfield/icon'
  import HelperText from '@smui/textfield/helper-text/index'
  import FormField from '@smui/form-field'
  import Checkbox from '@smui/checkbox'
  import Page from './Page.svelte'
  import EnterPinDialog from './EnterPinDialog.svelte'
  import AccountInfo from './AccountInfo.svelte'

  export let app: AppState
  export let model: ConfigAccountModel
  export const snackbarBottom: string = "84px"

  let shakingElement: HTMLElement
  let openEnterPinDialog = false
  let actionManager = app.createActionManager(model.action, createUpdatedAction)
  let debtorName = model.action.editedDebtorName
  let uniqueDebtorName = isUniqueDebtorName(debtorName, model.accountData.account.debtor.uri)
  let negligibleUnitAmount = formatAsUnitAmount(
    model.action.editedNegligibleAmount,
    model.accountData.display.amountDivisor,
    model.accountData.display.decimalPlaces,
  )
  let scheduledForDeletion = model.action.editedScheduledForDeletion
  let allowUnsafeDeletion = model.action.editedAllowUnsafeDeletion
  let preserveCurrentDisplay = !(model.nonstandardDisplay && model.action.approveNewDisplay)
  let invalidDebtorName: boolean
  let invalidNegligibleUnitAmount: boolean

  const CONFIRM_MESSAGE = 'Принудителното закриване на тази сметка ще доведе до загуба на оставащата сума по нея.'

  function createUpdatedAction(): ConfigAccountActionWithId {
    uniqueDebtorName = isUniqueDebtorName(debtorName, debtorIdentityUri)
    return {
      ...action,
      editedDebtorName: debtorName,
      editedNegligibleAmount: Math.max(0, Number(negligibleUnitAmount) || 0) * limitAmountDivisor(amountDivisor),
      editedScheduledForDeletion: scheduledForDeletion,
      editedAllowUnsafeDeletion: allowUnsafeDeletion,
      approveNewDisplay: !preserveCurrentDisplay,
    }
  }

  function formatAsUnitAmount(
    amount: bigint | number | undefined,
    amountDivisor: number,
    decimalPlaces: bigint,
  ): string {
    if (amount === undefined) {
      return ''
    }
    return amountToString(amount, amountDivisor, decimalPlaces)
  }

  function showActions(): void {
    app.showActions()
  }

  function shakeForm(): void {
    const shakingSuffix = ' shaking-block'
    const origClassName = shakingElement.className
    if (!origClassName.endsWith(shakingSuffix)) {
      shakingElement.className += shakingSuffix
      setTimeout(() => { shakingElement && (shakingElement.className = origClassName) }, 1000)
    }
  }

  function cancel(): void {
    app.startInteraction()
    actionManager.remove(model.backToAccount)
  }

  function modify(): void {
    app.startInteraction()
    uniqueDebtorName = isUniqueDebtorName(debtorName, debtorIdentityUri)
    if (invalid) {
      shakeForm()
    } else if (!allowUnsafeDeletion || (allowUnsafeDeletion = confirm(CONFIRM_MESSAGE))) {
      openEnterPinDialog = true
    }
  }

  function submit(pin: string): void {
    app.executeConfigAccountAction(actionManager, accountData, pin, model.backToAccount)
  }

  function isUniqueDebtorName(debtorName: string, debtorUri: string): boolean {
    const nameRegex = new RegExp(`^${debtorName}$`, 'us')
    const matchingAccounts = app.accountsMap.getAccountRecordsMatchingDebtorName(nameRegex)
    switch (matchingAccounts.length) {
    case 0:
      return true
    case 1:
      return matchingAccounts[0].debtor.uri === debtorUri
    default:
      return false
    }
  }

  $: action = model.action
  $: nonstandardDisplay = model.nonstandardDisplay
  $: accountData = model.accountData
  $: debtorData = accountData.debtorData
  $: pegBounds = accountData.pegBounds
  $: amount = accountData.amount
  $: debtorIdentityUri = accountData.account.debtor.uri
  $: display = accountData.display
  $: knownDebtor = display.knownDebtor
  $: amountDivisor = display.amountDivisor
  $: decimalPlaces = display.decimalPlaces
  $: unit = display.unit ?? '\u00A4'
  $: tinyNegligibleAmount = calcSmallestDisplayableNumber(amountDivisor, decimalPlaces)
  $: negligibleUnitAmountStep = formatAsUnitAmount(tinyNegligibleAmount, amountDivisor, decimalPlaces)
  $: disableForceDeletion = !allowUnsafeDeletion && !scheduledForDeletion
  $: invalid = (
    invalidDebtorName ||
    !uniqueDebtorName ||
    invalidNegligibleUnitAmount
  )
  $: if (!scheduledForDeletion && allowUnsafeDeletion) {
    allowUnsafeDeletion = false
  }
</script>

<style>
  .fab-container {
    margin: 16px 16px;
  }
  .shaking-container {
    position: relative;
    overflow: hidden;
  }
  .grayed {
    color: #888;
  }

  @keyframes shake {
    0% { transform: translate(1px, 1px) rotate(0deg); }
    10% { transform: translate(-1px, -2px) rotate(-1deg); }
    20% { transform: translate(-3px, 0px) rotate(1deg); }
    30% { transform: translate(3px, 2px) rotate(0deg); }
    40% { transform: translate(1px, -1px) rotate(1deg); }
    50% { transform: translate(-1px, 2px) rotate(-1deg); }
    60% { transform: translate(-3px, 1px) rotate(0deg); }
    70% { transform: translate(3px, 1px) rotate(-1deg); }
    80% { transform: translate(-1px, -1px) rotate(1deg); }
    90% { transform: translate(1px, 2px) rotate(0deg); }
    100% { transform: translate(1px, -2px) rotate(-1deg); }
  }

  :global(.shaking-block) {
    animation: shake 0.5s;
    animation-iteration-count: 1;
  }
</style>

<div class="shaking-container">
  <Page title="Управление на сметка" hideFloating={openEnterPinDialog}>
    <svelte:fragment slot="content">
      <EnterPinDialog bind:open={openEnterPinDialog} performAction={submit} />

      <div bind:this={shakingElement}>
        <form
          noValidate
          autoComplete="off"
          on:input={() => actionManager.markDirty()}
          on:input={() => model.goBack = showActions}
          on:change={() => actionManager.save()}
          >
          <LayoutGrid>
            <Cell spanDevices={{ desktop: 12, tablet: 8, phone: 4 }}>
              <AccountInfo
                homepage={debtorData.debtorHomepage?.uri}
                summary={debtorData.summary}
                {pegBounds}
                {amount}
                >
                <svelte:fragment slot="title">
                  {#if knownDebtor}
                    Сметка към "{display.debtorName}"
                  {:else}
                    Непотвърдена сметка към "{display.debtorName}"
                  {/if}
                </svelte:fragment>
              </AccountInfo>
            </Cell>

            <Cell spanDevices={{ desktop: 6, tablet: 4, phone: 4 }}>
              <Textfield
                required
                variant="outlined"
                style="width: 100%"
                input$maxlength="40"
                input$spellcheck="false"
                bind:invalid={invalidDebtorName}
                bind:value={debtorName}
                label="Име на валутата"
                >
                <svelte:fragment slot="trailingIcon">
                  {#if invalidDebtorName || !uniqueDebtorName}
                    <TextfieldIcon class="material-icons">error</TextfieldIcon>
                  {/if}
                </svelte:fragment>
                <HelperText slot="helper" persistent>
                  Всяка сметка трябва да има уникално име на валута.
                </HelperText>
              </Textfield>
            </Cell>

            <Cell spanDevices={{ desktop: 6, tablet: 4, phone: 4 }}>
              <Textfield
                required
                variant="outlined"
                type="number"
                input$min={negligibleUnitAmountStep}
                input$step={negligibleUnitAmountStep}
                style="width: 100%"
                withTrailingIcon={invalidNegligibleUnitAmount}
                bind:value={negligibleUnitAmount}
                bind:invalid={invalidNegligibleUnitAmount}
                label="Незначителна сума"
                suffix="{unit.slice(0, 10)}"
                >
                <svelte:fragment slot="trailingIcon">
                  {#if invalidNegligibleUnitAmount}
                    <TextfieldIcon class="material-icons">error</TextfieldIcon>
                  {/if}
                </svelte:fragment>
                <HelperText style="word-break: break-word" slot="helper" persistent>
                  Сума, която считате за незначителна или маловажна.
                  Тя трябва да бъде равна или по-голяма от
                  {negligibleUnitAmountStep} {unit}.
                  {appConfig.siteTitle} ще използва тази сума, за да
                  прецени дали сметката може да бъде закрита и дали
                  дадено входящо плащане може да бъде пренебрегнато. Ако не
                  сте сигурни, оставете стойността по подразбиране
                  непроменена.
                </HelperText>
              </Textfield>
            </Cell>

            {#if nonstandardDisplay}
              <Cell>
                <FormField>
                  <Checkbox bind:checked={preserveCurrentDisplay} />
                  <span slot="label">
                    Използвай нестандартен начин за показване на суми във валутата.
                  </span>
                </FormField>
              </Cell>
            {/if}

            <Cell>
              <FormField>
                <Checkbox bind:checked={scheduledForDeletion} />
                <span slot="label">
                  Определена за закриване: Сметката не може да
                  получава плащания и, освен ако валутата не се
                  използва като опорната валута, сметката ще бъде
                  закрита известно време след като оставащата сума по
                  нея стане незначителна.
                </span>
              </FormField>
            </Cell>

            <Cell>
              <FormField>
                <Checkbox bind:checked={allowUnsafeDeletion} disabled={disableForceDeletion} />
                <span slot="label" class:grayed={disableForceDeletion}>
                  Принудително закриване на сметката: Сметката ще бъде
                  закрита независимо от оставащата сума по нея.
                  Бъдете изключително внимателни!
                </span>
              </FormField>
            </Cell>
          </LayoutGrid>
        </form>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="floating">
      <div class="fab-container">
        <Fab on:click={cancel} extended>
          <Label>Отмени</Label>
        </Fab>
      </div>
      <div class="fab-container">
        <Fab color="primary" on:click={modify} extended>
          <Label>Запиши</Label>
        </Fab>
      </div>
    </svelte:fragment>
  </Page>
</div>
