<script lang="ts">
import { Button } from '#lib/components/ui/button/index.ts';
import { Input } from '#lib/components/ui/input/index.ts';
import { isValidAddress } from './addressUtils';

interface Props {
  // The address in the page's URL.
  address: string;
  busy: boolean;
}

const { address, busy }: Props = $props();

// The input's text. Follows the URL, as on back and forward, until someone types.
let value = $derived(address);
</script>

<!-- A GET form, so submitting navigates to `?address=` and the page runs the lookup from the URL. -->
<form class="flex flex-col gap-4 sm:flex-row">
  <Input
    class="h-10 grow"
    type="text"
    name="address"
    bind:value
    placeholder="100 Martine Ave, White Plains"
    aria-label="Street address and town"
    required
  />
  <Button size="lg" disabled={!isValidAddress(value) || busy} type="submit">
    Calculate travel times
  </Button>
</form>
