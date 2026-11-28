<script lang="ts">
import { withUnit } from '#lib/address.ts';
import * as Alert from '#lib/components/ui/alert/index.ts';
import { Button } from '#lib/components/ui/button/index.ts';
import { formatDate } from '#lib/formatDate.ts';
import type { ApartmentSummary } from '#lib/server/apartments.ts';
import type { RemoteFormField } from '$app/server';
import { resolve } from '$app/paths';

interface Props {
  existing: ApartmentSummary[];
  unit: string | null; // The unit this save was sent with.
  allowDuplicate: RemoteFormField<'allow'>;
}

const { existing, unit, allowDuplicate }: Props = $props();

// Only a matching unit, or no unit on either side, is surely the same apartment.
const isSameUnit = $derived(
  existing.some((saved) => saved.unit?.toLowerCase() === unit?.toLowerCase()),
);
const hasUnitless = $derived(existing.some((saved) => saved.unit === null));
</script>

<Alert.Root role="status" class="border-yellow-600 bg-yellow-950/50 text-base">
  <Alert.Title>{isSameUnit ? 'Already saved' : 'Maybe already saved'}</Alert.Title>
  <Alert.Description class="text-base">
    <ul class="flex flex-col gap-1">
      {#each existing as saved (saved.id)}
        <li>
          <a href={resolve('/apartments/[id=apartmentId]', { id: saved.id })}>
            {withUnit(saved.address, saved.unit)}</a
          >, added {formatDate(saved.createdAt)}
        </li>
      {/each}
    </ul>
    <div class="mt-3">
      <Button variant="outline" {...allowDuplicate.as('submit', 'allow')}>
        Save as a separate apartment
      </Button>
    </div>
    {#if unit === null}
      <p class="mt-2 text-sm">If this is another unit, enter it above to tell them apart.</p>
    {:else if hasUnitless}
      <p class="mt-2 text-sm">
        If one saved without a unit is another apartment, give it its unit on its page.
      </p>
    {/if}
  </Alert.Description>
</Alert.Root>
