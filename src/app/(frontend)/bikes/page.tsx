import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { BikesClient } from './BikesClient'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function BikesPage() {
  const payload = await getPayload({ config: configPromise })

  const products = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 200,
    overrideAccess: false,
    sort: '-publishedAt',
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  const serializedProducts = products.docs.map((product) => {
    const brand = product.brand && typeof product.brand === 'object' ? product.brand.name : null

    // Strip redundant brand prefix from product name for card display
    // e.g. "Tern GSD Gen 3" with brand "Tern" → "GSD Gen 3"
    let displayName = product.name
    if (brand && displayName.startsWith(brand + ' ')) {
      displayName = displayName.slice(brand.length + 1)
    }

    // Extract first real image (skip auto-generated info cards ending in -card.png)
    let thumbnailImage = null
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (typeof img === 'object' && img !== null) {
          const filename = img.filename || ''
          if (!filename.endsWith('-card.png')) {
            thumbnailImage = img
            break
          }
        }
      }
    }

    // Determine if electric based on powerType field or motor fields
    const isElectric = product.powerType
      ? product.powerType === 'electric' || product.powerType === 'pedal-assist'
      : !!(product.motorBrand || product.motorPosition || product.batteryWh)

    return {
      id: product.id,
      name: displayName,
      slug: product.slug || '',
      brand,
      category: product.category || '',
      price: product.price ?? 0,
      thumbnailImage,
      // Scores
      overallScore: product.overallScore ?? null,
      hillScore: product.hillScore ?? null,
      cargoScore: product.cargoScore ?? null,
      rangeScore: product.rangeScore ?? null,
      valueScore: product.valueScore ?? null,
      familyScore: product.familyScore ?? null,
      // Motor
      motorBrand: product.motorBrand || null,
      motorPosition: product.motorPosition || null,
      motorTorqueNm: product.motorTorqueNm ?? null,
      topSpeedMph: product.topSpeedMph ?? null,
      bikeClass: product.bikeClass || null,
      throttle: product.throttle || null,
      // Battery
      batteryWh: product.batteryWh ?? null,
      estimatedRealRangeMi: product.estimatedRealRangeMi ?? null,
      batteryRemovable: product.batteryRemovable ?? null,
      dualBatteryCapable: product.dualBatteryCapable ?? null,
      // Dimensions
      weightLbs: product.weightLbs ?? null,
      maxSystemWeightLbs: product.maxSystemWeightLbs ?? null,
      cargoCapacityLbs: product.cargoCapacityLbs ?? null,
      foldable: product.foldable ?? null,
      fitsInElevator: product.fitsInElevator ?? null,
      // Drivetrain
      drivetrainType: product.drivetrainType || null,
      gearType: product.gearType || null,
      brakeType: product.brakeType || null,
      // Cargo & Family
      cargoLayout: product.cargoLayout || null,
      maxChildPassengers: product.maxChildPassengers ?? null,
      hasSeatbelts: product.hasSeatbelts ?? null,
      hasRainCover: product.hasRainCover ?? null,
      rainCoverAvailable: product.rainCoverAvailable ?? null,
      // Safety
      integratedLights: product.integratedLights ?? null,
      gpsTracking: product.gpsTracking ?? null,
      alarm: product.alarm ?? null,
      // Comfort
      suspensionType: product.suspensionType || null,
      // Tags
      bestFor: product.bestFor?.map((b) => b.tag) || [],
      testingStatus: product.testingStatus || null,
      isElectric,
      powerType: (product.powerType as string) || null,
    }
  })

  const brands = [...new Set(serializedProducts.map((p) => p.brand).filter(Boolean))] as string[]

  return <BikesClient products={serializedProducts} brands={brands} />
}

export function generateMetadata(): Metadata {
  return {
    title: 'Bikes & Gear | Carryish',
    description: 'Browse cargo bikes, strollers, trailers, wagons, and accessories. Honest reviews with real tradeoffs.',
  }
}
