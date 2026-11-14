<script lang="ts">
import Button from '../Button.svelte';
import Input from '../Input.svelte';
import { isValidAddress } from './addressUtils';

interface Props {
  // The address in the page's URL.
  address: string;
  busy: boolean;
}

const { address, busy }: Props = $props();

// Follows the URL, as on back and forward, until someone types.
let value = $derived(address);
</script>

<!-- A GET form, so submitting navigates to `?address=` and the page runs the lookup from the URL. -->
<form class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
  <div class="flex-grow">
    <Input
      type="text"
      name="address"
      bind:value
      placeholder="100 Martine Ave, White Plains"
      required
    />
  </div>
  <div>
    <Button class="sm:w-auto" disabled={!isValidAddress(value) || busy} type="submit">
      Calculate travel times
    </Button>
  </div>
</form>
