<script setup lang="ts">
type Plan = {
  variantId: string
  tier: 'litet' | 'stort'
  months: 1 | 6 | 12
  priceKr: number
  availableForSale: boolean
}

const tiers = [
  {
    tier: 'litet' as const,
    name: 'Litet medlemskap',
    highlight: false,
    benefits: [
      'Medlemspris istället för dagspass på våra ordinarie spelkvällar, som Commander-kvällarna.',
      'Du är med och stöttar community-kvällarna i butiken.'
    ]
  },
  {
    tier: 'stort' as const,
    name: 'Stort medlemskap',
    highlight: true,
    benefits: [
      'Allt som ingår i litet medlemskap.',
      'Dessutom medlemspris istället för dagspass på våra miniatyrspelskvällar, som Warhammer 40 000 och Age of Sigmar.'
    ]
  }
]

const monthLabels: Record<number, string> = { 1: '1 månad', 6: '6 månader', 12: '12 månader' }

const steps = [
  {
    number: '1',
    title: 'Välj nivå och period',
    text: 'Litet eller stort medlemskap, för 1, 6 eller 12 månader — precis så länge du vill binda dig.'
  },
  {
    number: '2',
    title: 'Fyll i dina uppgifter och betala',
    text: 'Namn och e-post kopplas till medlemskapet, sen går du vidare till vår vanliga betalning.'
  },
  {
    number: '3',
    title: 'Redo att användas i butiken',
    text: 'Medlemskapet aktiveras automatiskt direkt efter köpet — personalen kan slå upp det i kassan.'
  }
]

const { data } = await useAsyncData('membership-plans', () => $fetch<{ plans: Plan[] }>('/api/shopify/membership-plans'))
const plans = computed(() => data.value?.plans ?? [])

const plansForTier = (tier: 'litet' | 'stort') =>
  [...plans.value.filter((p) => p.tier === tier)].sort((a, b) => a.months - b.months)

const { startMembershipCheckout } = useShopifyCart()

const selectedPlan = ref<Plan | null>(null)
const name = ref('')
const phone = ref('')
const email = ref('')
const submitting = ref(false)
const formError = ref('')

const openPlan = (plan: Plan) => {
  selectedPlan.value = plan
  formError.value = ''
}

const closeForm = () => {
  if (submitting.value) return
  selectedPlan.value = null
}

