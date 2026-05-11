<script setup lang="ts">
import {
  buildButikLink,
  findCatalogCategory,
  findCatalogSubcategory,
  findCatalogSystem,
  getCatalogLocation
} from '~/utils/catalog'

const route = useRoute()
const handle = computed(() => String(route.params.handle || ''))
const publicHandle = 'pokemon-chaos-rising-prerelease'
const selectedVariantId = ref('')
const productResponse = ref<{ handle?: string | null; routeHandle?: string | null; product?: any | null } | null>(null)
const error = ref<Error | null>(null)
const loadingProduct = ref(false)

const loadProduct = async () => {
  if (!handle.value) {
    return
  }

  loadingProduct.value = true

  try {
    productResponse.value = await $fetch(`/api/shopify/product/${handle.value}`, {
      cache: 'no-store'
    })
    error.value = null
  } catch (caughtError: any) {
    error.value = caughtError
    productResponse.value = null
  } finally {
    loadingProduct.value = false
  }
}

if (import.meta.server) {
  await loadProduct()
}

watch(handle, () => {
  selectedVariantId.value = ''
  loadProduct()
})

const product = computed(() => productResponse.value?.product ?? null)

const productDescriptionHtml = computed(() => {
  if (product.value?.descriptionHtml) {
    return product.value.descriptionHtml
  }

  if (!product.value?.description) {
    return ''
  }

  const escapedText = product.value.description
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<p>${escapedText}</p>`
})

const {
  addVariantToCart,
  loadingVariantId,
  formatMoney
} = useShopifyCart()

const variants = computed(() => product.value?.variants?.nodes ?? [])

watchEffect(() => {
  if (!selectedVariantId.value && variants.value[0]?.id) {
    selectedVariantId.value = variants.value[0].id
  }
})

const selectedVariant = computed(
  () => variants.value.find((entry: any) => entry.id === selectedVariantId.value) ?? variants.value[0] ?? null
)

const isSoldOut = computed(
  () => !selectedVariant.value?.availableForSale || selectedVariant.value?.quantityAvailable === 0
)

const catalogLocation = computed(() => getCatalogLocation(product.value?.handle))
const breadcrumbItems = computed(() => {
  const location = catalogLocation.value

  if (!location) {
    return []
  }

  const category = findCatalogCategory(location.categorySlug)
  const system = findCatalogSystem(location.categorySlug, location.systemSlug)
  const subcategory = findCatalogSubcategory(location.categorySlug, location.systemSlug, location.subcategorySlug)

  if (!category || !system || !subcategory) {
    return []
  }

  return [
    {
      label: category.label,
      to: buildButikLink(category.slug)
    },
    {
      label: system.label,
      to: buildButikLink(category.slug, system.slug)
    },
    {
      label: subcategory.label,
      to: buildButikLink(category.slug, system.slug, subcategory.slug)
    }
  ]
})

onMounted(() => {
  loadProduct()
})

const addCurrentVariant = async () => {
  if (!selectedVariant.value?.id || isSoldOut.value || !product.value) {
    return
  }

  await addVariantToCart(selectedVariant.value.id, product.value.title)
}

const variantAvailability = (variant: any) => {
  if (!variant) {
    return ''
  }

  if (variant.availableForSale === false || variant.quantityAvailable === 0) {
    return 'Slutsåld'
  }

  if (typeof variant.quantityAvailable === 'number') {
    return `${variant.quantityAvailable} kvar`
  }

  return 'Finns i lager'
}

useSeoMeta({
  title: () => product.value?.title ? `${product.value.title} | Butik Lyktan` : 'Produkt | Butik Lyktan',
  description: () => product.value?.description || 'Produktsida hos Butik Lyktan.'
})
</script>

<template>
  <main class="product-page">
    <section class="product-shell">
      <UnderConstructionPanel
        v-if="handle !== publicHandle"
        title="Den här produkten är inte öppen ännu."
        text="Vi håller resten av sajten låst medan vi bygger klart. Just nu går det bara att köpa Pokemon Chaos Rising-prereleasen."
      />

      <template v-else>
      <nav v-if="breadcrumbItems.length" class="breadcrumb-nav" aria-label="Breadcrumb">
        <NuxtLink to="/butik" class="breadcrumb-link">Butik</NuxtLink>
        <template v-for="item in breadcrumbItems" :key="item.to">
          <span class="breadcrumb-separator">/</span>
          <NuxtLink :to="item.to" class="breadcrumb-link">{{ item.label }}</NuxtLink>
        </template>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">{{ product?.title }}</span>
      </nav>

      <NuxtLink
        :to="breadcrumbItems.length ? breadcrumbItems[breadcrumbItems.length - 1].to : '/butik'"
        class="back-link"
      >
        Tillbaka till butik
      </NuxtLink>

      <div v-if="loadingProduct" class="product-layout skeleton-layout" aria-hidden="true">
        <div class="image-panel surface-card skeleton-card">
          <div class="skeleton-block skeleton-image"></div>
        </div>

        <div class="details-panel surface-card skeleton-card">
          <div class="skeleton-line skeleton-eyebrow"></div>
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-title short"></div>
          <div class="skeleton-line skeleton-text"></div>
          <div class="skeleton-line skeleton-text"></div>
          <div class="skeleton-line skeleton-text short"></div>

          <div class="purchase-card skeleton-purchase">
            <div class="skeleton-line skeleton-label"></div>
            <div class="skeleton-line skeleton-price"></div>
            <div class="skeleton-line skeleton-stock"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      </div>

      <div v-else-if="error" class="surface-card state-card">
        <p class="eyebrow">API-fel</p>
        <h1>Produkten kunde inte laddas.</h1>
        <p>{{ error.message }}</p>
      </div>

      <div v-else-if="product" class="product-layout">
        <div class="image-panel surface-card">
          <img
            v-if="product.featuredImage?.url"
            :src="product.featuredImage.url"
            :alt="product.featuredImage.altText || product.title"
          >
          <div v-else class="image-fallback">{{ product.title.slice(0, 2).toUpperCase() }}</div>
        </div>

        <div class="details-panel surface-card">
          <p class="eyebrow">Produkt</p>
          <h1>{{ product.title }}</h1>
          <div
            v-if="productDescriptionHtml"
            class="description description-richtext"
            v-html="productDescriptionHtml"
          />
          <p v-else class="description">
            Lägg till en produktbeskrivning i Shopify så visas den här automatiskt.
          </p>

          <div class="purchase-card">
            <div class="price-row">
              <div class="price-block">
                <span class="meta-label">Pris</span>
                <strong>{{ formatMoney(selectedVariant?.price?.amount, selectedVariant?.price?.currencyCode) }}</strong>
              </div>
              <span class="meta-stock">{{ variantAvailability(selectedVariant) }}</span>
            </div>

            <div v-if="variants.length > 1" class="variant-selector">
              <label for="variant" class="meta-label">Välj variant</label>
              <select id="variant" v-model="selectedVariantId" class="variant-select">
                <option v-for="variant in variants" :key="variant.id" :value="variant.id">
                  {{ variant.title }} · {{ formatMoney(variant.price?.amount, variant.price?.currencyCode) }}
                </option>
              </select>
            </div>

            <div class="actions">
              <button
                type="button"
                class="buy-button"
                :disabled="loadingVariantId === selectedVariant?.id || isSoldOut"
                @click="addCurrentVariant"
              >
                {{
                  isSoldOut
                    ? 'Ej tillgänglig'
                    : loadingVariantId === selectedVariant?.id
                      ? 'Lägger till...'
                      : 'Lägg i kundvagn'
                }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="surface-card state-card">
        <p class="eyebrow">Ingen produkt</p>
        <h1>Den här produkten finns inte.</h1>
        <p>Kontrollera handlet i Shopify eller länken du försökte öppna.</p>
      </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  background: #f5f5f7;
  color: #121212;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

:global(*) {
  box-sizing: border-box;
}

:global(a) {
  color: inherit;
  text-decoration: none;
}

:global(button),
:global(select) {
  font: inherit;
}

.product-page {
  min-height: 100vh;
  padding: 18px 16px 48px;
}

.product-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.breadcrumb-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #666b73;
  font-size: 0.86rem;
}

.breadcrumb-link {
  transition: color 0.2s ease;
}

.breadcrumb-link:hover {
  color: #121212;
}

.breadcrumb-separator {
  color: rgba(18, 18, 18, 0.34);
}

.breadcrumb-current {
  color: #121212;
  font-weight: 700;
}

.back-link {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 6px;
  background: white;
  border: 1px solid rgba(18, 18, 18, 0.08);
  font-weight: 700;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.product-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(360px, 0.84fr);
  gap: 18px;
}

.surface-card {
  border: 1px solid rgba(18, 18, 18, 0.08);
  border-radius: 8px;
  background: white;
  box-shadow: 0 14px 34px rgba(24, 26, 32, 0.04);
}

.image-panel {
  overflow: hidden;
  background: #eef0f4;
  display: grid;
  place-items: center;
  padding: 18px;
}

.image-panel img {
  width: 100%;
  height: 100%;
  min-height: 560px;
  max-height: 620px;
  object-fit: contain;
  object-position: center;
  display: block;
}

.image-fallback {
  min-height: 560px;
  display: grid;
  place-items: center;
  color: #ef6c2f;
  font-size: 4rem;
  font-weight: 800;
}

.details-panel,
.state-card {
  padding: 32px;
}

.eyebrow,
.meta-label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  font-weight: 800;
  color: #ef6c2f;
}

h1,
p {
  margin: 0;
}

h1 {
  margin-top: 12px;
  font-size: clamp(2.1rem, 3.8vw, 3.8rem);
  line-height: 0.98;
  letter-spacing: -0.05em;
}

.description,
.state-card p {
  margin-top: 16px;
  color: #666b73;
  line-height: 1.65;
}

.description-richtext :deep(p),
.description-richtext :deep(ul),
.description-richtext :deep(ol) {
  margin: 0 0 14px;
}

.description-richtext :deep(ul),
.description-richtext :deep(ol) {
  padding-left: 20px;
}

.description-richtext :deep(li + li) {
  margin-top: 6px;
}

.description-richtext :deep(strong) {
  color: #121212;
}

.purchase-card {
  margin-top: 26px;
  padding: 18px;
  border: 1px solid rgba(18, 18, 18, 0.08);
  background: linear-gradient(180deg, #fbfbfc, #f5f5f7);
  display: grid;
  gap: 16px;
}

.price-row {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(18, 18, 18, 0.08);
}

.price-block {
  display: grid;
  gap: 6px;
}

.price-block strong {
  font-size: 1.6rem;
  letter-spacing: -0.03em;
}

.meta-stock {
  color: #111111;
  font-weight: 700;
  font-size: 0.92rem;
}

.variant-selector {
  display: grid;
  gap: 8px;
}

.variant-select {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(18, 18, 18, 0.08);
  border-radius: 4px;
  background: white;
}

.actions {
  margin-top: 2px;
}

.buy-button {
  min-height: 48px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border: 1px solid #121212;
  border-radius: 4px;
  background: #121212;
  color: white;
  font-weight: 800;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.buy-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.skeleton-card {
  overflow: hidden;
}

.skeleton-block,
.skeleton-line,
.skeleton-button {
  background: linear-gradient(90deg, #eceef2 0%, #f6f7f9 50%, #eceef2 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-image {
  width: 100%;
  min-height: 560px;
}

.skeleton-line {
  height: 12px;
}

.skeleton-eyebrow {
  width: 96px;
  height: 10px;
}

.skeleton-title {
  width: 82%;
  height: 28px;
  margin-top: 18px;
}

.skeleton-title.short {
  width: 58%;
  margin-top: 10px;
}

.skeleton-text {
  width: 100%;
  margin-top: 16px;
}

.skeleton-text.short {
  width: 72%;
}

.skeleton-purchase {
  margin-top: 26px;
}

.skeleton-label {
  width: 52px;
  height: 10px;
}

.skeleton-price {
  width: 120px;
  height: 30px;
  margin-top: 12px;
}

.skeleton-stock {
  width: 110px;
  margin-top: 18px;
}

.skeleton-button {
  width: 100%;
  height: 48px;
  margin-top: 24px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

.state-card h1 {
  margin-top: 10px;
}

@media (max-width: 920px) {
  .product-layout {
    grid-template-columns: 1fr;
  }

  .image-panel img,
  .image-fallback,
  .skeleton-image {
    min-height: 320px;
    max-height: 360px;
  }

  .details-panel,
  .state-card {
    padding: 24px;
  }
}

@media (max-width: 720px) {
  .product-page {
    padding: 16px 12px 32px;
  }

  .surface-card {
    border-radius: 8px;
  }

  .details-panel,
  .state-card {
    padding: 22px;
  }

  .price-row {
    display: grid;
    align-items: start;
  }
}
</style>
