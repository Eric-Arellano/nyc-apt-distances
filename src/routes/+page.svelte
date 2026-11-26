<script lang="ts">
import { addApartment } from '#lib/apartments.remote.ts';
import AddressInput from '#lib/components/address/AddressInput.svelte';
import Card from '#lib/components/Card.svelte';
import ErrorMessage from '#lib/components/ErrorMessage.svelte';
import Loading from '#lib/components/Loading.svelte';
import * as Alert from '#lib/components/ui/alert/index.ts';
import { Button } from '#lib/components/ui/button/index.ts';
import { formatDate } from '#lib/formatDate.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import { submitOrSignIn } from '#lib/submitOrSignIn.ts';
import { resolve } from '$app/paths';
import type { PageProps } from './$types';

const { data }: PageProps = $props();

const pending = $derived(addApartment.pending > 0);
const issue = $derived(addApartment.fields.allIssues()?.[0]);
// Answers only the address it was sent for, so editing the address drops it, and "Save as a
// separate apartment" can't resubmit a different one with the check skipped.
const duplicate = $derived.by(() => {
  const result = addApartment.result;
  return result?.address === addApartment.fields.address.value()?.trim()
    ? result?.duplicate
    : undefined;
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
      <form {...addApartment.enhance(submitOrSignIn)} class="flex flex-col gap-4">
        <AddressInput field={addApartment.fields.address} busy={pending} />
        {#if pending}
          <Loading message="Calculating travel times…" />
        {:else if duplicate}
          <Alert.Root role="status" class="border-yellow-600 bg-yellow-950/50 text-base">
            <Alert.Title>Already saved</Alert.Title>
            <Alert.Description class="text-base">
              <p>{duplicate.address}, added {formatDate(duplicate.createdAt)}.</p>
              <div class="mt-3 flex flex-col gap-2 sm:flex-row">
                <!-- Alert underlines its links, which a button shouldn't be. -->
                <Button href={apartmentPath(duplicate.id)} class="no-underline!">
                  Open saved apartment
                </Button>
                <Button variant="outline" {...addApartment.fields.duplicate.as('submit', 'allow')}>
                  Save as a separate apartment
                </Button>
              </div>
              <p class="mt-2 text-sm">Such as another unit in the same building.</p>
            </Alert.Description>
          </Alert.Root>
        {:else if issue}
          <ErrorMessage message={issue.message} />
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
                <span>{apartment.address}</span>
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
