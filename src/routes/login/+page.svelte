<script lang="ts">
import ErrorMessage from '#lib/components/ErrorMessage.svelte';
import { Button } from '#lib/components/ui/button/index.ts';
import * as Card from '#lib/components/ui/card/index.ts';
import { Input } from '#lib/components/ui/input/index.ts';
import { enhance } from '$app/forms';
import type { PageProps } from './$types';

const { form }: PageProps = $props();

let pending = $state(false);
</script>

<svelte:head>
  <title>Sign in · White Plains apartments</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
  <Card.Root class="w-full max-w-sm text-base">
    <Card.Header>
      <Card.Title><h1 class="text-xl font-semibold">🔒 Enter the site's password</h1></Card.Title>
    </Card.Header>
    <Card.Content>
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
        class="flex flex-col gap-3"
      >
        <Input
          class="h-10"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          aria-label="Password"
        />
        <Button size="lg" disabled={pending} type="submit">
          {pending ? 'Unlocking…' : 'Unlock'}
        </Button>
        {#if form?.message && !pending}
          <ErrorMessage message={form.message} />
        {/if}
      </form>
    </Card.Content>
  </Card.Root>
</div>
