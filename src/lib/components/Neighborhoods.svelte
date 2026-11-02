<script lang="ts">
import Card from './Card.svelte';

const tiers = [
  {
    title: 'Tier 1',
    neighborhoods: [
      'Flatiron',
      'NoMad',
      'Gramercy Park',
      'Chelsea',
      'Kips Bay',
      'East Village',
      'Greenwich Village',
    ],
  },
  {
    title: 'Tier 2',
    neighborhoods: ["Hell's Kitchen", 'Murray Hill', 'Hudson Yards', 'Midtown South'],
  },
];
</script>

<Card title="Candidate neighborhoods">
  <div class="space-y-4 sm:grid sm:grid-cols-2 sm:space-y-0 sm:gap-x-6">
    {#each tiers as tier (tier.title)}
      <div>
        <h3 class="text-lg font-medium">{tier.title}</h3>
        <ul class="list-disc pl-5">
          {#each tier.neighborhoods as neighborhood (neighborhood)}
            <li>{neighborhood}</li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</Card>
