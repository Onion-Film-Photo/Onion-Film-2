import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import HeroReveal from '@/components/HeroReveal'
import ScrollPill from '@/components/ScrollPill'
import Problem from '@/components/Problem'
import ScrollReveal from '@/components/ScrollReveal'
import Roles from '@/components/Roles'
import HowItWorks from '@/components/HowItWorks'
import UseCases from '@/components/UseCases'
import Comparison from '@/components/Comparison'
import Pricing from '@/components/Pricing'
import FooterCta from '@/components/FooterCta'
import SiteFooter from '@/components/SiteFooter'
import PageFade from '@/components/PageFade'

export default function Home() {
  return (
    <>
    <ScrollPill />
    <PageFade>
      <Nav />
      <Hero />
      <HeroReveal />
      <Problem />
      <ScrollReveal />
      <Roles />
      <HowItWorks />
      <UseCases />
      <Comparison />
      <Pricing />
      <FooterCta />
      <SiteFooter />
    </PageFade>
    </>
  )
}
