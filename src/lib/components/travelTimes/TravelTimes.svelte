<script lang="ts">
import type { DestinationResult } from '#lib/types.ts';
import Card from '../Card.svelte';
import ErrorMessage from '../ErrorMessage.svelte';
import Loading from '../Loading.svelte';
import DestinationList from './DestinationList.svelte';

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
      <DestinationList destinations={result} />
    {:catch error}
      <ErrorMessage message={error.message} />
    {/await}
  </Card>
{/if}
