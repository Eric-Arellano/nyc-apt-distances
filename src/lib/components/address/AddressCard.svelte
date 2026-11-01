<script lang="ts">
import Card from '../Card.svelte';
import AddressInput from './AddressInput.svelte';
import Login from '../Login.svelte';

let { isAuthenticated }: { isAuthenticated: boolean } = $props();
</script>

<Card title="Street address">
  {#if isAuthenticated}
    <AddressInput />
  {:else}
    <Login />
  {/if}
</Card>
