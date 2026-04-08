import type { Payload, PayloadRequest } from 'payload'

const brandsData = [
  {
    name: 'Tern',
    slug: 'tern',
    websiteUrl: 'https://www.ternbicycles.com',
    description:
      'Compact cargo bikes that fit in elevators and bike rooms. The GSD and HSD run Bosch drivetrains and have the best accessory system in the business.',
  },
  {
    name: 'Rad Power Bikes',
    slug: 'rad-power-bikes',
    websiteUrl: 'https://www.radpowerbikes.com',
    description:
      'Biggest e-bike brand in the US. The RadWagon put affordable cargo biking on the map. Direct-to-consumer, solid customer service when things break.',
  },
  {
    name: 'Aventon',
    slug: 'aventon',
    websiteUrl: 'https://www.aventon.com',
    description:
      'DTC brand that punches above its price. The Abound brought GPS tracking and alarm systems to sub-$2K cargo bikes. Nobody else is doing that at this price.',
  },
  {
    name: 'Lectric',
    slug: 'lectric',
    websiteUrl: 'https://www.lectricebikes.com',
    description:
      'Value play out of Phoenix. The XPedition2 is modular — buy the base, add batteries and accessories as you need them. Aggressive pricing without feeling cheap.',
  },
  {
    name: 'Urban Arrow',
    slug: 'urban-arrow',
    websiteUrl: 'https://www.urbanarrow.com',
    description:
      'Dutch box bike specialists. The Family model is what half of Amsterdam rides. Bosch motor, Gates belt drive, built for daily school runs in any weather.',
  },
  {
    name: 'Yuba',
    slug: 'yuba',
    websiteUrl: 'https://www.yubabikes.com',
    description:
      "Been making cargo bikes longer than most brands have existed. The Spicy Curry and Kombi are longtail staples. Best accessory ecosystem for families — kid seats, rails, bags, all of it.",
  },
  {
    name: 'Riese & Müller',
    slug: 'riese-muller',
    websiteUrl: 'https://www.riese-und-muller.com',
    description:
      'German-engineered, full-suspension cargo bikes. The Load and Packster cost serious money and ride like it. You get what you pay for here.',
  },
  {
    name: 'Benno',
    slug: 'benno',
    websiteUrl: 'https://www.bennobikes.com',
    description:
      'Founded by the guy who created Electra. The Boost handles like a sporty commuter until you load it up — then it handles the weight without complaint. Bosch-powered compacts.',
  },
  {
    name: 'Specialized',
    slug: 'specialized',
    websiteUrl: 'https://www.specialized.com',
    description:
      'Biggest bike company in the world finally showed up to cargo. The Globe Haul LT has 3.5-inch tires and a 441-pound weight limit. Took them long enough.',
  },
  {
    name: 'Xtracycle',
    slug: 'xtracycle',
    websiteUrl: 'https://www.xtracycle.com',
    description:
      "Invented the longtail cargo bike category. The Swoop and Hopper come with Hooptie safety rails included — most brands charge extra for those. Premium build, premium price.",
  },
  {
    name: 'Trek',
    slug: 'trek',
    websiteUrl: 'https://www.trekbikes.com',
    description:
      "World's largest bike brand. The Fetch+ is their front-loader — belt drive, Bosch motor, big cargo box. Easy to service at any Trek dealer, which matters.",
  },
  {
    name: 'Gazelle',
    slug: 'gazelle',
    websiteUrl: 'https://www.gazelle.nl',
    description:
      '130 years of Dutch cycling heritage. The Cabby is a practical longtail — MIK rack system lets you swap child seats and crates in 10 seconds. No drama, just works.',
  },
]

const categoriesData = [
  {
    title: 'Cargo Bikes',
    slug: 'cargo-bike',
    description:
      'Electric cargo bikes for replacing car trips. Longtails, front-loaders, compact haulers, and trikes.',
  },
  {
    title: 'Strollers',
    slug: 'stroller',
    description: 'Premium strollers and joggers for active families. Coming soon.',
  },
  {
    title: 'Trailers',
    slug: 'trailer',
    description: 'Bike trailers for kids, pets, and gear. Coming soon.',
  },
  {
    title: 'Wagons',
    slug: 'wagon',
    description: 'Utility wagons for hauling kids and gear without a bike. Coming soon.',
  },
  {
    title: 'Accessories',
    slug: 'accessory',
    description: 'Helmets, bags, locks, rain covers, child seats, and everything else.',
  },
]

