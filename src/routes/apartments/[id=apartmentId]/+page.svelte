<script lang="ts">
import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
import { recomputeTravelTimes } from '#lib/apartments.remote.ts';
import Card from '#lib/components/Card.svelte';
import ErrorMessage from '#lib/components/ErrorMessage.svelte';
import DestinationList from '#lib/components/travelTimes/DestinationList.svelte';
import * as Alert from '#lib/components/ui/alert/index.ts';
import { Button } from '#lib/components/ui/button/index.ts';
import { formatDate } from '#lib/formatDate.ts';
import { signInOnExpiredSession } from '#lib/signInOnExpiredSession.ts';
import { resolve } from '$app/paths';
import type { PageProps } from './$types';

const LIST_FORMAT = new Intl.ListFormat('en-US');

const { data }: PageProps = $props();

const pending = $derived(recomputeTravelTimes.pending > 0);
const issue = $derived(recomputeTravelTimes.fields.allIssues()?.[0]);
</script>

<svelte:head>
  <title>{data.address} · White Plains apartments</title>
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
    <h1 class="text-3xl font-bold">{data.address}</h1>
    <p class="mb-6 text-muted-foreground">
      Travel times calculated {formatDate(data.travelTimesComputedAt)}
    </p>

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
            <Button type="submit" disabled={pending}>
              {pending ? 'Recalculating…' : 'Recalculate all travel times'}
            </Button>
          </form>
          {#if issue && !pending}
            <ErrorMessage message={issue.message} />
          {/if}
        </Alert.Description>
      </Alert.Root>
    {/if}

    {#if data.results.length > 0}
      <Card title="Travel times">
        <DestinationList destinations={data.results} />
      </Card>
    {/if}
  </div>
</div>
