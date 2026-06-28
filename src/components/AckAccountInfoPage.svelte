<script lang="ts">
  import type { AppState, AckAccountInfoModel } from '../app-state'
  import { Title as DialogTitle, Content as DialogContent, Actions, InitialFocus } from '@smui/dialog'
  import Button, { Label } from '@smui/button'
  import LayoutGrid, { Cell } from '@smui/layout-grid'
  import Fab, { Label as FabLabel } from '@smui/fab'
  import Paper, { Title, Content } from '@smui/paper'
  import Page from './Page.svelte'
  import Dialog from './Dialog.svelte'
  import EnterPinDialog from './EnterPinDialog.svelte'
  import LinkPopup from './LinkPopup.svelte'

  export let app: AppState
  export let model: AckAccountInfoModel
  export const snackbarBottom: string = "84px"

  assert(model.account.display.debtorName !== undefined)

  let showSummary: boolean = false
  let showLink: boolean = false
  let openEnterPinDialog: boolean = false

  function acknowlege(): void {
    app.startInteraction()
    const previousPegMustBeRemoved = action.previousPeg !== undefined && action.changes.pegParams
    if (previousPegMustBeRemoved) {
      openEnterPinDialog = true
    } else {
      submit()
    }
  }

  function submit(pinForPegRemoval?: string): void {
    app.acknowlegeAckAccountInfoAction(action, model.account, pinForPegRemoval, model.goBack)
  }

  $: action = model.action
  $: knownDebtor = model.account.display.knownDebtor
  $: debtorName = model.account.display.debtorName
  $: changes = action.changes
  $: debtorData = action.debtorData
  $: interestRateChangeDate = new Date(action.interestRateChangedAt).toLocaleDateString()
  $: interestRate = action.interestRate.toFixed(3)
  $: configError = action.configError
</script>

<style>
  .fab-container {
    margin: 16px 16px;
  }
  ul {
    list-style: square outside;
    margin: 0.75em 1.25em 0 1.25em;
  }
  li {
    margin-top: 0.5em;
  }
</style>

