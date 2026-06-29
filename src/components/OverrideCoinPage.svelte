<script lang="ts">
  import type { AppState, OverrideCoinModel, ApprovePegActionWithId } from '../app-state'
  import Fab, { Label } from '@smui/fab'
  import Paper, { Title, Content } from '@smui/paper'
  import LayoutGrid, { Cell } from '@smui/layout-grid'
  import Radio from '@smui/radio'
  import Button, { Label as ButtonLabel } from '@smui/button'
  import FormField from '@smui/form-field'
  import { Title as DialogTitle, Content as DialogContent, Actions } from '@smui/dialog'
  import Dialog from './Dialog.svelte'
  import Page from './Page.svelte'
  import LinkPopup from './LinkPopup.svelte'

  export let app: AppState
  export let model: OverrideCoinModel
  export const snackbarBottom: string = "84px"

  let shakingElement: HTMLElement
  let showKnownCoinList = false
  let showNewCoinList = false
  let actionManager = app.createActionManager(model.action, createUpdatedAction)
  let replace: 'yes' | 'no' = model.action.editedReplaceCoin ? 'yes' : 'no'

  function createUpdatedAction(): ApprovePegActionWithId {
    return {
      ...action,
      editedReplaceCoin,
    }
  }

  function shakeForm(): void {
    const shakingSuffix = ' shaking-block'
    const origClassName = shakingElement.className
    if (!origClassName.endsWith(shakingSuffix)) {
      shakingElement.className += shakingSuffix
      setTimeout(() => { shakingElement && (shakingElement.className = origClassName) }, 1000)
    }
  }

  function submit(): void {
    app.startInteraction()
    if (editedReplaceCoin === undefined) {
      shakeForm()
    } else {
      app.resolveCoinConflict(actionManager, editedReplaceCoin, pegAccount.uri)
    }
  }

  $: action = model.action
  $: editedReplaceCoin = replace === 'yes' || (replace === 'no' ? false : undefined)
  $: peggedDisplay = model.peggedAccountDisplay
  $: peggedDebtorName = peggedDisplay.debtorName
  $: peggedKnownDebtor = peggedDisplay.knownDebtor
  $: pegAccount = model.createAccountData.account
  $: pegDebtorName = pegAccount.display.debtorName
  $: knownCoinList = app.accountsMap.getDebtorNamesSuggestingGivenCoin(
    pegAccount.uri,
    model.createAccountData.debtorData.latestDebtorInfo.uri,
  )
  $: newCoinList = app.accountsMap.getDebtorNamesSuggestingGivenCoin(
    pegAccount.uri,
    action.peg.latestDebtorInfo.uri,
  )
</script>

<style>
  .checklist {
    list-style: disc outside;
    margin: 0.75em 1.25em 0 16px;
  }
  .checklist li {
    margin-top: 0.5em;
  }
  .currency-list {
    list-style: square outside;
    margin: 0.75em 1.25em 0 1.25em;
  }
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
  <Page title="Разреши конфликт">
    <svelte:fragment slot="content">
      {#if showKnownCoinList}
        <Dialog
          open
          aria-labelledby="show-known-currencies-dialog-title"
          aria-describedby="show-known-currencies-dialog-content"
          on:MDCDialog:closed={() => showKnownCoinList = false}
          >
          <DialogTitle>Валути, използващи вече познатата дигитална монета:</DialogTitle>
          <DialogContent style="word-break: break-word">
            <ul class="currency-list">
              {#each knownCoinList as currencyName }
                <li>{currencyName}</li>
              {/each}
            </ul>
          </DialogContent>
          <Actions>
            <Button>
              <ButtonLabel>Затвори</ButtonLabel>
            </Button>
          </Actions>
        </Dialog>
      {/if}

      {#if showNewCoinList}
        <Dialog
          open
          aria-labelledby="show-new-currencies-dialog-title"
          aria-describedby="show-new-currencies-dialog-content"
          on:MDCDialog:closed={() => showNewCoinList = false}
          >
          <DialogTitle>Валути, които посочват същата дигитална монета като "{peggedDebtorName}":</DialogTitle>
          <DialogContent style="word-break: break-word">
            <ul class="currency-list">
              {#each newCoinList as currencyName }
                <li>{currencyName}</li>
              {/each}
            </ul>
          </DialogContent>
          <Actions>
            <Button>
              <ButtonLabel>Затвори</ButtonLabel>
            </Button>
          </Actions>
        </Dialog>
      {/if}

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
                  Конфликт между дигитални монети
                </Title>
                <Content>
                  <p>
                    "{peggedDebtorName}"
                    {#if !peggedKnownDebtor}
                      (непотвърдена сметка)
                    {/if}
                    е обявил фиксиран курс на обмен с
                    "{pegDebtorName}". Проблемът е, че дигиталната
                    монета, обявена за "{pegDebtorName}", не съвпада с
                    вече познатата монета, асоциирана с него.
                  </p>
                    <ul class="checklist">
                      <li>
                        {#if knownCoinList.length === 0}
                          Вече познатата монета не се използва от други обвързани валути.
                        {:else if knownCoinList.length === 1}
                          <LinkPopup bind:show={showKnownCoinList}>1 обвързана валута</LinkPopup>
                          използва вече познатата монета.
                        {:else}
                          <LinkPopup bind:show={showKnownCoinList}>{knownCoinList.length} обвързани валути</LinkPopup>
                          използват вече познатата монета.
                        {/if}
                      </li>
                      {#if newCoinList.length > 0}
                        <li>
                          {#if newCoinList.length === 1}
                            <LinkPopup bind:show={showNewCoinList}>1 обвързана валута</LinkPopup>
                            посочва същата монета като "{peggedDebtorName}".
                          {:else}
                            <LinkPopup bind:show={showNewCoinList}>{newCoinList.length} обвързани валути</LinkPopup>
                            посочват същата монета като "{peggedDebtorName}".
                          {/if}
                        </li>
                      {/if}
                    </ul>
                </Content>
              </Paper>
            </Cell>

            <Cell spanDevices={{ desktop: 6, tablet: 4, phone: 4 }}>
              <div class="radio-group" style="margin-top: -10px; word-break: break-word">
                <FormField>
                  <Radio bind:group={replace} value="no" touch />
                  <span slot="label">Използвай вече познатата монета.</span>
                </FormField>
                <FormField>
                  <Radio bind:group={replace} value="yes" touch />
                  <span slot="label">
                    Изглежда, че познатата монета е остаряла или
                    невалидна. Замени я с монетата, която
                    "{peggedDebtorName}" обявява.
                  </span>
                </FormField>
              </div>
            </Cell>
          </LayoutGrid>
        </form>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="floating">
      <div class="fab-container">
        <Fab color="primary" on:click={submit} extended>
          <Label>Потвърди</Label>
        </Fab>
      </div>
    </svelte:fragment>
  </Page>
</div>