const submit = async () => {
  if (!selectedPlan.value) return

  if (!name.value.trim() || !email.value.trim()) {
    formError.value = 'Namn och e-post krävs.'
    return
  }

  submitting.value = true
  formError.value = ''

  try {
    const url = await startMembershipCheckout({
      variantId: selectedPlan.value.variantId,
      tier: selectedPlan.value.tier,
      months: selectedPlan.value.months,
      name: name.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim()
    })

    window.location.href = url
  } catch (err: any) {
    formError.value = err?.message || 'Något gick fel, försök igen.'
    submitting.value = false
  }
}

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
          och bygger vidare på communityn i butiken. Välj nivå och period, betala direkt här —
          medlemskapet aktiveras automatiskt.
        </p>
      </div>

      <section class="grid gap-6 sm:grid-cols-2">
        <div
          v-for="t in tiers"
          :key="t.tier"
          class="rounded-2xl p-6 sm:p-8"
          :class="t.highlight ? 'bg-lyktan-ink text-white' : 'bg-lyktan-surface text-lyktan-ink'"
        >
          <p class="eyebrow" :class="t.highlight ? '!text-white/60' : ''">
            {{ t.highlight ? 'Störst tillgång' : 'Grundnivå' }}
          </p>
          <h2 class="mt-2 text-[1.4rem] font-semibold tracking-[-0.01em]">
            {{ t.name }}
          </h2>

          <ul class="mt-4 grid gap-3 text-sm leading-6">
            <li v-for="benefit in t.benefits" :key="benefit" class="flex gap-2">
              <span :class="t.highlight ? 'text-white/60' : 'text-lyktan-accent'">·</span>
              <span :class="t.highlight ? 'text-white/85' : 'text-lyktan-mute'">{{ benefit }}</span>
            </li>
          </ul>

          <div class="mt-6 grid gap-2">
            <button
              v-for="plan in plansForTier(t.tier)"
              :key="plan.variantId"
              type="button"
              class="flex min-h-11 items-center justify-between rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
              :class="t.highlight ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white text-lyktan-ink hover:bg-black/[0.04]'"
              :disabled="!plan.availableForSale"
              @click="openPlan(plan)"
            >
              <span>{{ monthLabels[plan.months] }}</span>
              <span>{{ plan.priceKr }} kr</span>
            </button>

            <p v-if="!plansForTier(t.tier).length" class="text-sm" :class="t.highlight ? 'text-white/60' : 'text-lyktan-mute'">
              Inga alternativ tillgängliga just nu.
            </p>
          </div>
        </div>
      </section>

      <section>
        <p class="eyebrow">Så funkar det</p>
        <h2 class="mt-2 text-[clamp(1.3rem,2.4vw,1.6rem)] font-semibold tracking-[-0.01em] text-lyktan-ink">
          Klart direkt när betalningen gått igenom
        </h2>

        <div class="mt-6 grid gap-6 sm:grid-cols-3">
          <div v-for="step in steps" :key="step.title">
            <p class="text-2xl font-semibold tracking-[-0.01em] text-lyktan-accent">{{ step.number }}</p>
            <h3 class="mt-2 text-[0.95rem] font-semibold text-lyktan-ink">{{ step.title }}</h3>
            <p class="mt-1 text-sm leading-6 text-lyktan-mute">{{ step.text }}</p>
          </div>
        </div>

        <p class="mt-6 max-w-xl text-sm leading-7 text-lyktan-mute">
          Redan medlem sedan tidigare? Fyll i samma namn och e-post som du använde förra gången —
          då förlängs ditt befintliga medlemskap med de nya månaderna istället för att ett nytt skapas.
        </p>
      </section>
    </div>

    <div v-if="selectedPlan" class="fixed inset-0 z-[95] flex items-center justify-center bg-black/30 p-4" @click.self="closeForm">
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div class="mb-5 flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">{{ selectedPlan.tier === 'stort' ? 'Stort medlemskap' : 'Litet medlemskap' }}</p>
            <h2 class="mt-1 text-xl font-semibold tracking-[-0.01em] text-lyktan-ink">
              {{ monthLabels[selectedPlan.months] }} — {{ selectedPlan.priceKr }} kr
            </h2>
          </div>
          <button type="button" aria-label="Stäng" class="text-lyktan-mute hover:text-lyktan-ink" @click="closeForm">✕</button>
        </div>

        <form class="grid gap-4" @submit.prevent="submit">
          <div>
            <label for="member-name" class="eyebrow">Namn</label>
            <input
              id="member-name"
              v-model="name"
              type="text"
              required
              class="mt-2 min-h-12 w-full rounded-lg border border-black/12 bg-white px-4 text-sm text-lyktan-ink"
            >
          </div>

          <div>
            <label for="member-email" class="eyebrow">E-post</label>
            <input
              id="member-email"
              v-model="email"
              type="email"
              required
              class="mt-2 min-h-12 w-full rounded-lg border border-black/12 bg-white px-4 text-sm text-lyktan-ink"
            >
          </div>

          <div>
            <label for="member-phone" class="eyebrow">Telefon</label>
            <input
              id="member-phone"
              v-model="phone"
              type="tel"
              class="mt-2 min-h-12 w-full rounded-lg border border-black/12 bg-white px-4 text-sm text-lyktan-ink"
            >
          </div>

          <p class="text-[0.8rem] text-lyktan-mute">
            Har du redan ett medlemskap läggs de köpta månaderna på ditt nuvarande. Annars skapas ett nytt.
          </p>

          <p v-if="formError" class="text-sm text-lyktan-accent">
            {{ formError }}
          </p>

          <button type="submit" class="primary-cta" :disabled="submitting">
            {{ submitting ? 'Skickar till betalning...' : 'Gå till betalning' }}
          </button>
        </form>
      </div>
    </div>
  </main>
</template>
