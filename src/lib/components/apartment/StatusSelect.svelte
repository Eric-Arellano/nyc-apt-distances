<script lang="ts">
import { STATUS_LABELS, STATUSES } from '#lib/apartmentStatus.ts';
import { changeStatus } from '#lib/apartments.remote.ts';
import * as NativeSelect from '#lib/components/ui/native-select/index.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import type ApartmentStatus from '#lib/server/db/schema/public/ApartmentStatus.ts';
import { signInOnExpiredSession } from '#lib/signInOnExpiredSession.ts';

interface Props {
  id: ApartmentId;
  status: ApartmentStatus;
}

const { id, status }: Props = $props();

const isSaving = $derived(changeStatus.pending > 0);
</script>

<!-- Saves as soon as it's picked, with no Edit or Save: there is nothing half-done to lose. A
     native select, so a phone shows its own picker. -->
<form {...changeStatus.enhance(signInOnExpiredSession)} class="flex items-center gap-2">
  <input {...changeStatus.fields.id.as('hidden', String(id))}>
  <!-- Only the field's `name`: its `value` is the form's state, which outlives the page and would
       show a status the other person has since changed. -->
  <NativeSelect.Root
    name={changeStatus.fields.status.as('select').name}
    value={status}
    aria-label="Status"
    onchange={(event) => event.currentTarget.form?.requestSubmit()}
  >
    {#each STATUSES as option (option)}
      <NativeSelect.Option value={option}>{STATUS_LABELS[option]}</NativeSelect.Option>
    {/each}
  </NativeSelect.Root>
  {#if isSaving}
    <span role="status" class="text-sm text-muted-foreground">Saving…</span>
  {/if}
</form>
