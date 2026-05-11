<script setup lang="ts">
const featuredProduct = {
  handle: 'pokemon-chaos-rising-prerelease',
  link: '/produkter/pokemon-chaos-rising-prerelease',
  eyebrow: 'Kommande event',
  title: 'Pokemon Prerelease: Chaos Rising',
  text: 'Var med på Butik Lyktans Pokemon Prerelease for Chaos Rising. Säkra din plats direkt och hoppa rakt in i eventet via produktsidan.'
}

const homepageQuery = `#graphql
  query HomepageProducts($featuredHandle: String!) {
    featured: product(handle: $featuredHandle) {
      id
      title
      handle
      featuredImage {
        url
        altText
      }
      variants(first: 1) {
        nodes {
          id
          price {
            amount
            currencyCode
          }
        }
      }
    }
    latestTagged: products(first: 5, sortKey: UPDATED_AT, reverse: true, query: "tag:nyhet") {
      nodes {
        id
        title
        handle
        featuredImage {
          url
          altText
        }
        variants(first: 1) {
          nodes {
            id
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
    latestRecent: products(first: 5, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        featuredImage {
          url
          altText
        }
        variants(first: 1) {
          nodes {
            id
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`

const { data, error } = await useStorefrontData('homepage-products', homepageQuery, {
  variables: {
    featuredHandle: featuredProduct.handle
  },
  transform: (result) => ({
    featured: result.featured ?? null,
    latestTagged: result.latestTagged?.nodes ?? [],
    latestRecent: result.latestRecent?.nodes ?? []
  })
})

const heroProduct = computed(() => data.value?.featured ?? null)

useSeoMeta({
  title: 'Butik Lyktan',
  description: 'Spelbutik med event, miniatyrspel, kortspel, brädspel och rollspel.'
})
</script>

<template>
  <main class="home-page">
    <div class="page-shell">
      <section class="hero-card surface-card">
        <div class="hero-copy">
          <p class="eyebrow">{{ featuredProduct.eyebrow }}</p>
          <h1>{{ featuredProduct.title }}</h1>
          <p class="lead">{{ featuredProduct.text }}</p>

          <div class="hero-actions">
            <NuxtLink :to="featuredProduct.link" class="primary-button">
              Boka din plats
            </NuxtLink>
          </div>
        </div>

        <div class="hero-media">
          <img
            v-if="heroProduct?.featuredImage?.url"
            :src="heroProduct.featuredImage.url"
            :alt="heroProduct.featuredImage.altText || heroProduct.title"
          >
          <img
            v-else
            src="/images/events/riftbound-unleashed.jpg"
            alt="Pokemon Chaos Rising"
          >
        </div>
      </section>

      <UnderConstructionPanel
        title="Fler delar av sajten öppnar snart."
        text="Just nu är det bara Pokemon Chaos Rising-prereleasen som är öppen för bokning. Resten av sajten är tillfälligt låst medan vi bygger klart butiken."
      />
    </div>
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

.home-page {
  min-height: 100vh;
  padding: 18px 16px 48px;
}

.page-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 22px;
}

.surface-card {
  border: 1px solid rgba(18, 18, 18, 0.08);
  border-radius: 8px;
  background: white;
  box-shadow: 0 14px 34px rgba(24, 26, 32, 0.04);
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(340px, 0.96fr);
  gap: 0;
  overflow: hidden;
}

.hero-copy {
  padding: 38px 34px;
  background: linear-gradient(180deg, #fbfbfc, #f5f5f7);
  border-right: 1px solid rgba(18, 18, 18, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-media {
  overflow: hidden;
  background: #eef0f4;
  display: grid;
  place-items: center;
  padding: 18px;
}

.hero-media img {
  width: 100%;
  height: 100%;
  min-height: 390px;
  max-height: 420px;
  object-fit: contain;
  object-position: center;
  display: block;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  font-weight: 800;
  color: #ef6c2f;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1,
h2,
h3 {
  letter-spacing: -0.045em;
  line-height: 0.98;
}

h1 {
  margin-top: 12px;
  font-size: clamp(2.5rem, 4.5vw, 4.4rem);
}

h2 {
  font-size: clamp(2rem, 3.2vw, 3rem);
}

h3 {
  font-size: 1.08rem;
}

.lead,
.story-copy p,
.section-note,
.state-card p,
.product-copy p {
  color: #666b73;
  line-height: 1.6;
}

.lead {
  margin-top: 16px;
  max-width: 50ch;
  font-size: 1rem;
}

.hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 26px;
}

.primary-button {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid #121212;
  background: #121212;
  color: white;
  font-weight: 800;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hero-price {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  border-radius: 6px;
  background: white;
  border: 1px solid rgba(18, 18, 18, 0.08);
  font-weight: 800;
}

.story-section {
  display: grid;
  gap: 14px;
}

.story-copy {
  max-width: 820px;
  margin: 0 auto;
  text-align: center;
}

.story-copy h2 {
  margin: 12px 0 16px;
}

.story-image {
  overflow: hidden;
}

.story-placeholder {
  min-height: 340px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, #f3f4f6, #eceef2);
  color: #7a7f92;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.product-section {
  display: grid;
  gap: 14px;
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px;
}

.section-head h2 {
  margin-top: 10px;
}

.section-note code {
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: #efeff4;
  color: #121212;
  font-family: inherit;
  font-size: 0.92em;
}

.latest-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.product-card {
  padding: 12px;
  display: grid;
  gap: 10px;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  border-color: rgba(239, 108, 47, 0.2);
  box-shadow: 0 18px 28px rgba(24, 26, 32, 0.06);
}

.product-image {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 4px;
  background: #f1f2f6;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.product-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #7d64ff;
  font-size: 1.5rem;
  font-weight: 800;
}

.product-copy {
  display: grid;
  gap: 6px;
}

.product-copy h3 {
  font-size: 0.98rem;
  line-height: 1.18;
}

.product-copy p {
  color: #121212;
  font-weight: 800;
}

.state-card {
  padding: 24px;
}

.state-card h3 {
  margin: 10px 0 12px;
}

@media (max-width: 1100px) {
  .latest-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .hero-card {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    border-right: 0;
    border-bottom: 1px solid rgba(18, 18, 18, 0.08);
  }

  .hero-media img {
    min-height: 260px;
    max-height: 320px;
  }

  .section-head {
    display: grid;
    align-items: start;
  }
}

@media (max-width: 720px) {
  .home-page {
    padding: 16px 12px 32px;
  }

  .surface-card {
    border-radius: 8px;
  }

  .hero-card {
    gap: 0;
  }

  .hero-copy {
    padding: 20px;
  }

  .story-placeholder {
    min-height: 220px;
  }

  .latest-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 520px) {
  .latest-grid {
    grid-template-columns: 1fr;
  }
}
</style>
