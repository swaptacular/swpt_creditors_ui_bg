<script lang="ts">
  import type { AppState, AccountModel } from '../app-state'
  import { fade } from 'svelte/transition'
  import { IS_A_NEWBIE_KEY } from '../app-state'
  import { amountToString } from '../format-amounts'
  import { Alert } from '../app-state'
  import Paper, { Title, Content } from '@smui/paper'
  import { Row } from '@smui/top-app-bar'
  import Fab, { Icon } from '@smui/fab'
  import Slider from '@smui/slider'
  import FormField from '@smui/form-field'
  import LayoutGrid, { Cell } from '@smui/layout-grid'
  import Card, { PrimaryAction, Content as CardContent } from '@smui/card'
  import IconButton from '@smui/icon-button'
  import Page from './Page.svelte'
  import QrGenerator from './QrGenerator.svelte'
  import CommittedTransferCard from './CommittedTransferCard.svelte'
  import ExchangeSvgIcon from './ExchangeSvgIcon.svelte'
  import AccountInfo from './AccountInfo.svelte'
  import { Title as DialogTitle, Content as DialogContent, Actions, InitialFocus } from '@smui/dialog'
  import Button, { Label as ButtonLabel } from '@smui/button'
  import Dialog from './Dialog.svelte'

  export let app: AppState
  export let model: AccountModel
  export const snackbarBottom: string = '84px'

  const scrollElement = document.documentElement
  let isANewbie = localStorage.getItem(IS_A_NEWBIE_KEY) === 'true'
  let downloadLinkElement: HTMLAnchorElement
  let dataUrl: string
  let duration = 0
  let showLoadedTranfersButton = true
  let tab = model.tab
  let transfers = [...model.transfers]
  let sortRank = model.sortRank
  let saveSortRankPromise: Promise<number> | undefined

  async function saveSortRank(): Promise<void> {
    const save = async () => {
      const rank = sortRank
      await app.setAccountSortPriority(accountUri, rank)
      saveSortRankPromise = undefined

      // An ugly hack: By modifying model's `goBack` property, we
      // ensure that the account list will be reloaded when the user
      // hits the back button. (The original `goBack` function would
      // show the unmodified account list.)
      var m = model
      m.goBack = () => { app.showAccounts() }
      return rank
    }
    if (saveSortRankPromise) {
      saveSortRankPromise = saveSortRankPromise.then(r => r === sortRank ? r: save())
    } else {
      saveSortRankPromise = save()
    }
  }

  async function loadTransfers(): Promise<void> {
    app.startInteraction()
    if (showLoadedTranfersButton) {
      showLoadedTranfersButton = false
      const newBatch = await model.fetchTransfers()
      if (newBatch === undefined) {
        showLoadedTranfersButton = true
      } else if (newBatch.length > 0) {
        transfers.push(...newBatch)
        transfers = transfers
        showLoadedTranfersButton = true
      }
    }
  }

  function createUpdatedModel(): AccountModel {
    return {
      ...model,
      transfers,
      sortRank,
      tab,
      scrollTop: scrollElement.scrollTop,
      scrollLeft: scrollElement.scrollLeft,
    }
  }

  function showActions(): void {
    app.startInteraction()
    app.scheduleUpdate()
    app.showActions()
  }

  function showLedgerEntry(accountUri: string, entryId: bigint): void {
    const m = createUpdatedModel()
    app.showLedgerEntry(accountUri, entryId, () => app.pageModel.set(m))
  }

  function showAccount(uri: string): void {
    const m = createUpdatedModel()
    app.showAccount(uri, () => app.pageModel.set(m))
  }

  function showThisAccount(): void {
    app.showAccount(accountUri)
  }

  function createConfigAccountAction(): void {
    app.startInteraction()
    app.createConfigAccountAction(accountUri, showThisAccount)
  }

  function createUpdatePolicyAction(): void {
    app.startInteraction()
    app.createUpdatePolicyAction(accountUri, showThisAccount)
  }

  function changeTab(t: AccountModel['tab']): void {
    app.startInteraction()
    duration = 350
    tab = t
  }

  function receipt():void {
    app.startInteraction()
    if (!(
      secureCoin &&
      !scheduledForDeletion &&
      data.info.identity &&
      data.info.noteMaxBytes >= 150n
    )) {
      app.addAlert(new Alert(
        'Получаването на плащания по тази сметка не е разрешено. '
          + 'Това може да е само временно състояние, ако '
          + 'сметката е открита съвсем наскоро или все още не сте потвърдили '
          + 'последните промени по сметката.',
        { continue: showActions },
      ))
    } else {
      app.createPaymentRequestAction(accountUri, showThisAccount)
    }
  }

  function gotIt() {
    localStorage.setItem(IS_A_NEWBIE_KEY, 'false')
    isANewbie = false
  }

  $: if (sortRank !== model.sortRank) {
    saveSortRank()
  }
  $: data = model.accountData
  $: secureCoin = data.secureCoin
  $: accountUri = data.account.uri
  $: display = data.display
  $: knownDebtor = display.knownDebtor
  $: amountDivisor = display.amountDivisor
  $: decimalPlaces = display.decimalPlaces
  $: unit = display.unit ?? '\u00A4'
  $: unitAbbr = unit.slice(0, 10)
  $: exchange = data.exchange
  $: minPrincipalUnitAmount = amountToString(exchange.minPrincipal, amountDivisor, decimalPlaces)
  $: maxPrincipalUnitAmount = amountToString(exchange.maxPrincipal, amountDivisor, decimalPlaces)
  $: info = data.info
  $: interestRate = info.interestRate
  $: configError = info.configError
  $: config = data.config
  $: scheduledForDeletion = config.scheduledForDeletion
  $: debtorData = data.debtorData
  $: homepageUri = debtorData.debtorHomepage?.uri
  $: pegBounds = data.pegBounds
  $: amount = data.amount
  $: debtorName = display.debtorName
  $: digitalCoin = `${debtorData.latestDebtorInfo.uri}#${data.account.debtor.uri}`
