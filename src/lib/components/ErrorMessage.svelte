<script lang="ts">
interface Props {
  message: string;
}

const { message }: Props = $props();
</script>

<div class="flex items-center space-x-2 pt-2 text-red-600">
  <svg
    aria-hidden="true"
    class="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    ></path>
  </svg>
  <p>{message}</p>
</div>
