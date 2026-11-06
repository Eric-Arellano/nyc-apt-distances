<script lang="ts">
import AddressCard from '#lib/components/address/AddressCard.svelte';
import TravelTimes from '#lib/components/travelTimes/TravelTimes.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="container mx-auto max-w-6xl px-4">
    <h1 class="mb-6 text-center text-3xl font-bold md:text-left">
      White Plains apartment travel times
    </h1>
    <AddressCard isAuthenticated={data.isAuthenticated} />
    <TravelTimes />
  </div>
</div>
