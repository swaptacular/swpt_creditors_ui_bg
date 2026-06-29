<script lang="ts">
  import type { AppState, CreateAccountModel, CreateAccountActionWithId, ApprovePegActionWithId } from '../app-state'
  import { HAS_NOT_CREATED_PEG_ACCOUNT } from '../app-state'
  import { limitAmountDivisor } from '../format-amounts'
  import Fab, { Label } from '@smui/fab'
  import Paper, { Title, Content } from '@smui/paper'
  import LayoutGrid, { Cell } from '@smui/layout-grid'
  import Textfield from '@smui/textfield'
  import TextfieldIcon from '@smui/textfield/icon'
  import HelperText from '@smui/textfield/helper-text/index'
  import FormField from '@smui/form-field'
  import Checkbox from '@smui/checkbox'
  import Button, { Label as ButtonLabel } from '@smui/button'
  import { Title as DialogTitle, Content as DialogContent, Actions, InitialFocus } from '@smui/dialog'
  import { amountToString } from '../format-amounts'
  import Page from './Page.svelte'
  import Dialog from './Dialog.svelte'
  import EnterPinDialog from './EnterPinDialog.svelte'
  import AccountInfo from './AccountInfo.svelte'

  export let app: AppState
  export let model: CreateAccountModel
  export const snackbarBottom: string = "84px"

  let shakingElement: HTMLElement
  let openEnterPinDialog = false
  let allowIntermediate = false
  let actionManager = app.createActionManager(model.action, createUpdatedAction)
  let confirmed = model.action.accountCreationState?.confirmed === true
  let debtorName = model.action.accountCreationState?.editedDebtorName ?? ''
  let uniqueDebtorName = isUniqueDebtorName(debtorName, model.action)
  let negligibleUnitAmount = formatAsUnitAmount(model.action.accountCreationState?.editedNegligibleAmount)
  let hasNotCreatedPegAccount = localStorage.getItem(HAS_NOT_CREATED_PEG_ACCOUNT) === 'true'
  let invalidDebtorName: boolean
  let invalidNegligibleUnitAmount: boolean

  function createUpdatedAction(): CreateAccountActionWithId | ApprovePegActionWithId {
    assert(data && action.accountCreationState)
    uniqueDebtorName = isUniqueDebtorName(debtorName, action)
    return {
      ...action,
      accountCreationState: {
        ...action.accountCreationState,
        confirmed,
        editedDebtorName: debtorName,
        editedNegligibleAmount: Math.max(0, Number(negligibleUnitAmount) || 0) * limitAmountDivisor(data.amountDivisor),
      },
    }
  }

  function formatAsUnitAmount(amount: bigint | number | undefined): string {
    if (amount === undefined) {
      return ''
    }
    return amountToString(
      amount,
      model.createAccountData?.amountDivisor ?? 1,
      model.createAccountData?.decimalPlaces ?? 0n,
    )
  }

  function getPeggedDebtorName(model: CreateAccountModel): string {
    let debtroName
    if (model.action.actionType !== 'CreateAccount') {
      debtroName = app.accountsMap.getAccountDisplay(model.action.accountUri)?.debtorName
    }
    return debtroName ?? ''
  }

  function shakeForm(): void {
    const shakingSuffix = ' shaking-block'
    const origClassName = shakingElement.className
    if (!origClassName.endsWith(shakingSuffix)) {
      shakingElement.className += shakingSuffix
      setTimeout(() => { shakingElement && (shakingElement.className = origClassName) }, 1000)
    }
  }

  function gotIt() {
    localStorage.setItem(HAS_NOT_CREATED_PEG_ACCOUNT, 'false')
    hasNotCreatedPegAccount = false
  }

  function retry(): void {
    app.startInteraction()
    model.reload()  
  }

  function cancel(): void {
    app.startInteraction()
    actionManager.remove()
  }

  function confirm(): void {
    app.startInteraction()
    allowIntermediate = true
    uniqueDebtorName = isUniqueDebtorName(debtorName, action)
    if (invalid) {
      shakeForm()
    } else {
      openEnterPinDialog = true
    }
  }

  function submit(pin: string): void {
    assert(data && action.accountCreationState)
    app.approveAccountCreationAction(actionManager, data, pin, isCreateAccountAction, model.goBack)
  }

  function isUniqueDebtorName(debtorName: string, action: CreateAccountActionWithId | ApprovePegActionWithId): boolean {
    const nameRegex = new RegExp(`^${debtorName}$`, 'us')
    const matchingAccounts = app.accountsMap.getAccountRecordsMatchingDebtorName(nameRegex)
    switch (matchingAccounts.length) {
    case 0:
      return true
    case 1:
      const debtorIdentityUri = action.actionType === 'CreateAccount'
        ? action.debtorIdentityUri
        : action.peg.debtorIdentity.uri
      return matchingAccounts[0].debtor.uri === debtorIdentityUri
    default:
      return false
    }
  }

  $: peggedDebtorName = getPeggedDebtorName(model)
  $: action = model.action
  $: isCreateAccountAction = action.actionType === 'CreateAccount'
  $: pageTitle = isCreateAccountAction ? 'Потвърждаване на сметка' : 'Откриване на сметка'
  $: data = model.createAccountData
  $: negligibleUnitAmountStep = formatAsUnitAmount(action.accountCreationState?.tinyNegligibleAmount)
  $: invalid = (
    invalidDebtorName ||
    !uniqueDebtorName ||
    invalidNegligibleUnitAmount ||
    (isCreateAccountAction && !confirmed)
  )