const productsData = [
  {
    name: 'Tern GSD S10',
    slug: 'tern-gsd-s10',
    brand: 'Tern',
    category: 'cargo-bike' as const,
    price: 5300,
    weight: '73 lbs',
    cargoCapacity: '440 lbs',
    motorType: 'Mid-drive Cargo Line (Bosch, 85Nm)',
    batteryRange: '62 miles (500Wh)',
    affiliateUrl: 'https://www.ternbicycles.com/bikes/gsd',
    carryishTake:
      "Fits in an elevator. Hauls two kids and a Costco run. The Bosch Cargo Line motor has 85Nm of torque, which means hills with a full load aren't a problem. Tern's accessory system is the deepest in the game — kid seats, panniers, front racks, rain covers, all designed to click in without tools. At $5,300 it's not cheap, but families who ride daily will use it like a second car.",
  },
  {
    name: 'Tern HSD P5i',
    slug: 'tern-hsd-p5i',
    brand: 'Tern',
    category: 'cargo-bike' as const,
    price: 5300,
    weight: '57 lbs',
    cargoCapacity: '397 lbs',
    motorType: 'Mid-drive Performance Line (Bosch, 65Nm)',
    batteryRange: '60 miles (500Wh)',
    affiliateUrl: 'https://www.ternbicycles.com/bikes/hsd',
    carryishTake:
      "Looks almost like a normal bike. That's the point. The HSD carries 397 pounds on a frame that fits in standard bike parking. The internally geared hub means less maintenance, and at 57 pounds it's one of the lighter cargo options. Good for apartment dwellers who can't store a full longtail.",
  },
  {
    name: 'RadWagon 5',
    slug: 'radwagon-5',
    brand: 'Rad Power Bikes',
    category: 'cargo-bike' as const,
    price: 2499,
    weight: '88 lbs',
    cargoCapacity: '350 lbs',
    motorType: 'Hub motor 750W',
    batteryRange: '45 miles',
    affiliateUrl: 'https://www.radpowerbikes.com/products/radwagon-electric-cargo-bike',
    carryishTake:
      "The Volvo wagon of cargo bikes. Not flashy, endlessly practical. Gen 5 added a torque sensor (finally — the old cadence sensor felt jerky) and the SafeShield battery uses resin-encapsulated cells for thermal safety. Class 3 speeds up to 28mph help you keep pace with traffic. At 88 pounds, plan on parking it where you ride it. You're not carrying this upstairs.",
  },
  {
    name: 'Aventon Abound LR',
    slug: 'aventon-abound-lr',
    brand: 'Aventon',
    category: 'cargo-bike' as const,
    price: 1999,
    weight: '77 lbs',
    cargoCapacity: '400 lbs',
    motorType: 'Hub motor 750W',
    batteryRange: '60 miles (921Wh)',
    affiliateUrl: 'https://www.aventon.com/products/abound',
    carryishTake:
      "GPS tracking, alarm system, and a locking kickstand — on a $2K cargo bike. Nobody else does that at this price. The 921Wh battery is massive and gets around 60 miles of real-world range. The motor is a hub (not mid-drive), so steep hills with heavy loads will feel it. But for flat-to-rolling terrain with kids? Hard to beat for the money.",
  },
  {
    name: 'Lectric XPedition2',
    slug: 'lectric-xpedition2',
    brand: 'Lectric',
    category: 'cargo-bike' as const,
    price: 1499,
    weight: '75 lbs',
    cargoCapacity: '450 lbs',
    motorType: 'Hub motor 750W (46Nm)',
    batteryRange: '60 miles (624Wh)',
    affiliateUrl: 'https://www.lectricebikes.com/products/xpedition',
    carryishTake:
      "$1,499 for a cargo bike with a torque sensor and 450-pound capacity. The modular approach is smart — start with one 624Wh battery, add a second later for 100+ mile range. The catch: accessories cost extra, so price out the full setup with kid seats and rails before comparing. Still, even fully loaded it undercuts most competitors by a thousand dollars or more.",
  },
  {
    name: 'Urban Arrow Family',
    slug: 'urban-arrow-family',
    brand: 'Urban Arrow',
    category: 'cargo-bike' as const,
    price: 8000,
    weight: '',
    cargoCapacity: '550 lbs',
    motorType: 'Mid-drive Performance Line (Bosch, 85Nm)',
    batteryRange: '40 miles (500Wh)',
    affiliateUrl: 'https://www.urbanarrow.com/family',
    carryishTake:
      "Half of Amsterdam rides these for a reason. The front box fits two kids with seatbelts, or one kid plus a dog, or a week of groceries with room to spare. 550-pound total capacity is among the highest available. Bosch motor plus Gates belt drive means almost zero drivetrain maintenance — no chain to clean, no gears to adjust. At $8,000 it's a real investment. Families who commit to it tend to sell their second car.",
  },
  {
    name: 'Yuba Spicy Curry V3',
    slug: 'yuba-spicy-curry-v3',
    brand: 'Yuba',
    category: 'cargo-bike' as const,
    price: 5499,
    weight: '',
    cargoCapacity: '440 lbs',
    motorType: 'Mid-drive Cargo Line (Bosch, 85Nm)',
    batteryRange: '55 miles (500Wh)',
    affiliateUrl: 'https://www.yubabikes.com/spicy-curry',
    carryishTake:
      "The low rear deck is the detail that matters most. Kids step on and off without climbing. The center of gravity stays low even with two passengers, so the bike feels planted in turns. Yuba has the best accessory catalog for longtails — monkey bars, soft spots, running boards, bamboo boards. If you want to customize a cargo bike for your specific family setup, start here.",
  },
  {
    name: 'Riese & Müller Load 75',
    slug: 'riese-muller-load-75',
    brand: 'Riese & Müller',
    category: 'cargo-bike' as const,
    price: 9500,
    weight: '',
    cargoCapacity: '440 lbs',
    motorType: 'Mid-drive Cargo Line (Bosch, 85Nm)',
    batteryRange: '50 miles (500Wh)',
    affiliateUrl: 'https://www.riese-und-muller.com/load',
    carryishTake:
      "Full suspension on a cargo bike. You feel the difference on the first pothole — the box stays calm, the kids stay happy, your wrists don't take a beating. German-engineered and priced accordingly. The dual-battery option pushes range past 60 miles. Not for everyone's budget, but if you ride rough city streets daily with kids in the box, nothing else rides like this.",
  },
  {
    name: 'Benno Boost E 10D',
    slug: 'benno-boost-e-10d',
    brand: 'Benno',
    category: 'cargo-bike' as const,
    price: 5200,
    weight: '',
    cargoCapacity: '440 lbs',
    motorType: 'Mid-drive Cargo Line (Bosch, 85Nm)',
    batteryRange: '55 miles (500Wh)',
    affiliateUrl: 'https://www.bennobikes.com/boost',
    carryishTake:
      "Rides like a sporty commuter. Handles like one too. The Electra founder designed this, and you can feel the cruiser DNA — natural upright position, smooth power delivery, stable at speed. Load it with 440 pounds of kids and cargo and it still tracks straight. Good pick if you want one bike for commuting and family duty without feeling like you're driving a bus.",
  },
  {
    name: 'Specialized Globe Haul LT',
    slug: 'specialized-globe-haul-lt',
    brand: 'Specialized',
    category: 'cargo-bike' as const,
    price: 3800,
    weight: '',
    cargoCapacity: '441 lbs',
    motorType: 'Mid-drive (Specialized)',
    batteryRange: '50 miles',
    affiliateUrl: 'https://www.specialized.com/globe-haul',
    carryishTake:
      '3.5-inch tires on a cargo bike. They float over broken pavement, gravel paths, and curb cuts without jarring the passengers. 441-pound total weight limit covers two kids and gear with headroom. At $3,800 it sits in the middle of the price range with better tires than bikes costing twice as much. Specialized dealer network means easy service anywhere in the US.',
  },
  {
    name: 'Xtracycle Swoop',
    slug: 'xtracycle-swoop',
    brand: 'Xtracycle',
    category: 'cargo-bike' as const,
    price: 5999,
    weight: '',
    cargoCapacity: '400 lbs',
    motorType: 'Mid-drive Performance Line CX (Bosch, 85Nm)',
    batteryRange: '55 miles (500Wh)',
    affiliateUrl: 'https://www.xtracycle.com/swoop',
    carryishTake:
      "The brand that invented longtail cargo bikes still makes one of the best. Step-through frame for easy mounting with a loaded bike. Hooptie rails come included (most brands charge $200+ extra) and turn the rear into a rolling playpen. Two kids, three kids, a surfboard, camping gear — the Swoop handles all of it. The CX motor is Bosch's most powerful, rated at 85Nm.",
  },
  {
    name: 'Trek Fetch+ 4',
    slug: 'trek-fetch-plus-4',
    brand: 'Trek',
    category: 'cargo-bike' as const,
    price: 6500,
    weight: '',
    cargoCapacity: '400 lbs',
    motorType: 'Mid-drive Performance Line CX (Bosch, 85Nm)',
    batteryRange: '50 miles (500Wh)',
    affiliateUrl: 'https://www.trekbikes.com/fetch',
    carryishTake:
      "Belt drive and CVP hub mean you shift smoothly under load and never clean a chain. The dropper post is a nice touch — drop the seat at stops for easy foot-down stability, raise it for efficient pedaling. 175-pound box limit fits multiple kids or a large dog. Trek dealer network is the biggest in the world, so warranty service is easy. At $6,500 it's mid-pack for front-loaders.",
  },
  {
    name: 'Yuba Kombi E5',
    slug: 'yuba-kombi-e5',
    brand: 'Yuba',
    category: 'cargo-bike' as const,
    price: 3299,
    weight: '',
    cargoCapacity: '440 lbs',
    motorType: 'Mid-drive Steps E5000 (Shimano, 40Nm)',
    batteryRange: '40 miles (418Wh)',
    affiliateUrl: 'https://www.yubabikes.com/kombi',
    carryishTake:
      "Yuba quality at an entry-level price. The Shimano Steps motor has less torque (40Nm vs 85Nm on the Spicy Curry) so steep hills with a full load will be slower. But for flat-to-moderate terrain, it does the job. The rear rack fits two child seats or panniers. Wheel skirts keep little fingers away from spokes. Good first cargo bike if you're not sure you'll commit to the lifestyle.",
  },
  {
    name: 'Gazelle Cabby',
    slug: 'gazelle-cabby',
    brand: 'Gazelle',
    category: 'cargo-bike' as const,
    price: 4500,
    weight: '',
    cargoCapacity: '400 lbs',
    motorType: 'Mid-drive Performance Line (Bosch, 65Nm)',
    batteryRange: '50 miles (500Wh)',
    affiliateUrl: 'https://www.gazelle.nl/cabby',
    carryishTake:
      "Wheelbase is only about 5cm longer than a regular bike. That matters for storage and handling — this doesn't feel like piloting a barge. The MIK rack system clicks accessories on and off in seconds. Front rack is frame-mounted (not handlebar-mounted), so steering stays light even with weight up front. Internally geared hub is low-maintenance. 130 years of Dutch cycling experience shows in the details.",
  },
]

