<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'muted' | 'dark'
  }>(),
  {
    variant: 'muted'
  }
)

const links = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/butiklyktan/'
  },
  {
    label: 'Discord',
    href: 'https://discord.gg/JRMEXuqqB'
  }
]
</script>

<template>
  <div class="flex items-center gap-3">
    <a
      v-for="link in links"
      :key="link.label"
      :href="link.href"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="link.label"
      :title="link.label"
      class="inline-grid h-9 w-9 place-items-center rounded-full transition"
      :class="
        variant === 'dark'
          ? 'text-white/70 hover:bg-white/10 hover:text-white'
          : 'text-lyktan-mute hover:bg-black/5 hover:text-lyktan-ink'
      "
    >
      <svg v-if="link.label === 'Instagram'" viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.6">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="currentColor">
        <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.211.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0A12.64 12.64 0 0 0 9.182 3a19.74 19.74 0 0 0-4.435 1.369C1.578 9.045.838 13.579 1.209 18.057a19.9 19.9 0 0 0 5.993 3.03c.483-.66.914-1.36 1.285-2.098a12.9 12.9 0 0 1-2.023-.975c.17-.124.336-.253.497-.386a14.24 14.24 0 0 0 12.078 0c.163.133.328.262.497.386-.646.383-1.323.71-2.026.977.371.737.802 1.437 1.285 2.096a19.86 19.86 0 0 0 6-3.03c.462-5.19-.783-9.68-3.478-13.688ZM8.678 15.318c-1.153 0-2.096-1.058-2.096-2.357 0-1.3.923-2.358 2.096-2.358 1.183 0 2.117 1.067 2.097 2.358 0 1.3-.914 2.357-2.097 2.357Zm6.644 0c-1.153 0-2.096-1.058-2.096-2.357 0-1.3.923-2.358 2.096-2.358 1.183 0 2.117 1.067 2.097 2.358 0 1.3-.905 2.357-2.097 2.357Z" />
      </svg>
    </a>
  </div>
</template>
