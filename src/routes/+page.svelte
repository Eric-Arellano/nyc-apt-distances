<script lang="ts">
import Columns2Icon from '@lucide/svelte/icons/columns-2';
import { parseUnit } from '#lib/address.ts';
import { addApartment } from '#lib/apartments.remote.ts';
import AddressInput from '#lib/components/apartment/AddressInput.svelte';
import DuplicateWarning from '#lib/components/apartment/DuplicateWarning.svelte';
import Card from '#lib/components/Card.svelte';
import ComparisonTable from '#lib/components/comparison/ComparisonTable.svelte';
import { Button } from '#lib/components/ui/button/index.ts';
import ErrorMessage from '#lib/components/ErrorMessage.svelte';
import Loading from '#lib/components/Loading.svelte';
import { FIXED_SORT_KEYS, nextSort, parseSort, sortSearch } from '#lib/comparisonTable.ts';
import { submitOrSignIn } from '#lib/signInOnExpiredSession.ts';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import type { PageProps } from './$types';

const { data }: PageProps = $props();

const pending = $derived(addApartment.pending > 0);
const firstFormError = $derived(addApartment.fields.allIssues()?.[0]);
// Answers only the address and unit it was sent for, so editing either drops it, and "Save as a
// separate apartment" can't resubmit a different one with the check skipped.
const duplicate = $derived.by(() => {
  const { result, fields } = addApartment;
  const isSameSubmission =
    result?.address === fields.address.value()?.trim() &&
    result?.unit === parseUnit(fields.unit.value() ?? '');
  return isSameSubmission ? result : undefined;
});

// A save redirects to its page and leaves no result. The form's state outlives the page, so the
// saved address would otherwise be back in the input on returning here.
const enhanceAdd = addApartment.enhance(async (form) => {
  if ((await submitOrSignIn(form)) && !form.result) form.fields.set({ address: '', unit: '' });
});

// In the URL, so it survives going to an apartment and back, and a sorted link can be shared.
const sort = $derived(
  parseSort(page.url.searchParams, [
    ...FIXED_SORT_KEYS,
    ...data.groups.flatMap(({ columns }) => columns.map(({ key }) => key)),
  ]),
);

// Replaces the history entry, so Back leaves the page rather than undoing sorts one by one.
async function changeSort(key: string) {
  await goto(`${resolve('/')}${sortSearch(nextSort(sort, key))}`, { replace: true, reset: false });
}
</script>

<svelte:head>
  <title>White Plains apartments</title>
</svelte:head>

<div class="min-h-screen py-8">
  <div class="container mx-auto max-w-6xl px-4">
    <h1 class="mb-6 text-center text-3xl font-bold md:text-left">White Plains apartments</h1>

    <Card title="Add an apartment">
      <form {...enhanceAdd} class="flex flex-col gap-4">
        <AddressInput
          field={addApartment.fields.address}
          unit={addApartment.fields.unit}
          busy={pending}
        />
        {#if pending}
          <Loading message="Calculating travel times…" />
        {:else if duplicate}
          <DuplicateWarning
            existing={duplicate.duplicate}
            unit={duplicate.unit}
            allowDuplicate={addApartment.fields.duplicate}
          />
        {:else if firstFormError}
          <ErrorMessage message={firstFormError.message} />
        {/if}
      </form>
    </Card>

    {#if data.apartments.length > 0}
      <Card title="Saved apartments">
        {#snippet action()}
          {#if data.apartments.length > 1}
            <Button variant="outline" href={resolve('/compare')}>
              <Columns2Icon aria-hidden="true" />
              Side by side
            </Button>
          {/if}
        {/snippet}
        <ComparisonTable groups={data.groups} rows={data.apartments} {sort} onsort={changeSort} />
      </Card>
    {/if}
  </div>
</div>
