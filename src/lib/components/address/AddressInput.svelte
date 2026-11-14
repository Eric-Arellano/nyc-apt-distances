<script lang="ts">
import { isValidAddress } from './addressUtils.js';

interface Props {
  // The address in the page's URL.
  address: string;
  busy: boolean;
}

const { address, busy }: Props = $props();

// Follows the URL, as on back and forward, until someone types.
let value = $derived(address);
</script>

<!-- A GET form, so submitting navigates to `?address=` and the page runs the lookup from the URL. -->
<form class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
  <div class="flex-grow">
    <input
      type="text"
      name="address"
      bind:value
      placeholder="100 Martine Ave, White Plains"
      required
      class="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
    >
  </div>
  <div>
    <button
      class="w-full cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-400 sm:w-auto"
      disabled={!isValidAddress(value) || busy}
      type="submit"
    >
      Calculate travel times
    </button>
  </div>
</form>
