<script lang="ts">
import travelTimesRequest, { getTravelTimes } from '#lib/state/travelTimes.svelte.ts';
import { isValidAddress } from './addressUtils.js';

let address = $state('');
let isRequestInFlight = $state(false);

function handleSubmit() {
  if (isRequestInFlight) return;
  isRequestInFlight = true;
  travelTimesRequest.task = getTravelTimes(address).finally(() => {
    isRequestInFlight = false;
  });
}
</script>

<form
  onsubmit={(event) => {
    event.preventDefault();
    handleSubmit();
  }}
  class="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4"
>
  <div class="flex-grow">
    <input
      type="text"
      bind:value={address}
      placeholder="1 Madison Ave, New York"
      required
      class="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
    >
  </div>
  <div>
    <button
      class="w-full cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-400 sm:w-auto"
      disabled={!isValidAddress(address) || isRequestInFlight}
      type="submit"
    >
      Calculate travel times
    </button>
  </div>
</form>
