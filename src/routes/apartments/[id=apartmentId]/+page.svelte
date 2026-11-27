<script lang="ts">
import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import { recomputeTravelTimes, removeApartment } from '#lib/apartments.remote.ts';
import Card from '#lib/components/Card.svelte';
import ErrorMessage from '#lib/components/ErrorMessage.svelte';
import DestinationList from '#lib/components/travelTimes/DestinationList.svelte';
import * as Alert from '#lib/components/ui/alert/index.ts';
import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
import { formatDate } from '#lib/formatDate.ts';
import { signInOnExpiredSession } from '#lib/signInOnExpiredSession.ts';
import { resolve } from '$app/paths';
import type { PageProps } from './$types';

const LIST_FORMAT = new Intl.ListFormat('en-US');

const { data }: PageProps = $props();

const isRecalculating = $derived(recomputeTravelTimes.pending > 0);
const firstFormError = $derived(recomputeTravelTimes.fields.allIssues()?.[0]);
const isDeleting = $derived(removeApartment.pending > 0);
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
      <Card title="Travel times">
        <DestinationList destinations={data.results} />
      </Card>
    {/if}

    <!-- Only here, not in the list: a mistaken save is noticed on this page, where saving lands,
         and an apartment we turn down is better kept with its history than deleted. -->
    <AlertDialog.Root>
      <AlertDialog.Trigger class={buttonVariants({ variant: 'destructive' })}>
        <Trash2Icon aria-hidden="true" />
        Delete apartment
      </AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Delete this apartment?</AlertDialog.Title>
          <AlertDialog.Description>
            {data.address}
            and everything saved about it will be deleted for everyone. This can't be undone.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <form {...removeApartment.enhance(signInOnExpiredSession)}>
          <input {...removeApartment.fields.id.as('hidden', String(data.id))}>
          <AlertDialog.Footer>
            <!-- bits-ui leaves `type` unset, which inside a form would make Cancel delete too. -->
            <AlertDialog.Cancel type="button" disabled={isDeleting}>Cancel</AlertDialog.Cancel>
            <!-- Unlike Cancel, Action leaves the dialog open, so it can show the delete pending. -->
            <AlertDialog.Action type="submit" variant="destructive" disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </form>
      </AlertDialog.Content>
    </AlertDialog.Root>
  </div>
</div>
