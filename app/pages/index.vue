<script setup lang="ts">
useSeoMeta({
  title: 'Riftbound: Unleashed Prerelease | Butik Lyktan',
  description: 'Sakra din plats till Riftbound: Unleashed Prerelease hos Butik Lyktan.'
})
</script>

<template>
  <main class="landing">
    <section class="hero">
      <div class="backdrop"></div>

      <div class="content">
        <div class="copy-panel">
          <p class="eyebrow">Butik Lyktan presenterar</p>
          <h1>Riftbound: Unleashed Prerelease</h1>
          <p class="lead">
            Joina oss för Butik Lyktans allra första event – och vår första prerelease för Riftbound.

            Vi kör både lördag 2 maj och söndag 3 maj, så du kan välja dagen som passar dig bäst. Kom och spela och vara med från start när Riftbound drar igång hos oss.
          </p>

          <NuxtLink to="/riftbound-unleashed-prerelease" class="cta-button">
            Köp biljett här
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  background: #130f12;
  color: white;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

:global(*) {
  box-sizing: border-box;
}

:global(a) {
  color: inherit;
  text-decoration: none;
}

.landing {
  min-height: 100vh;
}

.hero {
  position: relative;
  min-height: 100vh;
  background:
    linear-gradient(90deg, rgba(11, 12, 28, 0.08) 0%, rgba(11, 12, 28, 0.24) 34%, rgba(11, 12, 28, 0.76) 68%, rgba(11, 12, 28, 0.92) 100%),
    url('/images/events/riftbound-unleashed.jpg') center center / cover no-repeat;
}

.backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.08), transparent 32%),
    linear-gradient(180deg, rgba(19, 15, 18, 0.06), rgba(19, 15, 18, 0.24));
}

.content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 32px;
}

.copy-panel {
  width: min(520px, 100%);
  padding: 36px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(20, 22, 52, 0.78), rgba(10, 11, 26, 0.88));
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #a9b9ff;
}

h1,
p {
  margin: 0;
}

h1 {
  margin-top: 14px;
  font-size: clamp(2.8rem, 5vw, 5rem);
  line-height: 0.94;
  letter-spacing: -0.05em;
}

.lead,
.body-copy {
  color: rgba(241, 244, 255, 0.84);
  line-height: 1.7;
}

.lead {
  margin-top: 18px;
  font-size: 1.06rem;
}

.body-copy {
  margin-top: 14px;
  font-size: 0.98rem;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 28px;
  min-height: 54px;
  padding: 0 22px;
  border-radius: 999px;
  color: white;
  font-weight: 800;
  background: linear-gradient(135deg, #5163ff, #2f3dcc);
  box-shadow: 0 18px 40px rgba(81, 99, 255, 0.32);
}

@media (max-width: 900px) {
  .hero {
    background-position: 42% center;
  }

  .content {
    justify-content: center;
    align-items: end;
  }

  .copy-panel {
    padding: 26px;
  }
}

@media (max-width: 640px) {
  .content {
    padding: 14px;
  }

  .copy-panel {
    width: 100%;
    border-radius: 22px;
  }
}
</style>
