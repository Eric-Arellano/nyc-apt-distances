<script lang="ts">
import type { HTMLInputAttributes } from 'svelte/elements';

let { value = $bindable(), ...rest }: HTMLInputAttributes = $props();
</script>

<input
  bind:value
  class="w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 placeholder:text-gray-500 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
  {...rest}
>
