<script lang="ts">
import Card from '../Card.svelte';
import AddressInput from './AddressInput.svelte';
import authState from '#lib/state/auth.svelte.ts';
import Login from '../Login.svelte';
</script>

<Card title="Street address">
  {#if authState.isAuthenticated}
    <AddressInput />
  {:else}
    <Login />
  {/if}
</Card>
