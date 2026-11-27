<script lang="ts">
import { addApartment } from '#lib/apartments.remote.ts';
import AddressInput from '#lib/components/address/AddressInput.svelte';
import DuplicateWarning from '#lib/components/apartment/DuplicateWarning.svelte';
import Card from '#lib/components/Card.svelte';
import ErrorMessage from '#lib/components/ErrorMessage.svelte';
import Loading from '#lib/components/Loading.svelte';
import { formatDate } from '#lib/formatDate.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import { submitOrSignIn } from '#lib/signInOnExpiredSession.ts';
import { parseUnit, withUnit } from '#lib/unit.ts';
import { resolve } from '$app/paths';
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

function apartmentPath(id: ApartmentId) {
  return resolve('/apartments/[id=apartmentId]', { id });
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
        {:else}
          <p class="text-muted-foreground">
            Saves it with its travel times, so its link opens without recalculating.
          </p>
        {/if}
      </form>
    </Card>

    {#if data.apartments.length > 0}
      <Card title="Saved apartments">
        <ul class="divide-y divide-border">
          {#each data.apartments as apartment (apartment.id)}
            <li>
              <a
                href={apartmentPath(apartment.id)}
                class="flex items-baseline justify-between gap-4 py-3 hover:text-primary"
              >
                <span>{withUnit(apartment.address, apartment.unit)}</span>
                <span class="shrink-0 text-sm text-muted-foreground">
                  {formatDate(apartment.createdAt)}
                </span>
              </a>
            </li>
          {/each}
        </ul>
      </Card>
    {/if}
  </div>
</div>
