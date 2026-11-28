<script lang="ts">
import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
import Columns2Icon from '@lucide/svelte/icons/columns-2';
import { recomputeTravelTimes } from '#lib/apartments.remote.ts';
import DetailsCard from '#lib/components/apartment/DetailsCard.svelte';
import StatusSelect from '#lib/components/apartment/StatusSelect.svelte';
import Card from '#lib/components/Card.svelte';
import DeleteApartment from '#lib/components/DeleteApartment.svelte';
import ErrorMessage from '#lib/components/ErrorMessage.svelte';
import DestinationList from '#lib/components/travelTimes/DestinationList.svelte';
import * as Alert from '#lib/components/ui/alert/index.ts';
import { Button } from '#lib/components/ui/button/index.ts';
import { formatDate } from '#lib/formatDate.ts';
import { compareSearch } from '#lib/sideBySide.ts';
import { signInOnExpiredSession } from '#lib/signInOnExpiredSession.ts';
import { formatUnit, withUnit } from '#lib/unit.ts';
import { resolve } from '$app/paths';
import type { PageProps } from './$types';

const LIST_FORMAT = new Intl.ListFormat('en-US');

const { data }: PageProps = $props();

const unit = $derived(data.details.unit && formatUnit(data.details.unit));
const isRecalculating = $derived(recomputeTravelTimes.pending > 0);
const firstFormError = $derived(recomputeTravelTimes.fields.allIssues()?.[0]);
</script>

<svelte:head>
  <title>{withUnit(data.address, data.details.unit)} · White Plains apartments</title>
</svelte:head>

<div class="min-h-screen py-8">
  <div class="container mx-auto max-w-6xl px-4">
    <a
      href={resolve('/')}
      class="mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon aria-hidden="true" class="size-4" />
      All apartments
    </a>
    <div class="flex items-start justify-between gap-2">
      <h1 class="text-3xl font-bold">{data.address}</h1>
      <DeleteApartment id={data.id} address={data.address} />
    </div>
    <div class="mt-2 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
      {#if unit}
        <p class="text-lg">{unit}</p>
      {/if}
      <StatusSelect id={data.id} status={data.status} />
      <Button variant="outline" href="{resolve('/compare')}{compareSearch([data.id, undefined])}">
        <Columns2Icon aria-hidden="true" />
        Compare with…
      </Button>
    </div>

    <DetailsCard id={data.id} details={data.details} />

    {#if data.missing.length > 0}
      <Alert.Root role="status" class="mb-4 border-yellow-600 bg-yellow-950/50 text-base">
        <Alert.Title>Some travel times are missing</Alert.Title>
        <Alert.Description class="text-base">
          <p>
            {LIST_FORMAT.format(data.missing)}
            {data.missing.length === 1 ? 'is' : 'are'}
            new or changed since these were calculated.
          </p>
          <form {...recomputeTravelTimes.enhance(signInOnExpiredSession)} class="mt-3">
            <input {...recomputeTravelTimes.fields.id.as('hidden', String(data.id))}>
            <Button type="submit" disabled={isRecalculating}>
              {isRecalculating ? 'Recalculating…' : 'Recalculate all travel times'}
            </Button>
          </form>
          {#if firstFormError && !isRecalculating}
            <ErrorMessage message={firstFormError.message} />
          {/if}
        </Alert.Description>
      </Alert.Root>
    {/if}

    {#if data.results.length > 0}
      <Card title="Travel times" description="Calculated {formatDate(data.travelTimesComputedAt)}">
        <DestinationList destinations={data.results} />
      </Card>
    {/if}
  </div>
</div>
