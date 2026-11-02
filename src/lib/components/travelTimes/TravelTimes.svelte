<script lang="ts">
import Card from '../Card.svelte';
import Loading from '../Loading.svelte';
import ErrorMessage from '../ErrorMessage.svelte';
import Success from './Success.svelte';
import travelTimesRequest from '#lib/state/travelTimes.svelte.ts';
</script>

{#if travelTimesRequest.task}
  <Card title="Travel times">
    {#await travelTimesRequest.task}
      <Loading message="Calculating travel times..." />
    {:then result}
      <Success destinations={result} />
    {:catch error}
      <ErrorMessage error={error.message} />
    {/await}
  </Card>
{/if}
