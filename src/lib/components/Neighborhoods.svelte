<script>
import Card from './Card.svelte';

const tier1 = [
  'Flatiron',
  'NoMad',
  'Gramercy Park',
  'Chelsea',
  'Kips Bay',
  'East Village',
  'Greenwich Village',
];

const tier2 = ["Hell's Kitchen", 'Murray Hill', 'Hudson Yards', 'Midtown South'];
</script>

<Card title="Candidate neighborhoods">
  <div class="space-y-4 sm:grid sm:grid-cols-2 sm:space-y-0 sm:gap-x-6">
    <div>
      <h3 class="text-lg font-medium">Tier 1</h3>
      <ul class="list-disc pl-5">
        {#each tier1 as neighborhood (neighborhood)}
          <li>{neighborhood}</li>
        {/each}
      </ul>
    </div>

    <div>
      <h3 class="text-lg font-medium">Tier 2</h3>
      <ul class="list-disc pl-5">
        {#each tier2 as neighborhood (neighborhood)}
          <li>{neighborhood}</li>
        {/each}
      </ul>
    </div>
  </div>
</Card>
