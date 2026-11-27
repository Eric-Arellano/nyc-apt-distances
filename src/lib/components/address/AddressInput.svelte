<script lang="ts">
import type { RemoteFormField } from '$app/server';
import { Button } from '#lib/components/ui/button/index.ts';
import { Input } from '#lib/components/ui/input/index.ts';
import { isValidAddress } from './addressUtils';

interface Props {
  field: RemoteFormField<string>;
  busy: boolean;
}

const { field, busy }: Props = $props();
</script>

<div class="flex flex-col gap-4 sm:flex-row">
  <Input
    {...field.as('text')}
    class="h-10 grow"
    placeholder="100 Martine Ave, White Plains"
    aria-label="Street address and town"
    autocomplete="street-address"
    required
  />
  <Button size="lg" disabled={!isValidAddress(field.value() ?? '') || busy} type="submit">
    {busy ? 'Calculating…' : 'Add apartment'}
  </Button>
</div>
