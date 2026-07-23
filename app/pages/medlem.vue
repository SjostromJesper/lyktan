<script setup lang="ts">
// Page isn't finished yet (purchase flow still pending Shopify Subscriptions
// setup) — redirect away until it's ready. Remove this line to re-enable.
await navigateTo('/', { redirectCode: 302 })

const tiers = [
  {
    name: 'Vanligt medlemskap',
    price: '125 kr',
    highlight: false,
    benefits: [
      'Medlemspris istället för dagspass på våra ordinarie spelkvällar, som Commander-kvällarna.',
      'Du är med och stöttar community-kvällarna i butiken.'
    ]
  },
  {
    name: 'Stort medlemskap',
    price: '200 kr',
    highlight: true,
    benefits: [
      'Allt som ingår i vanligt medlemskap.',
      'Dessutom medlemspris istället för dagspass på våra miniatyrspelskvällar, som Warhammer 40 000 och Age of Sigmar.'
    ]
  }
]

const durations = ['1 månad', '3 månader', '6 månader', '1 år']

useSeoMeta({
  title: 'Medlemskap | Butik Lyktan',
  description: 'Bli medlem hos Butik Lyktan och få medlemspris på våra spelkvällar, inklusive miniatyrspel som Warhammer 40 000 och Age of Sigmar.'
})
</script>

<template>
  <main class="px-4 pb-24 pt-10 sm:px-6">
    <div class="page-shell grid gap-14">
      <div>
        <p class="eyebrow">Medlemskap</p>
        <h1 class="mt-2 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          Bli medlem i Butik Lyktan
        </h1>
        <p class="mt-3 max-w-xl text-sm leading-7 text-lyktan-mute">
          Som medlem får du medlemspris istället för dagspass på våra spelkvällar, och du är med
          och bygger vidare på communityn i butiken. Vi har två nivåer beroende på vad du vill spela.
        </p>
      </div>

      <section>
        <div class="grid gap-6 sm:grid-cols-2">
          <div
            v-for="tier in tiers"
            :key="tier.name"
            class="rounded-2xl p-6 sm:p-8"
            :class="tier.highlight ? 'bg-lyktan-ink text-white' : 'bg-lyktan-surface text-lyktan-ink'"
          >
            <p
              class="eyebrow"
              :class="tier.highlight ? '!text-white/60' : ''"
            >
              {{ tier.highlight ? 'Störst tillgång' : 'Grundnivå' }}
            </p>
            <h2 class="mt-2 text-[1.4rem] font-semibold tracking-[-0.01em]">
              {{ tier.name }}
            </h2>
            <p class="mt-3 text-3xl font-semibold tracking-[-0.01em]">
              {{ tier.price }}
              <span class="text-sm font-normal" :class="tier.highlight ? 'text-white/60' : 'text-lyktan-mute'">
                / period
              </span>
            </p>

            <ul class="mt-6 grid gap-3 text-sm leading-6">
              <li v-for="benefit in tier.benefits" :key="benefit" class="flex gap-2">
                <span :class="tier.highlight ? 'text-white/60' : 'text-lyktan-accent'">·</span>
                <span :class="tier.highlight ? 'text-white/85' : 'text-lyktan-mute'">{{ benefit }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <p class="eyebrow">Längd</p>
        <h2 class="mt-2 text-[clamp(1.3rem,2.4vw,1.6rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          Välj hur länge du vill vara medlem
        </h2>
        <p class="mt-3 max-w-xl text-sm leading-7 text-lyktan-mute">
          Båda nivåerna går att teckna för olika perioder, så du kan välja det som passar dig bäst.
        </p>

        <div class="mt-6 flex flex-wrap gap-3">
          <span
            v-for="duration in durations"
            :key="duration"
            class="inline-flex min-h-9 items-center rounded-full bg-lyktan-surface px-4 text-sm text-lyktan-ink"
          >
            {{ duration }}
          </span>
        </div>

        <div class="mt-8 rounded-2xl bg-lyktan-surface p-6 sm:p-8">
          <p class="eyebrow">Så blir du medlem</p>
          <h3 class="mt-2 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
            Just nu tecknar du medlemskap i butiken
          </h3>
          <p class="mt-3 max-w-xl text-sm leading-7 text-lyktan-mute">
            Kom förbi butiken i Järfälla så ordnar vi ditt medlemskap på plats. Vi bygger just nu
            ut sajten så att du snart kan välja nivå och period och köpa medlemskapet direkt här.
          </p>
        </div>
      </section>
    </div>
  </main>
</template>
