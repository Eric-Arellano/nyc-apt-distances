<script lang="ts">
import Button from '#lib/components/Button.svelte';
import ErrorMessage from '#lib/components/ErrorMessage.svelte';
import Input from '#lib/components/Input.svelte';
import { enhance } from '$app/forms';
import type { PageProps } from './$types';

const { form }: PageProps = $props();

let pending = $state(false);
</script>

<svelte:head>
  <title>Sign in · White Plains apartment travel times</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
  <div
    class="flex w-full max-w-sm flex-col space-y-3 rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-sm"
  >
    <h1 class="text-xl font-semibold text-gray-100">🔒 Enter the site's password</h1>
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
      <Input
        name="password"
        type="password"
        autocomplete="current-password"
        required
        aria-label="Password"
      />
      <Button disabled={pending} type="submit">{pending ? 'Unlocking…' : 'Unlock'}</Button>
      {#if form?.message && !pending}
        <ErrorMessage message={form.message} />
      {/if}
    </form>
  </div>
</div>