</script>

<style>
  ul {
    list-style: '\2713\00A0' outside;
    margin: 0.75em 1.25em 0 1.25em;
  }
  li {
    margin-top: 0.5em;
  }
  strong {
    font-size: 1.1em;
    font-weight: bold;
  }
  .amount {
    font-size: 1.05em;
  }
  .fab-container {
    margin: 16px 16px;
  }
  .shaking-container {
    position: relative;
    overflow: hidden;
  }
  .warning {
    margin-top: 16px;
  }
  .peg-definition {
    margin-bottom: 20px;
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
  {#if !(data && action.accountCreationState)}
    <Page title={pageTitle}>
      <svelte:fragment slot="content">
        <Paper style="margin: 36px 18px" elevation={8}>
          <Title>Неизвестна валута</Title>
          <Content>
            Не може да бъде намерена информация за дигиталната валута.
            Това е или временен проблем, или валутата не е
            конфигурирана правилно.
          </Content>
        </Paper>
      </svelte:fragment>

      <svelte:fragment slot="floating">
        <div class="fab-container">
          <Fab on:click={cancel} extended>
            <Label>Отмени</Label>
          </Fab>
        </div>
        <div class="fab-container">
          <Fab color="primary" on:click={retry} extended>
            <Label>Опитай пак</Label>
          </Fab>
        </div>
      </svelte:fragment>
    </Page>
  {:else}
    <Page title={pageTitle} hideFloating={openEnterPinDialog}>
      <svelte:fragment slot="content">
        {#if !isCreateAccountAction && hasNotCreatedPegAccount}
          <Dialog
            open
            scrimClickAction=""
            aria-labelledby="ack-peg-explanation-dialog-title"
            aria-describedby="ack-peg-explanation-dialog-content"
            >
            <DialogTitle>Какво е фиксиран курс на обмен?</DialogTitle>
            <DialogContent style="word-break: break-word">
              <p class="peg-definition">
                Фиксираният курс на обмен е обещание от издателя на
                валутата да поддържа
                <span style="font-weight: bold">
                  постоянен курс на обмен
                </span>
                между неговата валута (обвързаната валута) и друга
                валута (опорната валута).
              </p>
              <p>
                Издателят на валутата "{peggedDebtorName}" е обявил
                фиксиран курс на обмен с валутата
                "{data.debtorData.debtorName}". Преди да одобрите този
                фиксиран курс, първо трябва да си
                <span style="font-weight: bold">
                  откриете сметка към "{data.debtorData.debtorName}".
                </span>
              </p>
            </DialogContent>
            <Actions>
              <Button use={[InitialFocus]} on:click={gotIt}>
                <ButtonLabel>Разбрах</ButtonLabel>
              </Button>
            </Actions>
          </Dialog>
        {/if}

        <EnterPinDialog bind:open={openEnterPinDialog} performAction={submit} />

        <div bind:this={shakingElement}>
          <form
            noValidate
            autoComplete="off"
            on:input={() => actionManager.markDirty()}
            on:change={() => actionManager.save()}
            >
            <LayoutGrid>
              <Cell spanDevices={{ desktop: 12, tablet: 8, phone: 4 }}>
                <AccountInfo
                  homepage={data.debtorData.debtorHomepage?.uri}
                  summary={data.debtorData.summary}
                  >
                  <svelte:fragment slot="title">
                    {#if data.account.display.debtorName === undefined}
                      Сметка към "{data.debtorData.debtorName}"
                    {:else}
                      Съществуваща сметка към "{data.debtorData.debtorName}"
                    {/if}
                  </svelte:fragment>
                  <svelte:fragment slot="content">
                    <ul>
                      <li>
                        <em class="amount">
                          {formatAsUnitAmount(data.account.ledger.principal)}&nbsp;{data.unit}
                        </em>
                        са налични по вашата сметка.
                      </li>
                      {#if data.account.display.debtorName === undefined && data.debtorData.peg}
                        <li>
                          Тази валута е обвързана с друга валута.
                          По-късно ще бъдете помолени да одобрите
                          фиксирания курс, обявен от издателя на
                          валутата.
                        </li>
                      {/if}
                    </ul>
                    {#if isCreateAccountAction}
                      <p class="warning">
                        <strong>Забележка:</strong> Трябва да
                        поставите отметка в полето по-долу, за да
                        потвърдите, че сте сигурни кой е издателят на
                        тази валута. Рисковете тук са подобни на тези,
                        когато някой непознат ви представи
                        чуждестранна валута, която не познавате — може
                        да бъдете подведени от измамници!
                      </p>
                    {/if}
                  </svelte:fragment>
                </AccountInfo>
              </Cell>

              {#if isCreateAccountAction}
                <Cell spanDevices={{ desktop: 12, tablet: 8, phone: 4 }} style="margin: -10px 0 30px 0">
                  <FormField>
                    <Checkbox
                      bind:checked={confirmed}
                      on:click={() => allowIntermediate = false}
                      indeterminate={allowIntermediate && !confirmed}
                      />
                      <span slot="label">
                        Потвърждавам, че съм проверил кой е издателят
                        на тази валута.
                      </span>
                  </FormField>
                </Cell>
              {/if}

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
                  suffix="{data.unit.slice(0, 10)}"
                  >
                  <svelte:fragment slot="trailingIcon">
                    {#if invalidNegligibleUnitAmount}
                      <TextfieldIcon class="material-icons">error</TextfieldIcon>
                    {/if}
                  </svelte:fragment>
                  <HelperText style="word-break: break-word" slot="helper" persistent>
                    Сума, която считате за незначителна или маловажна.
                    Тя трябва да бъде равна или по-голяма от
                    {negligibleUnitAmountStep} {data.unit}.
                    {appConfig.siteTitle} ще използва тази сума, за да
                    прецени дали сметката може да бъде закрита и дали
                    дадено входящо плащане може да бъде пренебрегнато.
                    Ако не сте сигурни, оставете стойността по
                    подразбиране непроменена.
                  </HelperText>
                </Textfield>
              </Cell>
            </LayoutGrid>
          </form>
        </div>
      </svelte:fragment>

      <svelte:fragment slot="floating">
        <div class="fab-container">
          <Fab on:click={cancel} extended>
            <Label>Откажи</Label>
          </Fab>
        </div>
        <div class="fab-container">
          <Fab color="primary" on:click={confirm} extended>
            <Label>{isCreateAccountAction ? 'Потвърди' : 'Продължи'}</Label>
          </Fab>
        </div>
      </svelte:fragment>
    </Page>
  {/if}
</div>
