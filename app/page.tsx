import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Problem from '@/components/Problem'
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
    <PageFade>
      <Nav />
      <Hero />
      <Problem />
      <Roles />
      <HowItWorks />
      <UseCases />
      <Comparison />
      <Pricing />
      <FooterCta />
      <SiteFooter />
    </PageFade>
  )
}
