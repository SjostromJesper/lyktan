<script setup lang="ts">
import { isRecentRelease, isUpcomingRelease } from '#shared/utils/productRelease'

const props = defineProps<{
  product: any
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { addVariantToCart, loadingVariantId, formatMoney } = useShopifyCart()
const productPath = computed(() => localePath(`/produkter/${props.product.handle}`))

const firstVariant = computed(() => props.product?.variants?.nodes?.[0] ?? null)
const primaryTag = computed(() => props.product?.tags?.[0] ?? null)

const releaseDate = computed(() => props.product?.releaseDate?.value ?? null)
const isUpcoming = computed(() => isUpcomingRelease(releaseDate.value))
const isNew = computed(() => isRecentRelease(releaseDate.value))

const isSoldOut = computed(() => firstVariant.value && firstVariant.value.availableForSale === false)
const isInStoreOnly = computed(() => props.product?.inStoreOnly?.value === 'true')

const hasDiscount = computed(() => {
  const compareAt = Number(firstVariant.value?.compareAtPrice?.amount)
  const price = Number(firstVariant.value?.price?.amount)
  return Number.isFinite(compareAt) && Number.isFinite(price) && compareAt > price
})

const addToCart = async () => {
  if (!firstVariant.value?.id) {
    return
  }

  await addVariantToCart(firstVariant.value.id, props.product.title)
}
</script>

<template>
  <article class="group flex w-full flex-col">
    <NuxtLink :to="productPath" class="relative aspect-square overflow-hidden rounded-[10px] border border-lyktan-line bg-lyktan-surface">
      <img
        v-if="product.featuredImage?.url"
        :src="product.featuredImage.url"
        :alt="product.featuredImage.altText || product.title"
        class="absolute inset-0 h-full w-full object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
      >
      <div v-else class="grid h-full w-full place-items-center text-lg font-medium text-lyktan-mute">
        {{ product.title.slice(0, 2).toUpperCase() }}
      </div>
      <span v-if="isUpcoming" class="absolute left-2 top-2 rounded-full bg-lyktan-brand px-2.5 py-1 text-[0.68rem] font-semibold text-lyktan-ink">
        {{ t('product.comingSoon') }}
      </span>
      <span v-else-if="isInStoreOnly" class="absolute left-2 top-2 rounded-full bg-lyktan-mute px-2.5 py-1 text-[0.68rem] font-medium text-white">
        {{ t('product.inStoreOnly') }}
      </span>
      <span v-else-if="isSoldOut" class="absolute left-2 top-2 rounded-full bg-lyktan-ink px-2.5 py-1 text-[0.68rem] font-medium text-white">
        {{ t('product.soldOut') }}
      </span>
      <span v-else-if="isNew" class="absolute left-2 top-2 rounded-full bg-emerald-600 px-2.5 py-1 text-[0.68rem] font-medium text-white">
        {{ t('product.new') }}
      </span>
    </NuxtLink>

    <div class="mt-3 flex flex-1 flex-col gap-1">
      <span v-if="primaryTag" class="text-[0.72rem] text-lyktan-mute">{{ primaryTag }}</span>
      <NuxtLink :to="productPath" class="text-[0.9rem] leading-tight text-lyktan-ink line-clamp-2">
        {{ product.title }}
      </NuxtLink>
      <p class="flex items-baseline gap-2 font-mono tabular-nums text-[0.88rem] font-medium text-lyktan-ink">
        <span>{{ formatMoney(firstVariant?.price?.amount, firstVariant?.price?.currencyCode) }}</span>
        <span v-if="hasDiscount" class="text-[0.8rem] font-normal text-lyktan-mute line-through">
          {{ formatMoney(firstVariant?.compareAtPrice?.amount, firstVariant?.compareAtPrice?.currencyCode) }}
        </span>
      </p>

      <NuxtLink v-if="isUpcoming" :to="productPath" class="secondary-cta mt-2 !min-h-9 !text-[0.8rem]">
        {{ t('product.getReminder') }}
      </NuxtLink>
      <NuxtLink v-else-if="isInStoreOnly" :to="productPath" class="secondary-cta mt-2 !min-h-9 !text-[0.8rem]">
        {{ t('product.inStoreOnly') }}
      </NuxtLink>
      <button
        v-else
        type="button"
        class="secondary-cta mt-2 !min-h-9 !text-[0.8rem]"
        :disabled="loadingVariantId === firstVariant?.id || isSoldOut"
        @click="addToCart"
      >
        {{ isSoldOut ? t('product.soldOut') : loadingVariantId === firstVariant?.id ? t('product.adding') : t('product.addToCart') }}
      </button>
    </div>
  </article>
</template>
