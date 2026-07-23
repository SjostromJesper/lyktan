<script setup lang="ts">
const props = defineProps<{
  product: any
}>()

const { addVariantToCart, loadingVariantId, formatMoney } = useShopifyCart()

const firstVariant = computed(() => props.product?.variants?.nodes?.[0] ?? null)
const primaryTag = computed(() => props.product?.tags?.[0] ?? null)

const addToCart = async () => {
  if (!firstVariant.value?.id) {
    return
  }

  await addVariantToCart(firstVariant.value.id, props.product.title)
}
</script>

<template>
  <article class="group flex w-full flex-col">
    <NuxtLink :to="`/produkter/${product.handle}`" class="relative aspect-square overflow-hidden bg-lyktan-surface">
      <img
        v-if="product.featuredImage?.url"
        :src="product.featuredImage.url"
        :alt="product.featuredImage.altText || product.title"
        class="absolute inset-0 h-full w-full object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
      >
      <div v-else class="grid h-full w-full place-items-center text-lg font-medium text-lyktan-mute">
        {{ product.title.slice(0, 2).toUpperCase() }}
      </div>
    </NuxtLink>

    <div class="mt-3 flex flex-1 flex-col gap-1">
      <span v-if="primaryTag" class="text-[0.72rem] text-lyktan-mute">{{ primaryTag }}</span>
      <NuxtLink :to="`/produkter/${product.handle}`" class="text-[0.9rem] leading-tight text-lyktan-ink line-clamp-2">
        {{ product.title }}
      </NuxtLink>
      <p class="text-[0.9rem] font-medium text-lyktan-ink">
        {{ formatMoney(firstVariant?.price?.amount, firstVariant?.price?.currencyCode) }}
      </p>

      <button
        type="button"
        class="secondary-cta mt-2 !min-h-9 !text-[0.8rem]"
        :disabled="loadingVariantId === firstVariant?.id"
        @click="addToCart"
      >
        {{ loadingVariantId === firstVariant?.id ? 'Lägger till...' : 'Lägg i kundvagn' }}
      </button>
    </div>
  </article>
</template>
