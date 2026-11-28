<script lang="ts">
import type { RemoteFormField } from '$app/server';
import { Button } from '#lib/components/ui/button/index.ts';
import * as Field from '#lib/components/ui/field/index.ts';
import { Input } from '#lib/components/ui/input/index.ts';
import { isValidAddress } from './addressUtils.ts';

interface Props {
  field: RemoteFormField<string>;
  unit: RemoteFormField<string>;
  busy: boolean;
}

const { field, unit, busy }: Props = $props();
</script>

<!-- The unit is asked here, not only on the apartment's page, because it is what tells a second
     apartment in a building from the first when saving it. -->
<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
  <Field.Field class="grow gap-2">
    <Field.Label for="new-address">Street address and town</Field.Label>
    <Input
      id="new-address"
      {...field.as('text')}
      class="h-10"
      placeholder="100 Martine Ave, White Plains"
      autocomplete="street-address"
      required
    />
  </Field.Field>
  <Field.Field class="gap-2 sm:w-32">
    <Field.Label for="new-unit">Unit, if any</Field.Label>
    <Input id="new-unit" {...unit.as('text')} class="h-10" autocomplete="off" />
  </Field.Field>
  <Button size="lg" disabled={!isValidAddress(field.value() ?? '') || busy} type="submit">
    {busy ? 'Calculating…' : 'Add apartment'}
  </Button>
</div>
