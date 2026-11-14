<script lang="ts">
import type { HTMLInputAttributes } from 'svelte/elements';

let { value = $bindable(), ...rest }: HTMLInputAttributes = $props();
</script>

<input
  bind:value
  class="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
  {...rest}
>