export const seedProducts = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding product catalog...')

  // Clear existing product catalog data
  payload.logger.info('— Clearing existing brands and products...')
  for (const collection of ['products', 'brands'] as const) {
    await payload.db.deleteMany({ collection, req, where: {} })
    if (payload.collections[collection].config.versions) {
      await payload.db.deleteVersions({ collection, req, where: {} })
    }
  }

  // Seed categories (upsert — update existing or create new)
  payload.logger.info('— Seeding categories...')
  for (const cat of categoriesData) {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: cat.slug } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'categories',
        id: existing.docs[0].id,
        data: cat,
      })
    } else {
      await payload.create({
        collection: 'categories',
        data: cat,
      })
    }
  }

  // Seed brands
  payload.logger.info('— Seeding brands...')
  const brandMap: Record<string, number> = {}
  for (const brand of brandsData) {
    const doc = await payload.create({
      collection: 'brands',
      data: brand,
    })
    brandMap[brand.name] = doc.id
  }

  // Seed products with brand relationships
  payload.logger.info(`— Seeding ${productsData.length} products...`)
  for (const product of productsData) {
    const brandId = brandMap[product.brand]
    if (!brandId) {
      payload.logger.warn(`Brand not found for product "${product.name}": "${product.brand}"`)
    }

    await payload.create({
      collection: 'products',
      depth: 0,
      context: {
        disableRevalidate: true,
      },
      data: {
        name: product.name,
        slug: product.slug,
        category: product.category,
        price: product.price,
        weight: product.weight || undefined,
        cargoCapacity: product.cargoCapacity,
        motorType: product.motorType,
        batteryRange: product.batteryRange,
        affiliateUrl: product.affiliateUrl,
        brand: brandId || undefined,
        carryishTake: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', text: product.carryishTake }],
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        _status: 'published',
        publishedAt: new Date().toISOString(),
      },
    })
  }

  payload.logger.info(`Seeded ${brandsData.length} brands, ${categoriesData.length} categories, ${productsData.length} products.`)
}
