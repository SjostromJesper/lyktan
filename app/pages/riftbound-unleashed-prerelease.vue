<script setup lang="ts">
const productQuery = `#graphql
  query EventProducts($saturdayHandle: String!, $sundayHandle: String!) {
    saturday: product(handle: $saturdayHandle) {
      id
      title
      handle
      description
      featuredImage {
        url
        altText
      }
      variants(first: 1) {
        nodes {
          id
          title
          availableForSale
          quantityAvailable
          price {
            amount
            currencyCode
          }
        }
      }
    }
    sunday: product(handle: $sundayHandle) {
      id
      title
      handle
      description
      featuredImage {
        url
        altText
      }
      variants(first: 1) {
        nodes {
          id
          title
          availableForSale
          quantityAvailable
          price {
            amount
            currencyCode
          }
        }
      }
    }
  }
`

const productVariables = {
  saturdayHandle: 'riftbound-unleasehed-prerelease',
  sundayHandle: 'riftbound-unleasehed-prerelease-sondag'
}

const {data: products, error} = await useStorefrontData('event-product-page', productQuery, {
  variables: productVariables,
  getCachedData: () => null,
  transform: (data) => ({
    saturday: data.saturday ?? null,
    sunday: data.sunday ?? null
  })
})

const selectedDay = ref<'saturday' | 'sunday'>('saturday')
const product = computed(() => products.value?.[selectedDay.value] ?? products.value?.saturday ?? null)
const variant = computed(() => product.value?.variants?.nodes?.[0] ?? null)
const saturdayVariant = computed(() => products.value?.saturday?.variants?.nodes?.[0] ?? null)
const sundayVariant = computed(() => products.value?.sunday?.variants?.nodes?.[0] ?? null)

const {
  cartOpen,
  loadExistingCart,
  addVariantToCart,
  loadingVariantId,
  formatMoney
} = useShopifyCart()

await loadExistingCart()

const inventoryUpdatedAt = ref<Date | null>(null)
const inventoryError = ref('')
let inventoryRefreshInterval: number | undefined