</script>

<style>
  ul {
    list-style: disc outside;
    margin: 0.75em 0 0.75em 16px;
  }
  li {
    margin-top: 0.2em;
  }
  .button-help {
    margin-top: 1em;
  }
  .download-link {
    display: none;
  }
  .qrcode-container {
    width: 100%;
    text-align: center;
  }
  .qrcode-container :global(canvas) {
    width: 100%;
    max-width: 66vh;
  }
  .text-container {
    display: flex;
    width: 100%;
    justify-content: center;
  }
  .no-transfers {
    margin: 36px 18px 26px 18px;
    text-align: center;
    color: #c4c4c4;
  }
  .load-button {
    color: rgb(98, 0, 238);
    letter-spacing: 1.4px;
    font-family: Roboto, sans-serif;
    font-weight: 500%;
    display: flex;
    align-items: center;
    text-transform: uppercase;
  }
  .load-button span {
    flex-grow: 1;
  }
  .buttons-box {
    width: 100%;
    height: 100%;
    color: black;
    background-color: #f4f4f4;
    border-bottom: 1px solid #ccc;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .icon-container {
    width: 100%;
    flex-grow: 1;
    text-align: center;
  }
  .empty-space {
    height: 56px;
  }
  .fab-container {
    margin: 16px 16px;
  }
</style>

