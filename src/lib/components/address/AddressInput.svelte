<script lang="ts">
import { Button } from '#lib/components/ui/button/index.ts';
import { Input } from '#lib/components/ui/input/index.ts';
import { isValidAddress } from './addressUtils';

interface Props {
  value: string;
  busy: boolean;
}

let { value = $bindable(), busy }: Props = $props();
</script>

<div class="flex flex-col gap-4 sm:flex-row">
  <Input
    class="h-10 grow"
    type="text"
    name="address"
    bind:value
    placeholder="100 Martine Ave, White Plains"
    aria-label="Street address and town"
    autocomplete="street-address"
    required
  />
  <Button size="lg" disabled={!isValidAddress(value) || busy} type="submit">
    {busy ? 'Calculating…' : 'Add apartment'}
  </Button>
</div>