const refreshProducts = async () => {
  const config = useRuntimeConfig()
  const shopDomain = String(config.public.shopifyStoreDomain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const publicToken = String(config.public.shopifyStorefrontPublicToken || '')

  if (!shopDomain || !publicToken) {
    return
  }

  const response = await fetch(`https://${shopDomain}/api/2026-01/graphql.json?inventory=${Date.now()}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': publicToken
    },
    body: JSON.stringify({
      query: productQuery,
      variables: productVariables
    })
  })

  const result = await response.json()

  if (result.errors?.length) {
    inventoryError.value = result.errors.map((entry: { message: string }) => entry.message).join(', ')
    return
  }

  products.value = {
    saturday: result.data?.saturday ?? null,
    sunday: result.data?.sunday ?? null
  }
  inventoryError.value = ''
  inventoryUpdatedAt.value = new Date()
}

const refreshWhenVisible = () => {
  if (document.visibilityState === 'visible') {
    refreshProducts()
  }
}

onMounted(() => {
  refreshProducts()

  inventoryRefreshInterval = window.setInterval(refreshProducts, 30000)
  window.addEventListener('pageshow', refreshProducts)
  window.addEventListener('focus', refreshProducts)
  document.addEventListener('visibilitychange', refreshWhenVisible)
})

onBeforeUnmount(() => {
  if (inventoryRefreshInterval) {
    window.clearInterval(inventoryRefreshInterval)
  }

  window.removeEventListener('pageshow', refreshProducts)
  window.removeEventListener('focus', refreshProducts)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
})

const availabilityLabel = (quantity?: number | null) => {
  if (typeof quantity !== 'number') {
    return 'Platser uppdateras snart'
  }

  if (quantity <= 0) {
    return 'Slutsalt'
  }

  if (quantity <= 5) {
    return `${quantity} platser kvar`
  }

  return `${quantity} platser kvar`
}

const updatedLabel = computed(() => {
  if (!inventoryUpdatedAt.value) {
    return ''
  }

  return inventoryUpdatedAt.value.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

useSeoMeta({
  title: 'Riftbound: Unleashed Prerelease | Butik Lyktan',
  description: 'Biljettsida for Riftbound: Unleashed Prerelease hos Butik Lyktan.'
})
</script>

<template>
  <main class="product-page">
    <CartDrawer/>

    <section class="product-shell">
      <NuxtLink to="/" class="back-link">Tillbaka</NuxtLink>

      <div v-if="error" class="surface-card state-card">
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
          <img
              v-else
              src="/images/events/riftbound-unleashed.jpg"
              alt="Riftbound Unleashed"
          >
        </div>

        <div class="details-panel surface-card">
          <p class="eyebrow">Eventbiljett</p>
          <h1>Riftbound: Unleashed Prerelease</h1>

          <div class="day-selector">
            <button
                type="button"
                class="day-button"
                :class="{ active: selectedDay === 'saturday' }"
                @click="selectedDay = 'saturday'"
            >
              <span class="day-name">Lördag</span>
              <span class="day-stock">{{ availabilityLabel(saturdayVariant?.quantityAvailable) }}</span>
            </button>
            <button
                type="button"
                class="day-button"
                :class="{ active: selectedDay === 'sunday' }"
                @click="selectedDay = 'sunday'"
            >
              <span class="day-name">Söndag</span>
              <span class="day-stock">{{ availabilityLabel(sundayVariant?.quantityAvailable) }}</span>
            </button>
          </div>
          <p v-if="updatedLabel" class="inventory-updated">
            Platser senast uppdaterade {{ updatedLabel }}.
          </p>
          <p v-if="inventoryError" class="inventory-error">
            Kunde inte uppdatera platser just nu.
          </p>

          <div class="meta-grid">
            <article>
              <span class="meta-label">Vald biljett</span>
              <strong>{{ product.title }}</strong>
            </article>
            <article>
              <span class="meta-label">Pris</span>
              <strong>{{ formatMoney(variant?.price?.amount, variant?.price?.currencyCode) }}</strong>
            </article>
          </div>

          <p class="description">
            Vill du vara med på vår prerelease för Riftbound: Unleashed? köp din biljett här.
          </p>
          <p>
            Kom ihåg att skriva ditt
            fullständiga namn och mailadressen du använder i carde.io i betalningen
          </p>
          <ul>
            <li>datum: 2 & 3 maj
              </li>
            <li>Registrering 12:00</li>
            <li>startar 12:30</li>
            <li>runda 1 13:10</li>
            <li>lunch: 14:05</li>
            <li>runda 2: 15:05</li>
            <li>runda 3: 16:00</li>
          </ul>

          <div class="actions">
            <button
                type="button"
                class="buy-button"
                :disabled="loadingVariantId === variant?.id || !variant?.availableForSale"
                @click="variant?.id && addVariantToCart(variant.id, product.title).then(refreshProducts)"
            >
              {{
                !variant?.availableForSale
                    ? 'Ej tillgänglig'
                    : loadingVariantId === variant?.id
                        ? 'Lägger till...'
                        : 'Lägg i kundvagn'
              }}
            </button>

          </div>
        </div>
      </div>

      <div v-else class="surface-card state-card">
        <p class="eyebrow">Ingen produkt</p>
        <h1>Det finns ingen produkt att visa än.</h1>
        <p>Kontrollera att både lördags- och söndagsbiljetten finns publicerade i lager.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>

:global(body) {
  margin: 0;
  background: linear-gradient(180deg, #edf0fb 0%, #e3e6f3 100%);
  color: #171717;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

:global(*) {
  box-sizing: border-box;
}

:global(button) {
  font: inherit;
}

:global(a) {
  color: inherit;
  text-decoration: none;
}

.product-page {
  min-height: 100vh;
  padding: 28px;
  background-color: #EDF0FA;
  color: #171717;
}

.product-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 20px;
}

.back-link {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(23, 23, 23, 0.08);
  font-weight: 700;
}

.product-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(360px, 0.85fr);
  gap: 20px;
}

.surface-card {
  border: 1px solid rgba(23, 23, 23, 0.08);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 60px rgba(20, 24, 22, 0.08);
}

.image-panel {
  overflow: hidden;
}

.image-panel img {
  width: 100%;
  height: 100%;
  min-height: 620px;
  object-fit: cover;
  display: block;
}

.details-panel,
.state-card {
  padding: 30px;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #4f54f3;
}

h1,
p {
  margin: 0;
}

h1 {
  margin-top: 12px;
  font-size: clamp(2.6rem, 4vw, 4.5rem);
  line-height: 0.94;
  letter-spacing: -0.05em;
}

h1 {
  font-size: 2rem;
}

.description,
.state-card p {
  color: #5f6471;
  line-height: 1.7;
}


.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 24px 0;
}

.day-selector {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.day-button {
  display: grid;
  gap: 4px;
  justify-items: start;
  padding: 16px 18px;
  border-radius: 20px;
  border: 1px solid rgba(23, 23, 23, 0.08);
  background: white;
  cursor: pointer;
  transition: transform 180ms ease,
  border-color 180ms ease,
  box-shadow 180ms ease,
  background 180ms ease;
}

.day-button:hover {
  transform: translateY(-1px);
}

.day-button.active {
  border-color: rgba(81, 99, 255, 0.3);
  background: linear-gradient(180deg, rgba(81, 99, 255, 0.08), rgba(81, 99, 255, 0.02));
  box-shadow: 0 16px 30px rgba(81, 99, 255, 0.12);
}

.day-name {
  font-weight: 800;
  font-size: 1rem;
}

.day-stock {
  margin-top: 4px;
  color: #2f3dcc;
  font-size: 0.9rem;
  font-weight: 700;
}

.inventory-updated {
  margin-top: 10px;
  color: #72788a;
  font-size: 0.9rem;
}

.inventory-error {
  margin-top: 10px;
  color: #b93b30;
  font-size: 0.9rem;
  font-weight: 700;
}

.meta-grid article {
  padding: 16px;
  border-radius: 20px;
  background: #eef1fb;
}

.meta-label {
  display: block;
  margin-bottom: 8px;
  color: #72788a;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.meta-grid strong {
  font-size: 1.05rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.buy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 800;
  cursor: pointer;
}

.buy-button {
  color: white;
  background: linear-gradient(135deg, #5163ff, #2f3dcc);
  box-shadow: 0 18px 40px rgba(81, 99, 255, 0.24);
}

.ghost-button {
  color: #171717;
  border-color: rgba(23, 23, 23, 0.08);
  background: white;
}

.buy-button:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (max-width: 980px) {
  .product-layout {
    grid-template-columns: 1fr;
  }

  .image-panel img {
    min-height: 420px;
  }
}

@media (max-width: 720px) {
  .product-page {
    padding: 14px;
  }

  .surface-card {
    border-radius: 22px;
  }

  .details-panel,
  .state-card {
    padding: 22px;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }

  .day-selector {
    grid-template-columns: 1fr;
  }

  .actions {
    display: grid;
  }
}
</style>