<Page title="{debtorName}" scrollTop={model.scrollTop} scrollLeft={model.scrollLeft}>
  <svelte:fragment slot="app-bar">
    <Row style="height: 56px">
      <div class="buttons-box">
        <div class="icon-container">
          <IconButton class="material-icons" on:click={() => changeTab('account')}>
            account_balance
          </IconButton>
        </div>
        {#if secureCoin}
          <div class="icon-container">
            <IconButton class="material-icons" on:click={() => changeTab('coin')}>
              qr_code_2
            </IconButton>
          </div>
        {/if}
        <div class="icon-container">
          <IconButton class="material-icons" on:click={() => changeTab('sort')}>
            sort
          </IconButton>
        </div>
        <div class="icon-container">
          <IconButton class="material-icons" on:click={() => changeTab('ledger')}>
            history
          </IconButton>
        </div>
      </div>
    </Row>
  </svelte:fragment>

  <svelte:fragment slot="content">
    <div class="empty-space"></div>

    {#if tab === 'account'}
      {#if isANewbie}
        <Dialog
          open
          scrimClickAction=""
          aria-labelledby="ack-payment-help-dialog-title"
          aria-describedby="ack-payment-help-dialog-content"
          >
          <DialogTitle>Успешно открихте сметка към "{debtorName}".</DialogTitle>
          <DialogContent style="word-break: break-word">
            <p>
              Моля, погледнете реда от бутони в долната част на
              екрана.
            </p>
            <p class="button-help">
              Използвайте
              <Fab color="primary" style="vertical-align: middle">
                <Icon class="material-icons">receipt</Icon>
              </Fab>
              за да направите покана за плащане.
            </p>
            <p class="button-help">
              Използвайте
              <Fab style="vertical-align: middle">
                <ExchangeSvgIcon />
              </Fab>
              за да настоите автоматичната обмяна на валути.
            </p>
          </DialogContent>
          <Actions>
            <Button use={[InitialFocus]} on:click={gotIt}>
              <ButtonLabel>Разбрах</ButtonLabel>
            </Button>
          </Actions>
        </Dialog>
      {/if}

      <div in:fade="{{ duration }}">
        <AccountInfo
          homepage={homepageUri}
          summary={debtorData.summary}
          {pegBounds}
          {amount}
          {showAccount}
          elevation={12}
          style="margin: 24px 18px; word-break: break-word"
          >
          <svelte:fragment slot="title">
            {#if knownDebtor}
              Сметка към "{debtorName}"
            {:else}
              Непотвърдена сметка към "{debtorName}"
            {/if}
          </svelte:fragment>

          <svelte:fragment slot="important">
            <ul>
              <li>
                Годишният лихвен процент по тази сметка е
                {#if interestRate === 0}
                  0%.
                {:else}
                  {interestRate.toFixed(3)}%.
                {/if}
              </li>
              {#if scheduledForDeletion}
                <li>
                  Тази сметка ще бъде закрита.
                </li>
              {:else if exchange.policy !== undefined}
                <li>
                  Искам наличната сума да бъде
                  {#if minPrincipalUnitAmount === maxPrincipalUnitAmount}
                    възможно най-близо до {maxPrincipalUnitAmount} {unitAbbr}.
                  {:else}
                    между {minPrincipalUnitAmount} и {maxPrincipalUnitAmount} {unitAbbr}.
                  {/if}
                </li>
              {/if}
              {#if configError !== undefined}
                <li>
                  {#if configError === 'NO_CONNECTION_TO_DEBTOR'}
                    Не може да се осъществи връзка със сървърите,
                    които управляват тази валута. Няма да можете да
                    изпращате или получавате пари от тази сметка, но
                    ще можете да фиксирате други валути към нея.
                  {:else if configError === 'CONFIGURATION_IS_NOT_EFFECTUAL'}
                    Тази сметка има проблем с конфигурацията.
                    Обикновено това означава, че временно не може да
                    се осъществи връзка със сървърите, които
                    управляват тази валута.
                  {:else}
                    Възникна неочакван проблем с конфигурацията на
                    сметката:
                    <span style="word-break: break-all">{configError}</span>.
                  {/if}
                </li>
              {/if}
            </ul>
          </svelte:fragment>
        </AccountInfo>
      </div>

    {:else if tab === 'coin'}
      <div in:fade="{{ duration }}">
        <div class="qrcode-container">
          <QrGenerator value={digitalCoin} bind:dataUrl />
        </div>
        <a class="download-link" href={dataUrl} download={`${debtorName}.png`} bind:this={downloadLinkElement}>
          изтегли
        </a>
        <div class="text-container">
          <Paper elevation={8} style="margin: 0 16px 24px 16px; max-width: 600px; word-break: break-word">
            <Title>
              Дигитална монета на "{debtorName}"
            </Title>
            <Content>
              <a href="{digitalCoin}" target="_blank" rel="noreferrer" on:click|preventDefault={() => downloadLinkElement?.click()}>
                Изображението по-горе
              </a>
              (стандартен QR код) еднозначно определя дигиталната
              валута на тази сметка. Други хора може да сканират този
              QR код с мобилните си устройства, ако също искат да
              използват тази валута.
            </Content>
          </Paper>
        </div>
      </div>

    {:else if tab === 'sort'}
      <div in:fade="{{ duration }}">
        <Paper style="margin: 24px 18px; word-break: break-word" elevation={6}>
          <Title>Приоритет при подреждане на "{debtorName}"</Title>
          <Content>
            За да намирате по-лесно тази сметка сред останалите
            сметки, можете да увеличите нейния приоритет при
            подреждане. По този начин ще придвижите тази сметка
            по-напред в списъка.
          </Content>
        </Paper>
        <div class="text-container">
          <FormField align="center" style="max-width: 400px; flex-grow: 1; display: flex; margin: 16px">
            <Slider style="flex-grow: 1" min={0} max={10} step={1} bind:value={sortRank} />
            <span slot="label" style="flex-grow: 0; padding: 8px 8px 8px 12px; font-size: 1.5em">
              {sortRank}
            </span>
          </FormField>
        </div>
      </div>

    {:else if tab === 'ledger'}
      <div in:fade="{{ duration }}">
        {#if transfers.length === 0}
          <p class="no-transfers">
            Няма известни преводи към/от тази сметка.
          </p>
        {/if}
        <LayoutGrid>
          {#each transfers as transfer }
            <Cell>
              <CommittedTransferCard
                {transfer}
                pegBound={pegBounds[0]}
                activate={() => showLedgerEntry(accountUri, transfer.entryId)}
                />
            </Cell>
          {/each}
          <Cell span={12} style="text-align: cetner; visibility: {showLoadedTranfersButton ? 'visible' : 'hidden'}">
            <Card>
              <PrimaryAction on:click={loadTransfers}>
                <CardContent>
                  <div class="load-button">
                    <span>
                      Зареди по-стари преводи
                    </span>
                    <Icon class="material-icons">
                      arrow_forward
                    </Icon>
                  </div>
                </CardContent>
              </PrimaryAction>
            </Card>
          </Cell>
        </LayoutGrid>
      </div>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="floating">
    <div class="fab-container">
      <Fab on:click={createConfigAccountAction} >
        <Icon class="material-icons">
          settings
        </Icon>
      </Fab>
    </div>
    <div class="fab-container">
      <Fab on:click={createUpdatePolicyAction} >
        <ExchangeSvgIcon />
      </Fab>
    </div>
    {#if knownDebtor && !scheduledForDeletion}
      <div class="fab-container">
        <Fab color="primary" on:click={receipt} >
          <Icon class="material-icons">
            receipt
          </Icon>
        </Fab>
      </div>
    {/if}
  </svelte:fragment>
</Page>
