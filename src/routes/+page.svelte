<script lang="ts">
import AddressInput from '#lib/components/address/AddressInput.svelte';
import Card from '#lib/components/Card.svelte';
import TravelTimes from '#lib/components/travelTimes/TravelTimes.svelte';
</script>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="container mx-auto max-w-6xl px-4">
    <h1 class="mb-6 text-center text-3xl font-bold md:text-left">
      White Plains apartment travel times
    </h1>
    <Card title="Street address and town">
      <AddressInput />
    </Card>
    <TravelTimes />
  </div>
</div>
