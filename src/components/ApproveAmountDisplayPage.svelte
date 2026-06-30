<script lang="ts">
  import type { AppState, ApproveAmountDisplayModel, ApproveAmountDisplayActionWithId } from '../app-state'
  import { limitAmountDivisor, amountToString } from '../format-amounts'
  import Fab, { Label } from '@smui/fab'
  import Paper, { Title, Content } from '@smui/paper'
  import LayoutGrid, { Cell } from '@smui/layout-grid'
  import Textfield from '@smui/textfield'
  import TextfieldIcon from '@smui/textfield/icon'
  import HelperText from '@smui/textfield/helper-text/index'
  import Radio from '@smui/radio'
  import FormField from '@smui/form-field'
  import Page from './Page.svelte'
  import EnterPinDialog from './EnterPinDialog.svelte'

  export let app: AppState
  export let model: ApproveAmountDisplayModel
  export const snackbarBottom: string = "84px"

  assert(model.display.debtorName !== undefined)

  let actionManager = app.createActionManager(model.action, createUpdatedAction)
  let shakingElement: HTMLElement
  let openEnterPinDialog = false
  let negligibleUnitAmount = formatAsUnitAmount(model.action.state?.editedNegligibleAmount)
  let approved: 'yes' | 'no' = model.action.state?.approved ?? 'no'
  let invalidNegligibleUnitAmount: boolean

  function createUpdatedAction(): ApproveAmountDisplayActionWithId {
    assert(action.state)
    return {
      ...action,
      state: {
        ...action.state,
        editedNegligibleAmount: Math.max(0, Number(negligibleUnitAmount) || 0) * limitAmountDivisor(action.amountDivisor),
        approved,
      },
    }
  }

  function formatAsUnitAmount(amount: bigint | number | undefined): string {
    if (amount === undefined) {
      return ''
    }
    return amountToString(amount, model.action.amountDivisor, model.action.decimalPlaces)
  }

  function shakeForm(): void {
    const shakingSuffix = ' shaking-block'
    const origClassName = shakingElement.className
    if (!origClassName.endsWith(shakingSuffix)) {
      shakingElement.className += shakingSuffix
      setTimeout(() => { shakingElement && (shakingElement.className = origClassName) }, 1000)
    }
  }

  function confirm(): void {
    app.startInteraction()
    if (invalid) {
      shakeForm()
    } else if (approved === 'no') {
      actionManager.remove()
    } else {
      openEnterPinDialog = true
    }
  }

  function submit(pin: string): void {
    app.resolveApproveAmountDisplayAction(actionManager, model.display.latestUpdateId, pin, model.goBack)
  }

  $: action = model.action
  $: knownDebtor = model.display.knownDebtor
  $: debtorName = model.display.debtorName ?? ''
  $: negligibleUnitAmountStep = formatAsUnitAmount(action.state?.tinyNegligibleAmount)
  $: oldAmountString = amountToString(model.availableAmount, model.display.amountDivisor, model.display.decimalPlaces)
  $: oldUnitAmount = oldAmountString + ' ' + model.display.unit
  $: newAmountString = amountToString(model.availableAmount, action.amountDivisor, action.decimalPlaces)
  $: newUnitAmount = newAmountString + ' ' + action.unit
  $: invalid = approved === 'yes' && invalidNegligibleUnitAmount
</script>

<style>
  .fab-container {
    margin: 16px 16px;
  }
  .shaking-container {
    position: relative;
    overflow: hidden;
  }
  .radio-group > :global(*) {
    margin: 0 0.2em;
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
  <Page title="Одобри показване" hideFloating={openEnterPinDialog}>
    <svelte:fragment slot="content">
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
              <Paper style="margin-top: 12px; margin-bottom: 24px; word-break: break-word" elevation={6}>
                <Title>
                  Начин на показване
                </Title>
                <Content>
                  „{debtorName}“
                  {#if !knownDebtor}
                    (непотвърдена сметка)
                  {/if}
                  е променил начина, по който се показват сумите във
                  валутата. Ако изберете да използвате новия начин за
                  показване на сумите, {oldUnitAmount}, които имате по
                  сметката си, в бъдеще ще се показват като
                  {newUnitAmount}. Ако не сте сигурни, използвайте
                  новия начин.
                </Content>
              </Paper>
            </Cell>

            <Cell spanDevices={{ desktop: 6, tablet: 4, phone: 4 }}>
              <div class="radio-group" style="margin-bottom: 8px; word-break: break-word">
                <FormField>
                  <Radio bind:group={approved} value="yes" touch />
                    <span slot="label">Използвай новия начин ({newUnitAmount})</span>
                </FormField>
                <FormField>
                  <Radio bind:group={approved} value="no" touch />
                    <span slot="label">Използвай стария начин ({oldUnitAmount})</span>
                </FormField>
              </div>
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
                suffix="{action.unit.slice(0, 10)}"
                disabled={approved === 'no'}
                >
                <svelte:fragment slot="trailingIcon">
                  {#if invalidNegligibleUnitAmount}
                    <TextfieldIcon class="material-icons">error</TextfieldIcon>
                  {/if}
                </svelte:fragment>
                <HelperText style="word-break: break-word" slot="helper" persistent>
                  Сума, която считате за незначителна или маловажна.
                  Тя трябва да бъде равна или по-голяма от
                  {negligibleUnitAmountStep} {action.unit}.
                  {appConfig.siteTitle} ще използва тази сума, за да
                  прецени дали сметката може да бъде закрита и дали
                  дадено входящо плащане може да бъде пренебрегнато. Ако не
                  сте сигурни, оставете стойността по подразбиране
                  непроменена.
                </HelperText>
              </Textfield>
            </Cell>
          </LayoutGrid>
        </form>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="floating">
      <div class="fab-container">
        <Fab color="primary" on:click={confirm} extended>
          <Label>Одобри</Label>
        </Fab>
      </div>
    </svelte:fragment>
  </Page>
</div>
