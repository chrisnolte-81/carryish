import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

import type { Header } from '@/payload-types'

export async function Header() {
  // depth=0 — HeaderClient/HeaderNav hardcode nav links and ignore populated data.
  // Depth=1 was triggering a heavy pages+hero_links lookup that OOMs Neon during
  // concurrent static prerender.
  const headerData: Header = await getCachedGlobal('header', 0)()

  return <HeaderClient data={headerData} />
}
