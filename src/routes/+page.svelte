<script lang="ts">
import AddressInput from '#lib/components/address/AddressInput.svelte';
import Card from '#lib/components/Card.svelte';
import TravelTimes from '#lib/components/travelTimes/TravelTimes.svelte';
import { getTravelTimes } from '#lib/travelTimes.ts';
import type { DestinationResult } from '#lib/types.ts';
import { afterNavigate } from '$app/navigation';
import { page } from '$app/state';

let task: Promise<DestinationResult[]> | null = $state.raw(null);
let busy = $state(false);

// The address lives in the URL, so a link reproduces the lookup, and every open of one spends the
// Google key again. Navigations happen only in the browser, so server rendering never calls Google.
afterNavigate(({ to }) => {
  const address = to?.url.searchParams.get('address');
  if (!address) {
    task = null;
    return;
  }

  busy = true;
  const lookup = getTravelTimes(address).finally(() => {
    // Back or forward during a lookup starts another, and only the latest may clear `busy`.
    if (task === lookup) busy = false;
  });
  task = lookup;
});
</script>

<svelte:head>
  <title>White Plains apartment travel times</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="container mx-auto max-w-6xl px-4">
    <h1 class="mb-6 text-center text-3xl font-bold md:text-left">
      White Plains apartment travel times
    </h1>
    <Card title="Street address and town">
      <AddressInput address={page.url.searchParams.get('address') ?? ''} {busy} />
    </Card>
    <TravelTimes {task} />
  </div>
</div>
