<script lang="ts">
  import type { AppState } from '../app-state'
  import type { Writable } from 'svelte/store'
  import { getContext } from 'svelte'
  import { Title, Content } from '@smui/dialog'
  import Button, { Label } from '@smui/button'
  import Dialog from '@smui/dialog'
  import Textfield from '@smui/textfield'
  import TextfieldIcon from '@smui/textfield/icon'
  import HelperText from '@smui/textfield/helper-text/index'

  export let app: AppState

  let shakingElement: HTMLElement
  let invalidPin: boolean | undefined
  let newPin: string = ''

  const pinPattern = "^[0-9]{4,10}$"
  const pinRequired: Writable<boolean> = getContext('pinRequired')
  const resetPinMode: Writable<boolean> = getContext('resetPinMode')

  function ignoreNonNumberKeys(evt: KeyboardEvent){
    if (evt.key.length === 1) {
      const charCode = evt.key.charCodeAt(0)
      if (charCode < 48 || charCode > 57) {
        evt.preventDefault()
      }
    }
  }
  function close(): void {
    $pinRequired = true
    invalidPin = undefined
    newPin = ''
  }
  function shakeForm(): void {
    const shakingSuffix = ' shaking-block'
    const origClassName = shakingElement.className
    if (!origClassName.endsWith(shakingSuffix)) {
      shakingElement.className += shakingSuffix
      setTimeout(() => { shakingElement && (shakingElement.className = origClassName) }, 1000)
    }
  }
  function submit(e: Event): void {
    e.preventDefault()
    if (invalidPin) {
      shakeForm()
    } else {
      app.resetPin(newPin)
      close()
    }
  }

  $: successfulPinReset = app.successfulPinReset
  $: open = !$successfulPinReset && !$pinRequired
  $: if ($successfulPinReset && $resetPinMode) {
    close()
    alert('Използването на портфейла в режим на промяна на ПИН не е безопасно. Ще бъдете ' +
          'автоматично отписани. За да използвате приложението, ще трябва да влезете отново.')
    app.logout()
  }
</script>

<style>
  p {
    margin-bottom: 1em;
  }
  .submit {
    display: flex;
    justify-content: space-between;
    margin-top: 2em;
  }

  strong {
    font-weight: bold;
  }

  .shaking-container {
    position: relative;
    overflow: hidden;
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

{#if open}
  <div class="shaking-container">
    <Dialog
      open
      scrimClickAction=""
      escapeKeyAction=""
      aria-labelledby="set-pin-dialog-title"
      aria-describedby="set-pin-dialog-content"
      >
      <Title id="set-pin-dialog-title">Изберете ПИН</Title>
      <Content id="set-pin-dialog-content">
        <form noValidate autoComplete="off">
          <p>
            За да подобрим сигурността на портфейла ви, трябва да
            изберете ПИН (персонален идентификационен номер). Той ще
            бъде необходим за извършване на потенциално рискови
            операции.
          </p>

          <p>
            <strong>Не споделяйте своя ПИН с никого!</strong>
          </p>

          <p bind:this={shakingElement}>
            <Textfield
              required
              variant="outlined"
              style="width: 100%"
              type="tel"
              input$minlength={4}
              input$maxlength={10}
              input$pattern={pinPattern}
              withTrailingIcon={invalidPin}
              bind:invalid={invalidPin}
              bind:value={newPin}
              on:keypress={ignoreNonNumberKeys}
              label="Вашият ПИН"
              >
              <svelte:fragment slot="trailingIcon">
                {#if invalidPin}
                  <TextfieldIcon class="material-icons">error</TextfieldIcon>
                {/if}
              </svelte:fragment>
              <HelperText slot="helper" persistent>
                Трябва да съдържа поне 4 и най-много 10 цифри.
              </HelperText>
            </Textfield>
          </p>

          <p class="submit">
            <Button on:click={submit} type="submit" variant="raised">
              <Label>Запази</Label>
            </Button>
            <!-- The type="button" is necessary to prevent form submitting.-->
            <Button type="button" on:click={() => app.logout()}>
              <Label>Изход</Label>
            </Button>
          </p>
        </form>
      </Content>
    </Dialog>
  </div>
{/if}