<Page title="Преглед на промените" hideFloating={openEnterPinDialog}>
  <svelte:fragment slot="content">
    <EnterPinDialog bind:open={openEnterPinDialog} performAction={submit} />

    {#if showSummary}
      <Dialog
        open
        aria-labelledby="show-summary-dialog-title"
        aria-describedby="show-summary-dialog-content"
        on:MDCDialog:closed={() => showSummary = false}
        >
        <DialogTitle>Новото описание на валутата:</DialogTitle>
        <DialogContent style="word-break: break-word">{debtorData.summary}</DialogContent>
        <Actions>
          <Button>
            <Label>Затвори</Label>
          </Button>
        </Actions>
      </Dialog>
    {/if}

    {#if showLink}
      <Dialog
        open
        aria-labelledby="show-link-dialog-title"
        aria-describedby="show-link-dialog-content"
        on:MDCDialog:closed={() => showLink = false}
        >
        <DialogTitle>Връзката в новата дигитална монета:</DialogTitle>
        <DialogContent style="word-break: break-word">
          <a href="{debtorData.latestDebtorInfo.uri}" target="_blank" rel="noreferrer">{debtorData.latestDebtorInfo.uri}</a>
        </DialogContent>
        <Actions>
          <Button use={[InitialFocus]}>
            <Label>Затвори</Label>
          </Button>
        </Actions>
      </Dialog>
    {/if}

    <div class="text-container">
      <LayoutGrid>
        <Cell spanDevices={{ desktop: 12, tablet: 8, phone: 4 }}>
          <Paper style="margin-top: 12px; margin-bottom: 24px; word-break: break-word" elevation={6}>
            <Title>
              Промени в "{debtorName}"
              {#if !knownDebtor}
                (непотвърдена сметка)
              {/if}
            </Title>
            <Content>
              <ul>
                {#if changes.configError}
                  <li>
                    {#if configError === undefined}
                      Съществуващият проблем с конфигурацията на сметката
                      е отстранен. Сега сметката е конфигурирана
                      правилно.
                    {:else if configError === 'NO_CONNECTION_TO_DEBTOR'}
                      Не може да се осъществи връзка със сървърите,
                      които управляват тази валута. Няма да можете да
                      изпращате или получавате пари от тази сметка, но
                      ще можете да фиксирате други валути към нея.
                    {:else if configError === 'CONFIGURATION_IS_NOT_EFFECTUAL'}
                      Възникна проблем с конфигурацията на сметката.
                      Обикновено това означава, че временно не може да
                      се осъществи връзка със сървърите, които
                      управляват тази валута.
                    {:else}
                      Възникна проблем с конфигурацията на сметката: {configError}.
                    {/if}
                  </li>
                {/if}

                {#if changes.amountDivisor || changes.decimalPlaces || changes.unit}
                  <li>
                    Издателят е определил нов начин за показване на
                    сумите във валутата. По-късно ще можете да
                    потвърдите тази важна промяна.
                  </li>
                {/if}

                {#if changes.debtorName}
                  <li>
                    Официалното име на валутата е променено на
                    "{debtorData.debtorName}". По-късно ще можете да
                    потвърдите тази важна промяна.
                  </li>
                {/if}

                {#if changes.pegParams || changes.pegDebtorInfoUri}
                  <li>
                    {#if debtorData.peg}
                      {#if action.previousPeg}
                        {#if !changes.pegParams}
                          Издателят е посочил различна дигитална
                          монета за базовата валута на обявения
                          фиксиран курс. При необходимост по-късно ще
                          можете да потвърдите тази промяна.
                        {:else}
                          Издателят на валутата е обявил нов, различен
                          фиксиран курс. По-късно ще можете да
                          потвърдите новия фиксиран курс.
                        {/if}
                      {:else}
                        Издателят е обявил фиксиран курс на обмен
                        между своята валута и друга валута. По-късно
                        ще можете да потвърдите този фиксиран курс.
                      {/if}
                    {:else}
                      Предишният фиксиран курс е премахнат.
                    {/if}
                  </li>
                {/if}

                {#if changes.interestRate}
                  <li>
                    На {interestRateChangeDate} издателят е променил
                    годишния лихвен процент по сметката ви. Новият
                    лихвен процент е {interestRate}%.
                  </li>
                {/if}

                {#if changes.debtorHomepage}
                  <li>
                    {#if debtorData.debtorHomepage}
                      Уебсайтът на валутата е <a href="{debtorData.debtorHomepage.uri}" target="_blank" rel="noreferrer">променен</a>.
                    {:else}
                      Уебсайтът на валутата е променен.
                    {/if}
                  </li>
                {/if}

                {#if changes.summary}
                  <li>
                    {#if debtorData.summary}
                      Описанието на валутата, предоставено от издателя,
                      е <a href="." target="_blank" on:click|preventDefault={() => showSummary = true}>обновено</a>.
                    {:else}
                      Описанието на валутата, предоставено от издателя, е премахнато.
                    {/if}
                    {#if debtorData.debtorHomepage}
                      Повече информация може да намерите на <a href="{debtorData.debtorHomepage.uri}" target="_blank" rel="noreferrer">уебсайта</a>.
                    {/if}
                  </li>
                {/if}

                {#if changes.latestDebtorInfo}
                  <li>
                    Дигиталната монета на валутата е променена. Новата
                    дигитална монета съдържа
                    различна <LinkPopup bind:show={showLink}>връзка</LinkPopup>.
                  </li>
                {/if}

                {#if changes.otherChanges}
                  <li>
                    Променени са някои маловажни технически
                    подробности в описанието на валутата.
                  </li>
                {/if}
              </ul>
            </Content>
          </Paper>
        </Cell>
      </LayoutGrid>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="floating">
    <div class="fab-container">
      <Fab color="primary" on:click={acknowlege} extended>
        <FabLabel>Разбрах</FabLabel>
      </Fab>
    </div>
  </svelte:fragment>
</Page>
