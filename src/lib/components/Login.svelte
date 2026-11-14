<script lang="ts">
import { enhance } from '$app/forms';
import ErrorMessage from './ErrorMessage.svelte';

interface Props {
  // Why the last attempt failed, from the form action.
  error?: string;
}

const { error }: Props = $props();

let pending = $state(false);
</script>

<div class="flex flex-col space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  <h1 class="text-xl font-semibold text-gray-900">🔒 Enter the site's password</h1>
  <!-- No `action`, so the post keeps this page's `?redirectTo=`. -->
  <form
    method="POST"
    use:enhance={() => {
      pending = true;
      return async ({ update }) => {
        await update();
        pending = false;
      };
    }}
    class="flex flex-col space-y-3"
  >
    <input
      name="password"
      type="password"
      autocomplete="current-password"
      required
      class="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      aria-label="Password"
    >
    <button
      class="w-full cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-400"
      disabled={pending}
      type="submit"
    >
      {pending ? 'Unlocking…' : 'Unlock'}
    </button>
    {#if error && !pending}
      <ErrorMessage {error} />
    {/if}
  </form>
</div>
