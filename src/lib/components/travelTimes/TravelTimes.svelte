<script lang="ts">
import type { DestinationResult } from '#lib/types.ts';
import Card from '../Card.svelte';
import ErrorMessage from '../ErrorMessage.svelte';
import Loading from '../Loading.svelte';
import Success from './Success.svelte';

interface Props {
  task: Promise<DestinationResult[]> | null;
}

const { task }: Props = $props();
</script>

{#if task}
  <Card title="Travel times">
    {#await task}
      <Loading message="Calculating travel times..." />
    {:then result}
      <Success destinations={result} />
    {:catch error}
      <ErrorMessage error={error.message} />
    {/await}
  </Card>
{/if}
