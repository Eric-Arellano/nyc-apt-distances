<script lang="ts">
import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
import { streetPart } from '#lib/address.ts';
import SideBySide from '#lib/components/comparison/SideBySide.svelte';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import { compareSearch, type Pair, pairMap } from '#lib/sideBySide.ts';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { PageProps } from './$types';

const { data }: PageProps = $props();

const ids = $derived(pairMap(data.apartments, (apartment) => apartment?.id));
const title = $derived(
  data.apartments.every(Boolean)
    ? data.apartments.map((apartment) => apartment && streetPart(apartment.address)).join(' vs. ')
    : 'Side by side',
);

// In the URL, so a comparison can be shared. Replaces the history entry, so Back leaves the page
// rather than stepping through each apartment picked.
async function show(next: Pair<ApartmentId | undefined>) {
  await goto(`${resolve('/compare')}${compareSearch(next)}`, { replace: true, reset: false });
}

function choose(side: 0 | 1, id: ApartmentId) {
  show(side === 0 ? [id, ids[1]] : [ids[0], id]);
}
</script>

<svelte:head>
  <title>{title} · White Plains apartments</title>
</svelte:head>

<div class="min-h-screen pt-8">
  <header class="mx-auto mb-5 max-w-3xl px-4">
    <a
      href={resolve('/')}
      class="mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon aria-hidden="true" class="size-4" />
      All apartments
    </a>
    <h1 class="text-3xl font-bold">Side by side</h1>
  </header>
  <SideBySide
    choices={data.choices}
    apartments={data.apartments}
    destinations={data.destinations}
    onchoose={choose}
    onswap={() => show([ids[1], ids[0]])}
  />
</div>
