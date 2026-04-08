import type { Payload, PayloadRequest } from 'payload'

const brandsData = [
  { name: 'Tern', slug: 'tern', websiteUrl: 'https://www.ternbicycles.com', description: 'Compact cargo bikes that fit in elevators and bike rooms. The GSD and HSD run Bosch drivetrains and have the best accessory system in the business.' },
  { name: 'Rad Power Bikes', slug: 'rad-power-bikes', websiteUrl: 'https://www.radpowerbikes.com', description: 'Biggest e-bike brand in the US. The RadWagon put affordable cargo biking on the map. Direct-to-consumer, solid customer service when things break.' },
  { name: 'Aventon', slug: 'aventon', websiteUrl: 'https://www.aventon.com', description: 'DTC brand that punches above its price. The Abound brought GPS tracking and alarm systems to sub-$2K cargo bikes. Nobody else is doing that at this price.' },
  { name: 'Lectric', slug: 'lectric', websiteUrl: 'https://www.lectricebikes.com', description: 'Value play out of Phoenix. The XPedition2 is modular — buy the base, add batteries and accessories as you need them. Aggressive pricing without feeling cheap.' },
  { name: 'Urban Arrow', slug: 'urban-arrow', websiteUrl: 'https://www.urbanarrow.com', description: 'Dutch box bike specialists. The Family model is what half of Amsterdam rides. Bosch motor, Gates belt drive, built for daily school runs in any weather.' },
  { name: 'Yuba', slug: 'yuba', websiteUrl: 'https://www.yubabikes.com', description: "Been making cargo bikes longer than most brands have existed. The Spicy Curry and Kombi are longtail staples. Best accessory ecosystem for families." },
  { name: 'Riese & Müller', slug: 'riese-muller', websiteUrl: 'https://www.riese-und-muller.com', description: 'German-engineered, full-suspension cargo bikes. The Load and Packster cost serious money and ride like it. You get what you pay for here.' },
  { name: 'Benno', slug: 'benno', websiteUrl: 'https://www.bennobikes.com', description: 'Founded by the guy who created Electra. The Boost handles like a sporty commuter until you load it up. Bosch-powered compacts.' },
  { name: 'Specialized', slug: 'specialized', websiteUrl: 'https://www.specialized.com', description: 'Biggest bike company in the world finally showed up to cargo. The Globe Haul LT has 3.5-inch tires and a 441-pound weight limit.' },
  { name: 'Xtracycle', slug: 'xtracycle', websiteUrl: 'https://www.xtracycle.com', description: "Invented the longtail cargo bike category. The Swoop and Hopper come with Hooptie safety rails included." },
  { name: 'Trek', slug: 'trek', websiteUrl: 'https://www.trekbikes.com', description: "World's largest bike brand. The Fetch+ is their front-loader — belt drive, Bosch motor, big cargo box." },
  { name: 'Gazelle', slug: 'gazelle', websiteUrl: 'https://www.gazelle.nl', description: '130 years of Dutch cycling heritage. The Cabby is a practical longtail — MIK rack system lets you swap child seats and crates in 10 seconds.' },
]

const categoriesData = [
  { title: 'Cargo Bikes', slug: 'cargo-bike', description: 'Electric cargo bikes for replacing car trips.' },
  { title: 'Strollers', slug: 'stroller', description: 'Premium strollers and joggers. Coming soon.' },
  { title: 'Trailers', slug: 'trailer', description: 'Bike trailers for kids, pets, and gear. Coming soon.' },
  { title: 'Wagons', slug: 'wagon', description: 'Utility wagons. Coming soon.' },
  { title: 'Accessories', slug: 'accessory', description: 'Helmets, bags, locks, rain covers, child seats.' },
]

const productsData = [
  {
    name: 'Tern GSD S10', slug: 'tern-gsd-s10', brand: 'Tern', category: 'cargo-bike' as const, price: 5300,
    affiliateUrl: 'https://www.ternbicycles.com/bikes/gsd',
    carryishTake: "Fits in an elevator. Hauls two kids and a Costco run. The Bosch Cargo Line motor has 85Nm of torque, which means hills with a full load aren't a problem. Tern's accessory system is the deepest in the game — kid seats, panniers, front racks, rain covers, all designed to click in without tools. At $5,300 it's not cheap, but families who ride daily will use it like a second car.",
    testingStatus: 'tested' as const,
    bestFor: ['School runs', '2+ kids', 'Apartment storage', 'Hilly terrain'],
    overallScore: 9, hillScore: 9, cargoScore: 8, rangeScore: 8, valueScore: 7, familyScore: 9,
    motorBrand: 'Bosch', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 600, motorTorqueNm: 85, pedalAssistLevels: 4, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Cargo Line (Bosch, 85Nm)',
    batteryBrand: 'Bosch', batteryWh: 500, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: true, dualBatteryWh: 1000, statedRangeMi: 62, estimatedRealRangeMi: 45, chargeTimeHours: 4.5,
    batteryRange: '62 miles (500Wh)',
    weightLbs: 73, maxSystemWeightLbs: 440, cargoCapacityLbs: 200, lengthInches: 71, wheelbaseInches: 49, standoverHeightInches: 0, riderHeightMin: "4'11\"", riderHeightMax: "6'5\"", foldable: true, fitsInElevator: true,
    weight: '73 lbs', cargoCapacity: '440 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Deore', gearType: 'derailleur' as const, numberOfGears: 10, brakeBrand: 'Magura', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/180',
    frontWheelSize: '20"', rearWheelSize: '20"', tireWidthInches: 2.4, tireBrand: 'Schwalbe Pick-Up', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 2, childSeatCompatibility: 'Thule Yepp Maxi, Tern Clubhouse+', hasIntegratedChildSeats: false, hasSeatbelts: false, hasFootboards: true, hasWheelGuards: true, hasRainCover: false, rainCoverAvailable: true, frontRack: true, rearRack: true, rackSystem: 'Tern GSD Rack',
    integratedLights: true, turnSignals: false, absAvailable: false, gpsTracking: false, alarm: false, lockingKickstand: true,
    includedAccessories: 'Double kickstand, integrated lights, Atlas H Lock mount, fenders', kickstandType: 'double-leg' as const, fenders: true, display: 'Bosch Kiox 500',
    availableIn: 'Global', warrantyYears: 2, warrantyDetails: '2-year frame and components, 2-year battery', salesModel: 'dealer' as const,
  },
  {
    name: 'Tern HSD P5i', slug: 'tern-hsd-p5i', brand: 'Tern', category: 'cargo-bike' as const, price: 5300,
    affiliateUrl: 'https://www.ternbicycles.com/bikes/hsd',
    carryishTake: "Looks almost like a normal bike. That's the point. The HSD carries 397 pounds on a frame that fits in standard bike parking. The internally geared hub means less maintenance, and at 57 pounds it's one of the lighter cargo options. Good for apartment dwellers who can't store a full longtail.",
    testingStatus: 'specs-only' as const,
    bestFor: ['Commute', 'Apartment storage', 'Light cargo'],
    overallScore: 8, hillScore: 7, cargoScore: 6, rangeScore: 8, valueScore: 6, familyScore: 6,
    motorBrand: 'Bosch', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 500, motorTorqueNm: 65, pedalAssistLevels: 4, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Performance Line (Bosch, 65Nm)',
    batteryBrand: 'Bosch', batteryWh: 500, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: false, statedRangeMi: 60, estimatedRealRangeMi: 42, chargeTimeHours: 4.5,
    batteryRange: '60 miles (500Wh)',
    weightLbs: 57, maxSystemWeightLbs: 397, cargoCapacityLbs: 130, lengthInches: 67, wheelbaseInches: 45, riderHeightMin: "4'11\"", riderHeightMax: "6'3\"", foldable: false, fitsInElevator: true,
    weight: '57 lbs', cargoCapacity: '397 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Nexus', gearType: 'internal-hub' as const, numberOfGears: 5, brakeBrand: 'Magura', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/180',
    frontWheelSize: '20"', rearWheelSize: '20"', tireWidthInches: 2.15, tireBrand: 'Schwalbe', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'compact' as const, maxChildPassengers: 1, childSeatCompatibility: 'Thule Yepp Maxi', hasFootboards: true, hasWheelGuards: true, rearRack: true, rackSystem: 'Tern HSD Rack',
    integratedLights: true, lockingKickstand: true,
    includedAccessories: 'Double kickstand, integrated lights, fenders', kickstandType: 'double-leg' as const, fenders: true, display: 'Bosch Purion 200',
    availableIn: 'Global', warrantyYears: 2, salesModel: 'dealer' as const,
  },
  {
    name: 'RadWagon 5', slug: 'radwagon-5', brand: 'Rad Power Bikes', category: 'cargo-bike' as const, price: 2499,
    affiliateUrl: 'https://www.radpowerbikes.com/products/radwagon-electric-cargo-bike',
    carryishTake: "The Volvo wagon of cargo bikes. Not flashy, endlessly practical. Gen 5 added a torque sensor (finally — the old cadence sensor felt jerky) and the SafeShield battery uses resin-encapsulated cells for thermal safety. Class 3 speeds up to 28mph help you keep pace with traffic. At 88 pounds, plan on parking it where you ride it. You're not carrying this upstairs.",
    testingStatus: 'tested' as const,
    bestFor: ['Budget-friendly', 'Flat terrain', 'Errands', 'First cargo bike'],
    overallScore: 7, hillScore: 5, cargoScore: 7, rangeScore: 7, valueScore: 9, familyScore: 7,
    motorBrand: 'Rad Power', motorPosition: 'hub-rear' as const, motorNominalWatts: 750, motorPeakWatts: 750, motorTorqueNm: 80, pedalAssistLevels: 5, throttle: 'thumb' as const, topSpeedMph: 28, bikeClass: 'class-3' as const,
    motorType: 'Hub motor 750W',
    batteryBrand: 'Samsung', batteryWh: 672, batteryVolts: 48, batteryRemovable: true, dualBatteryCapable: false, statedRangeMi: 45, estimatedRealRangeMi: 30, chargeTimeHours: 6,
    batteryRange: '45 miles',
    weightLbs: 88, maxSystemWeightLbs: 350, cargoCapacityLbs: 150, lengthInches: 78, wheelbaseInches: 52, riderHeightMin: "5'1\"", riderHeightMax: "6'2\"", foldable: false, fitsInElevator: false,
    weight: '88 lbs', cargoCapacity: '350 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Altus', gearType: 'derailleur' as const, numberOfGears: 7, brakeBrand: 'Tektro', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/180',
    frontWheelSize: '22"', rearWheelSize: '22"', tireWidthInches: 3.0, tireBrand: 'Kenda', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 2, childSeatCompatibility: 'Thule Yepp, Rad Caboose', hasFootboards: true, hasWheelGuards: false, rainCoverAvailable: true, rearRack: true, rackSystem: 'proprietary',
    integratedLights: true, lockingKickstand: false,
    includedAccessories: 'Fenders, integrated lights, rear rack', kickstandType: 'double-leg' as const, fenders: true, display: 'LCD with USB',
    availableIn: 'US, Canada', warrantyYears: 1, warrantyDetails: '1-year comprehensive', salesModel: 'direct-to-consumer' as const,
  },
  {
    name: 'Aventon Abound LR', slug: 'aventon-abound-lr', brand: 'Aventon', category: 'cargo-bike' as const, price: 1999,
    affiliateUrl: 'https://www.aventon.com/products/abound',
    carryishTake: "GPS tracking, alarm system, and a locking kickstand — on a $2K cargo bike. Nobody else does that at this price. The 921Wh battery is massive and gets around 60 miles of real-world range. The motor is a hub (not mid-drive), so steep hills with heavy loads will feel it. But for flat-to-rolling terrain with kids? Hard to beat for the money.",
    testingStatus: 'specs-only' as const,
    bestFor: ['Budget-friendly', 'Security-conscious', 'Flat terrain'],
    overallScore: 7, hillScore: 5, cargoScore: 7, rangeScore: 9, valueScore: 10, familyScore: 7,
    motorBrand: 'Aventon', motorPosition: 'hub-rear' as const, motorNominalWatts: 750, motorPeakWatts: 750, motorTorqueNm: 60, pedalAssistLevels: 5, throttle: 'thumb' as const, topSpeedMph: 28, bikeClass: 'class-2' as const,
    motorType: 'Hub motor 750W',
    batteryBrand: 'Samsung', batteryWh: 921, batteryVolts: 48, batteryRemovable: true, dualBatteryCapable: false, statedRangeMi: 60, estimatedRealRangeMi: 45, chargeTimeHours: 7,
    batteryRange: '60 miles (921Wh)',
    weightLbs: 77, maxSystemWeightLbs: 400, cargoCapacityLbs: 165, lengthInches: 76, wheelbaseInches: 50, riderHeightMin: "5'1\"", riderHeightMax: "6'3\"", foldable: false, fitsInElevator: false,
    weight: '77 lbs', cargoCapacity: '400 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Altus', gearType: 'derailleur' as const, numberOfGears: 7, brakeBrand: 'Tektro', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/180',
    frontWheelSize: '20"', rearWheelSize: '20"', tireWidthInches: 3.0, tireBrand: 'Kenda', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 2, childSeatCompatibility: 'Thule Yepp Maxi', hasFootboards: true, rearRack: true, rackSystem: 'proprietary',
    integratedLights: true, gpsTracking: true, alarm: true, lockingKickstand: true,
    includedAccessories: 'Fenders, integrated lights, rear rack, locking kickstand, GPS/alarm', kickstandType: 'double-leg' as const, fenders: true, display: 'Color LCD',
    availableIn: 'US', warrantyYears: 2, salesModel: 'direct-to-consumer' as const,
  },
  {
    name: 'Lectric XPedition2', slug: 'lectric-xpedition2', brand: 'Lectric', category: 'cargo-bike' as const, price: 1499,
    affiliateUrl: 'https://www.lectricebikes.com/products/xpedition',
    carryishTake: "$1,499 for a cargo bike with a torque sensor and 450-pound capacity. The modular approach is smart — start with one 624Wh battery, add a second later for 100+ mile range. The catch: accessories cost extra, so price out the full setup with kid seats and rails before comparing. Still, even fully loaded it undercuts most competitors by a thousand dollars or more.",
    testingStatus: 'specs-only' as const,
    bestFor: ['Budget-friendly', 'First cargo bike', 'Modular'],
    overallScore: 8, hillScore: 5, cargoScore: 8, rangeScore: 8, valueScore: 10, familyScore: 6,
    motorBrand: 'Lectric', motorPosition: 'hub-rear' as const, motorNominalWatts: 750, motorPeakWatts: 750, motorTorqueNm: 46, pedalAssistLevels: 5, throttle: 'thumb' as const, topSpeedMph: 28, bikeClass: 'class-2' as const,
    motorType: 'Hub motor 750W (46Nm)',
    batteryBrand: 'Samsung', batteryWh: 624, batteryVolts: 48, batteryRemovable: true, dualBatteryCapable: true, dualBatteryWh: 1248, statedRangeMi: 60, estimatedRealRangeMi: 40, chargeTimeHours: 5,
    batteryRange: '60 miles (624Wh)',
    weightLbs: 75, maxSystemWeightLbs: 450, cargoCapacityLbs: 200, lengthInches: 75, wheelbaseInches: 50, riderHeightMin: "5'2\"", riderHeightMax: "6'4\"", foldable: false, fitsInElevator: false,
    weight: '75 lbs', cargoCapacity: '450 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Altus', gearType: 'derailleur' as const, numberOfGears: 7, brakeBrand: 'Tektro', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/180',
    frontWheelSize: '20"', rearWheelSize: '20"', tireWidthInches: 3.0, tireBrand: 'CST', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 2, childSeatCompatibility: 'Thule Yepp, aftermarket', hasFootboards: false, rearRack: true, rackSystem: 'proprietary',
    integratedLights: true, lockingKickstand: false,
    includedAccessories: 'Fenders, rear rack, integrated lights', kickstandType: 'double-leg' as const, fenders: true, display: 'LCD',
    availableIn: 'US', warrantyYears: 2, salesModel: 'direct-to-consumer' as const,
  },
  {
    name: 'Urban Arrow Family', slug: 'urban-arrow-family', brand: 'Urban Arrow', category: 'cargo-bike' as const, price: 8000,
    affiliateUrl: 'https://www.urbanarrow.com/family',
    carryishTake: "Half of Amsterdam rides these for a reason. The front box fits two kids with seatbelts, or one kid plus a dog, or a week of groceries with room to spare. 550-pound total capacity is among the highest available. Bosch motor plus Gates belt drive means almost zero drivetrain maintenance — no chain to clean, no gears to adjust. At $8,000 it's a real investment. Families who commit to it tend to sell their second car.",
    testingStatus: 'tested' as const,
    bestFor: ['2+ kids', 'School runs', 'Car replacement', 'Heavy loads'],
    overallScore: 9, hillScore: 8, cargoScore: 10, rangeScore: 6, valueScore: 5, familyScore: 10,
    motorBrand: 'Bosch', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 600, motorTorqueNm: 85, pedalAssistLevels: 4, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Performance Line (Bosch, 85Nm)',
    batteryBrand: 'Bosch', batteryWh: 500, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: true, dualBatteryWh: 1000, statedRangeMi: 40, estimatedRealRangeMi: 25, chargeTimeHours: 4.5,
    batteryRange: '40 miles (500Wh)',
    weightLbs: 62, maxSystemWeightLbs: 550, cargoCapacityLbs: 275, lengthInches: 102, wheelbaseInches: 76, riderHeightMin: "5'3\"", riderHeightMax: "6'5\"", foldable: false, fitsInElevator: false,
    cargoCapacity: '550 lbs',
    drivetrainType: 'belt' as const, drivetrainBrand: 'Gates CDX, Enviolo', gearType: 'cvp' as const, numberOfGears: 0, brakeBrand: 'Shimano', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/203',
    frontWheelSize: '20"', rearWheelSize: '26"', tireWidthInches: 2.15, tireBrand: 'Schwalbe', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'front-box' as const, maxChildPassengers: 3, childSeatCompatibility: 'Urban Arrow child seat, Maxi-Cosi adapter', hasIntegratedChildSeats: true, hasSeatbelts: true, hasWheelGuards: true, hasRainCover: false, rainCoverAvailable: true, frontRack: false, rearRack: true, rackSystem: 'proprietary',
    integratedLights: true, lockingKickstand: true,
    includedAccessories: 'Rain cover compatible, child seat with seatbelts, kickstand, integrated lights, fenders', kickstandType: 'double-leg' as const, fenders: true, display: 'Bosch Kiox 500',
    availableIn: 'Global', warrantyYears: 5, warrantyDetails: '5-year frame, 2-year electrical', salesModel: 'dealer' as const,
  },
  {
    name: 'Yuba Spicy Curry V3', slug: 'yuba-spicy-curry-v3', brand: 'Yuba', category: 'cargo-bike' as const, price: 5499,
    affiliateUrl: 'https://www.yubabikes.com/spicy-curry',
    carryishTake: "The low rear deck is the detail that matters most. Kids step on and off without climbing. The center of gravity stays low even with two passengers, so the bike feels planted in turns. Yuba has the best accessory catalog for longtails — monkey bars, soft spots, running boards, bamboo boards. If you want to customize a cargo bike for your specific family setup, start here.",
    testingStatus: 'specs-only' as const,
    bestFor: ['2+ kids', 'Customizable', 'Hilly terrain'],
    overallScore: 8, hillScore: 9, cargoScore: 8, rangeScore: 7, valueScore: 7, familyScore: 9,
    motorBrand: 'Bosch', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 600, motorTorqueNm: 85, pedalAssistLevels: 4, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Cargo Line (Bosch, 85Nm)',
    batteryBrand: 'Bosch', batteryWh: 500, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: true, dualBatteryWh: 1000, statedRangeMi: 55, estimatedRealRangeMi: 35, chargeTimeHours: 4.5,
    batteryRange: '55 miles (500Wh)',
    weightLbs: 70, maxSystemWeightLbs: 440, cargoCapacityLbs: 180, riderHeightMin: "5'0\"", riderHeightMax: "6'3\"", foldable: false, fitsInElevator: false,
    cargoCapacity: '440 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Deore', gearType: 'derailleur' as const, numberOfGears: 10, brakeBrand: 'Shimano', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/203',
    frontWheelSize: '26"', rearWheelSize: '20"', tireWidthInches: 2.35, tireBrand: 'Schwalbe', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 3, childSeatCompatibility: 'Yuba child seats, Thule Yepp', hasFootboards: true, hasWheelGuards: true, rainCoverAvailable: true, rearRack: true, rackSystem: 'Yuba Bamboo Board',
    integratedLights: true, lockingKickstand: true,
    includedAccessories: 'Running boards, fenders, integrated lights', kickstandType: 'double-leg' as const, fenders: true, display: 'Bosch Purion 200',
    availableIn: 'Global', warrantyYears: 2, salesModel: 'dealer' as const,
  },
  {
    name: 'Riese & Müller Load 75', slug: 'riese-muller-load-75', brand: 'Riese & Müller', category: 'cargo-bike' as const, price: 9500,
    affiliateUrl: 'https://www.riese-und-muller.com/load',
    carryishTake: "Full suspension on a cargo bike. You feel the difference on the first pothole — the box stays calm, the kids stay happy, your wrists don't take a beating. German-engineered and priced accordingly. The dual-battery option pushes range past 60 miles. Not for everyone's budget, but if you ride rough city streets daily with kids in the box, nothing else rides like this.",
    testingStatus: 'specs-only' as const,
    bestFor: ['Rough roads', '2+ kids', 'Premium', 'All-weather'],
    overallScore: 9, hillScore: 9, cargoScore: 9, rangeScore: 7, valueScore: 4, familyScore: 9,
    motorBrand: 'Bosch', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 600, motorTorqueNm: 85, pedalAssistLevels: 4, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Cargo Line (Bosch, 85Nm)',
    batteryBrand: 'Bosch', batteryWh: 500, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: true, dualBatteryWh: 1000, statedRangeMi: 50, estimatedRealRangeMi: 30, chargeTimeHours: 4.5,
    batteryRange: '50 miles (500Wh)',
    weightLbs: 80, maxSystemWeightLbs: 440, cargoCapacityLbs: 220, lengthInches: 104, wheelbaseInches: 78, riderHeightMin: "5'3\"", riderHeightMax: "6'5\"", foldable: false, fitsInElevator: false,
    cargoCapacity: '440 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Deore XT', gearType: 'derailleur' as const, numberOfGears: 11, brakeBrand: 'Magura', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/203',
    frontWheelSize: '20"', rearWheelSize: '26"', tireWidthInches: 2.15, tireBrand: 'Schwalbe Super Moto-X', punctureProtection: true,
    suspensionType: 'full' as const, suspensionBrand: 'Riese & Müller', seatpostType: 'suspension' as const,
    cargoLayout: 'front-box' as const, maxChildPassengers: 2, childSeatCompatibility: 'R&M cargo box seats', hasIntegratedChildSeats: true, hasSeatbelts: true, hasWheelGuards: true, rainCoverAvailable: true, rearRack: true, rackSystem: 'proprietary',
    integratedLights: true, lockingKickstand: true,
    includedAccessories: 'Full suspension, cargo box, kickstand, integrated lights, fenders', kickstandType: 'double-leg' as const, fenders: true, display: 'Bosch Kiox 500',
    availableIn: 'Global', warrantyYears: 2, warrantyDetails: '10-year frame, 2-year electrical', salesModel: 'dealer' as const,
  },
  {
    name: 'Benno Boost E 10D', slug: 'benno-boost-e-10d', brand: 'Benno', category: 'cargo-bike' as const, price: 5200,
    affiliateUrl: 'https://www.bennobikes.com/boost',
    carryishTake: "Rides like a sporty commuter. Handles like one too. The Electra founder designed this, and you can feel the cruiser DNA — natural upright position, smooth power delivery, stable at speed. Load it with 440 pounds of kids and cargo and it still tracks straight. Good pick if you want one bike for commuting and family duty without feeling like you're driving a bus.",
    testingStatus: 'specs-only' as const,
    bestFor: ['Commute + family', 'Sporty ride', 'Hilly terrain'],
    overallScore: 8, hillScore: 9, cargoScore: 7, rangeScore: 7, valueScore: 7, familyScore: 7,
    motorBrand: 'Bosch', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 600, motorTorqueNm: 85, pedalAssistLevels: 4, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Cargo Line (Bosch, 85Nm)',
    batteryBrand: 'Bosch', batteryWh: 500, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: true, dualBatteryWh: 1000, statedRangeMi: 55, estimatedRealRangeMi: 38, chargeTimeHours: 4.5,
    batteryRange: '55 miles (500Wh)',
    weightLbs: 68, maxSystemWeightLbs: 440, cargoCapacityLbs: 170, riderHeightMin: "5'2\"", riderHeightMax: "6'4\"", foldable: false, fitsInElevator: false,
    cargoCapacity: '440 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Deore', gearType: 'derailleur' as const, numberOfGears: 10, brakeBrand: 'Shimano', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/180',
    frontWheelSize: '24"', rearWheelSize: '24"', tireWidthInches: 2.4, tireBrand: 'Schwalbe', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'suspension' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 2, childSeatCompatibility: 'Thule Yepp, Benno Utility Tray', hasFootboards: true, rearRack: true, rackSystem: 'Benno Utility',
    integratedLights: true, lockingKickstand: true,
    includedAccessories: 'Rear rack, fenders, integrated lights, kickstand', kickstandType: 'double-leg' as const, fenders: true, display: 'Bosch Purion 200',
    availableIn: 'US, EU', warrantyYears: 2, salesModel: 'dealer' as const,
  },
  {
    name: 'Specialized Globe Haul LT', slug: 'specialized-globe-haul-lt', brand: 'Specialized', category: 'cargo-bike' as const, price: 3800,
    affiliateUrl: 'https://www.specialized.com/globe-haul',
    carryishTake: '3.5-inch tires on a cargo bike. They float over broken pavement, gravel paths, and curb cuts without jarring the passengers. 441-pound total weight limit covers two kids and gear with headroom. At $3,800 it sits in the middle of the price range with better tires than bikes costing twice as much. Specialized dealer network means easy service anywhere in the US.',
    testingStatus: 'specs-only' as const,
    bestFor: ['Rough roads', 'First cargo bike', 'Dealer support'],
    overallScore: 8, hillScore: 7, cargoScore: 7, rangeScore: 7, valueScore: 8, familyScore: 7,
    motorBrand: 'Specialized', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 500, motorTorqueNm: 50, pedalAssistLevels: 3, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive (Specialized)',
    batteryBrand: 'Specialized', batteryWh: 710, batteryVolts: 48, batteryRemovable: true, dualBatteryCapable: false, statedRangeMi: 50, estimatedRealRangeMi: 35, chargeTimeHours: 5,
    batteryRange: '50 miles',
    weightLbs: 71, maxSystemWeightLbs: 441, cargoCapacityLbs: 170, riderHeightMin: "5'3\"", riderHeightMax: "6'4\"", foldable: false, fitsInElevator: false,
    cargoCapacity: '441 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Deore', gearType: 'derailleur' as const, numberOfGears: 10, brakeBrand: 'Tektro', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '203/203',
    frontWheelSize: '20"', rearWheelSize: '20"', tireWidthInches: 3.5, tireBrand: 'Specialized Ground Control', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 2, childSeatCompatibility: 'Thule Yepp, aftermarket', hasFootboards: true, rearRack: true, rackSystem: 'proprietary',
    integratedLights: true, lockingKickstand: false,
    includedAccessories: 'Rear rack, fenders, integrated lights', kickstandType: 'double-leg' as const, fenders: true, display: 'Specialized TCU',
    availableIn: 'Global', warrantyYears: 2, salesModel: 'dealer' as const,
  },
  {
    name: 'Xtracycle Swoop', slug: 'xtracycle-swoop', brand: 'Xtracycle', category: 'cargo-bike' as const, price: 5999,
    affiliateUrl: 'https://www.xtracycle.com/swoop',
    carryishTake: "The brand that invented longtail cargo bikes still makes one of the best. Step-through frame for easy mounting with a loaded bike. Hooptie rails come included (most brands charge $200+ extra) and turn the rear into a rolling playpen. Two kids, three kids, a surfboard, camping gear — the Swoop handles all of it. The CX motor is Bosch's most powerful, rated at 85Nm.",
    testingStatus: 'specs-only' as const,
    bestFor: ['2+ kids', 'Step-through', 'Adventure'],
    overallScore: 8, hillScore: 9, cargoScore: 8, rangeScore: 7, valueScore: 7, familyScore: 9,
    motorBrand: 'Bosch', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 600, motorTorqueNm: 85, pedalAssistLevels: 4, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Performance Line CX (Bosch, 85Nm)',
    batteryBrand: 'Bosch', batteryWh: 500, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: true, dualBatteryWh: 1000, statedRangeMi: 55, estimatedRealRangeMi: 35, chargeTimeHours: 4.5,
    batteryRange: '55 miles (500Wh)',
    weightLbs: 72, maxSystemWeightLbs: 400, cargoCapacityLbs: 160, riderHeightMin: "5'0\"", riderHeightMax: "6'4\"", foldable: false, fitsInElevator: false,
    cargoCapacity: '400 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Deore', gearType: 'derailleur' as const, numberOfGears: 10, brakeBrand: 'Shimano', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/203',
    frontWheelSize: '26"', rearWheelSize: '20"', tireWidthInches: 2.4, tireBrand: 'Schwalbe', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 3, childSeatCompatibility: 'Xtracycle Hooptie, Thule Yepp', hasFootboards: true, hasWheelGuards: true, rearRack: true, rackSystem: 'Xtracycle FreeLoader',
    integratedLights: true, lockingKickstand: true,
    includedAccessories: 'Hooptie rails, running boards, fenders, integrated lights', kickstandType: 'double-leg' as const, fenders: true, display: 'Bosch Kiox 300',
    availableIn: 'US, EU', warrantyYears: 5, warrantyDetails: '5-year frame, 2-year electrical', salesModel: 'dealer' as const,
  },
  {
    name: 'Trek Fetch+ 4', slug: 'trek-fetch-plus-4', brand: 'Trek', category: 'cargo-bike' as const, price: 6500,
    affiliateUrl: 'https://www.trekbikes.com/fetch',
    carryishTake: "Belt drive and CVP hub mean you shift smoothly under load and never clean a chain. The dropper post is a nice touch — drop the seat at stops for easy foot-down stability, raise it for efficient pedaling. 175-pound box limit fits multiple kids or a large dog. Trek dealer network is the biggest in the world, so warranty service is easy. At $6,500 it's mid-pack for front-loaders.",
    testingStatus: 'specs-only' as const,
    bestFor: ['Low maintenance', 'Dealer support', '2+ kids'],
    overallScore: 8, hillScore: 8, cargoScore: 8, rangeScore: 7, valueScore: 6, familyScore: 8,
    motorBrand: 'Bosch', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 600, motorTorqueNm: 85, pedalAssistLevels: 4, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Performance Line CX (Bosch, 85Nm)',
    batteryBrand: 'Bosch', batteryWh: 500, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: true, dualBatteryWh: 1000, statedRangeMi: 50, estimatedRealRangeMi: 30, chargeTimeHours: 4.5,
    batteryRange: '50 miles (500Wh)',
    weightLbs: 78, maxSystemWeightLbs: 400, cargoCapacityLbs: 175, lengthInches: 100, wheelbaseInches: 74, riderHeightMin: "5'3\"", riderHeightMax: "6'5\"", foldable: false, fitsInElevator: false,
    cargoCapacity: '400 lbs',
    drivetrainType: 'belt' as const, drivetrainBrand: 'Gates CDX, Enviolo', gearType: 'cvp' as const, numberOfGears: 0, brakeBrand: 'Magura', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/203',
    frontWheelSize: '20"', rearWheelSize: '26"', tireWidthInches: 2.4, tireBrand: 'Schwalbe', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'dropper' as const,
    cargoLayout: 'front-box' as const, maxChildPassengers: 2, childSeatCompatibility: 'Trek cargo box seats', hasIntegratedChildSeats: true, hasSeatbelts: true, hasWheelGuards: true, rainCoverAvailable: true, rearRack: true, rackSystem: 'proprietary',
    integratedLights: true, lockingKickstand: true,
    includedAccessories: 'Cargo box, dropper post, fenders, integrated lights, kickstand', kickstandType: 'double-leg' as const, fenders: true, display: 'Bosch Kiox 500',
    availableIn: 'Global', warrantyYears: 2, warrantyDetails: 'Lifetime frame, 2-year components', salesModel: 'dealer' as const,
  },
  {
    name: 'Yuba Kombi E5', slug: 'yuba-kombi-e5', brand: 'Yuba', category: 'cargo-bike' as const, price: 3299,
    affiliateUrl: 'https://www.yubabikes.com/kombi',
    carryishTake: "Yuba quality at an entry-level price. The Shimano Steps motor has less torque (40Nm vs 85Nm on the Spicy Curry) so steep hills with a full load will be slower. But for flat-to-moderate terrain, it does the job. The rear rack fits two child seats or panniers. Wheel skirts keep little fingers away from spokes. Good first cargo bike if you're not sure you'll commit to the lifestyle.",
    testingStatus: 'specs-only' as const,
    bestFor: ['Entry-level mid-drive', 'Flat terrain', 'First cargo bike'],
    overallScore: 7, hillScore: 5, cargoScore: 7, rangeScore: 6, valueScore: 8, familyScore: 7,
    motorBrand: 'Shimano', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 400, motorTorqueNm: 40, pedalAssistLevels: 3, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Steps E5000 (Shimano, 40Nm)',
    batteryBrand: 'Shimano', batteryWh: 418, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: false, statedRangeMi: 40, estimatedRealRangeMi: 25, chargeTimeHours: 4,
    batteryRange: '40 miles (418Wh)',
    weightLbs: 63, maxSystemWeightLbs: 440, cargoCapacityLbs: 175, riderHeightMin: "5'0\"", riderHeightMax: "6'2\"", foldable: false, fitsInElevator: false,
    cargoCapacity: '440 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Alivio', gearType: 'derailleur' as const, numberOfGears: 9, brakeBrand: 'Shimano', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/180',
    frontWheelSize: '26"', rearWheelSize: '20"', tireWidthInches: 2.15, tireBrand: 'Schwalbe', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 2, childSeatCompatibility: 'Yuba child seats, Thule Yepp', hasFootboards: true, hasWheelGuards: true, rearRack: true, rackSystem: 'Yuba',
    integratedLights: true, lockingKickstand: true,
    includedAccessories: 'Wheel skirts, running boards, fenders, kickstand', kickstandType: 'double-leg' as const, fenders: true, display: 'Shimano E6100',
    availableIn: 'Global', warrantyYears: 2, salesModel: 'dealer' as const,
  },
  {
    name: 'Gazelle Cabby', slug: 'gazelle-cabby', brand: 'Gazelle', category: 'cargo-bike' as const, price: 4500,
    affiliateUrl: 'https://www.gazelle.nl/cabby',
    carryishTake: "Wheelbase is only about 5cm longer than a regular bike. That matters for storage and handling — this doesn't feel like piloting a barge. The MIK rack system clicks accessories on and off in seconds. Front rack is frame-mounted (not handlebar-mounted), so steering stays light even with weight up front. Internally geared hub is low-maintenance. 130 years of Dutch cycling experience shows in the details.",
    testingStatus: 'specs-only' as const,
    bestFor: ['Compact', 'Low maintenance', 'City riding'],
    overallScore: 7, hillScore: 7, cargoScore: 6, rangeScore: 7, valueScore: 7, familyScore: 7,
    motorBrand: 'Bosch', motorPosition: 'mid-drive' as const, motorNominalWatts: 250, motorPeakWatts: 500, motorTorqueNm: 65, pedalAssistLevels: 4, throttle: 'none' as const, topSpeedMph: 20, bikeClass: 'class-1' as const,
    motorType: 'Mid-drive Performance Line (Bosch, 65Nm)',
    batteryBrand: 'Bosch', batteryWh: 500, batteryVolts: 36, batteryRemovable: true, dualBatteryCapable: false, statedRangeMi: 50, estimatedRealRangeMi: 35, chargeTimeHours: 4.5,
    batteryRange: '50 miles (500Wh)',
    weightLbs: 64, maxSystemWeightLbs: 400, cargoCapacityLbs: 150, riderHeightMin: "5'3\"", riderHeightMax: "6'3\"", foldable: false, fitsInElevator: false,
    cargoCapacity: '400 lbs',
    drivetrainType: 'chain' as const, drivetrainBrand: 'Shimano Nexus', gearType: 'internal-hub' as const, numberOfGears: 7, brakeBrand: 'Shimano', brakeType: 'hydraulic-disc' as const, brakeRotorSizeMm: '180/180',
    frontWheelSize: '26"', rearWheelSize: '26"', tireWidthInches: 2.15, tireBrand: 'Schwalbe', punctureProtection: true,
    suspensionType: 'rigid' as const, seatpostType: 'fixed' as const,
    cargoLayout: 'longtail' as const, maxChildPassengers: 2, childSeatCompatibility: 'MIK-compatible seats', hasFootboards: true, frontRack: true, rearRack: true, rackSystem: 'MIK',
    integratedLights: true, lockingKickstand: true,
    includedAccessories: 'MIK rack front and rear, fenders, integrated lights, chain guard', kickstandType: 'double-leg' as const, fenders: true, display: 'Bosch Purion 200',
    availableIn: 'EU, limited US', warrantyYears: 2, salesModel: 'dealer' as const,
  },
]

// Review sources for 7 bikes
const reviewSourcesData = [
  // RadWagon 5
  { productSlug: 'radwagon-5', sourceName: 'Electric Bike Report', sourceUrl: 'https://electricbikereport.com/rad-power-bikes-radwagon-5-review/', sourceType: 'editorial' as const, rating: 7.5, pullQuote: 'The torque sensor upgrade transforms the ride quality. Gen 5 is a genuine step forward for Rad.', sentiment: 'positive' as const, reviewDate: '2025-03-15', reviewerName: 'Sam Gross' },
  { productSlug: 'radwagon-5', sourceName: 'Electrek', sourceUrl: 'https://electrek.co/radwagon-5-review/', sourceType: 'editorial' as const, rating: 7.0, pullQuote: 'At 88 pounds, portability is not its strength. But for the price, the utility is hard to argue with.', sentiment: 'mixed' as const, reviewDate: '2025-04-20', reviewerName: 'Micah Toll' },
  { productSlug: 'radwagon-5', sourceName: 'YouTube: Propel', sourceUrl: 'https://youtube.com/watch?v=example1', sourceType: 'youtube' as const, rating: 7.5, pullQuote: 'Best budget cargo bike just got better. The torque sensor alone is worth the upgrade.', sentiment: 'positive' as const, reviewDate: '2025-05-01', reviewerName: 'Chris Nolte' },
  { productSlug: 'radwagon-5', sourceName: 'Reddit r/CargoBike', sourceUrl: 'https://reddit.com/r/CargoBike/comments/example1', sourceType: 'reddit' as const, rating: 7.0, pullQuote: "6 months in, daily school run with two kids. Hasn't missed a beat. Wish it was lighter.", sentiment: 'positive' as const, reviewDate: '2025-08-10', reviewerName: 'u/cargodad2024' },
  // Tern GSD S10
  { productSlug: 'tern-gsd-s10', sourceName: 'Wirecutter', sourceUrl: 'https://nytimes.com/wirecutter/reviews/best-cargo-bikes/', sourceType: 'editorial' as const, rating: 9.0, pullQuote: 'The best overall cargo bike for most families. The accessory system is unmatched, and it actually fits in an elevator.', sentiment: 'positive' as const, reviewDate: '2025-06-01', reviewerName: 'Eve O\'Neill' },
  { productSlug: 'tern-gsd-s10', sourceName: 'BikeRadar', sourceUrl: 'https://bikeradar.com/reviews/tern-gsd-s10/', sourceType: 'editorial' as const, rating: 8.5, pullQuote: 'Compact enough for daily life, capable enough for weekend adventures. The Bosch Cargo Line motor is bombproof.', sentiment: 'positive' as const, reviewDate: '2025-02-14', reviewerName: 'Warren Rossiter' },
  { productSlug: 'tern-gsd-s10', sourceName: 'GearJunkie', sourceUrl: 'https://gearjunkie.com/bikes/tern-gsd-s10-review', sourceType: 'editorial' as const, rating: 8.0, pullQuote: '$5,300 is a lot, but we think of it as a second-car replacement. The math works if you ride 3+ days a week.', sentiment: 'positive' as const, reviewDate: '2025-07-22', reviewerName: 'Adam Ruggiero' },
  // Urban Arrow Family
  { productSlug: 'urban-arrow-family', sourceName: 'Momentum Mag', sourceUrl: 'https://momentummag.com/urban-arrow-family-review/', sourceType: 'editorial' as const, rating: 9.0, pullQuote: 'The default choice in Amsterdam for a reason. Once you go front-loader with kids, you don\'t go back.', sentiment: 'positive' as const, reviewDate: '2025-01-18', reviewerName: 'Kristen Steele' },
  { productSlug: 'urban-arrow-family', sourceName: 'Electric Bike Report', sourceUrl: 'https://electricbikereport.com/urban-arrow-family-review/', sourceType: 'editorial' as const, rating: 8.5, pullQuote: 'Belt drive means you forget about maintenance. The 550-pound capacity handles our family of four with groceries to spare.', sentiment: 'positive' as const, reviewDate: '2025-04-05', reviewerName: 'Court Rye' },
  { productSlug: 'urban-arrow-family', sourceName: 'YouTube: Not Just Bikes', sourceUrl: 'https://youtube.com/watch?v=example3', sourceType: 'youtube' as const, rating: 9.5, pullQuote: 'This is the bike that replaced our car in Amsterdam. Three years later, zero regrets.', sentiment: 'positive' as const, reviewDate: '2024-11-12', reviewerName: 'Jason Slaughter' },
  // Lectric XPedition2
  { productSlug: 'lectric-xpedition2', sourceName: 'Electric Bike Report', sourceUrl: 'https://electricbikereport.com/lectric-xpedition2-review/', sourceType: 'editorial' as const, rating: 8.0, pullQuote: 'The value proposition is absurd. $1,499 for a bike that competes with models at twice the price.', sentiment: 'positive' as const, reviewDate: '2025-05-20', reviewerName: 'Sam Gross' },
  { productSlug: 'lectric-xpedition2', sourceName: 'Electrek', sourceUrl: 'https://electrek.co/lectric-xpedition2-review/', sourceType: 'editorial' as const, rating: 7.5, pullQuote: 'Add the second battery and this thing goes forever. Hub motor struggles on serious hills, but flat-landers will love it.', sentiment: 'mixed' as const, reviewDate: '2025-06-15', reviewerName: 'Micah Toll' },
  // Yuba Spicy Curry
  { productSlug: 'yuba-spicy-curry-v3', sourceName: 'Treehugger', sourceUrl: 'https://treehugger.com/yuba-spicy-curry-review/', sourceType: 'editorial' as const, rating: 8.5, pullQuote: 'The low rear deck changes everything. Our 3-year-old climbs on by herself. No lifting required.', sentiment: 'positive' as const, reviewDate: '2025-03-28', reviewerName: 'Lloyd Alter' },
  { productSlug: 'yuba-spicy-curry-v3', sourceName: 'CyclingTips', sourceUrl: 'https://cyclingtips.com/yuba-spicy-curry-v3/', sourceType: 'editorial' as const, rating: 8.0, pullQuote: 'Yuba\'s accessory catalog is the real killer feature. You can customize this bike for literally any family setup.', sentiment: 'positive' as const, reviewDate: '2025-07-10', reviewerName: 'James Huang' },
  // Aventon Abound
  { productSlug: 'aventon-abound-lr', sourceName: 'Electric Bike Report', sourceUrl: 'https://electricbikereport.com/aventon-abound-review/', sourceType: 'editorial' as const, rating: 7.5, pullQuote: 'GPS tracking on a sub-$2K cargo bike is a genuine first. The 921Wh battery outlasts everything in this price range.', sentiment: 'positive' as const, reviewDate: '2025-04-12', reviewerName: 'Court Rye' },
  { productSlug: 'aventon-abound-lr', sourceName: 'Reddit r/ebikes', sourceUrl: 'https://reddit.com/r/ebikes/comments/example2', sourceType: 'reddit' as const, rating: 7.0, pullQuote: 'Hills are the weakness. Flat city? This thing is a beast for the price.', sentiment: 'mixed' as const, reviewDate: '2025-09-01', reviewerName: 'u/ebikerider' },
  // Specialized Globe Haul
  { productSlug: 'specialized-globe-haul-lt', sourceName: 'BikeRadar', sourceUrl: 'https://bikeradar.com/reviews/specialized-globe-haul-lt/', sourceType: 'editorial' as const, rating: 8.0, pullQuote: 'Those 3.5-inch tires are game-changing on rough city streets. The ride quality is in a different league from other cargo bikes at this price.', sentiment: 'positive' as const, reviewDate: '2025-05-08', reviewerName: 'Warren Rossiter' },
  { productSlug: 'specialized-globe-haul-lt', sourceName: 'GearJunkie', sourceUrl: 'https://gearjunkie.com/bikes/specialized-globe-haul/', sourceType: 'editorial' as const, rating: 7.5, pullQuote: 'Any Specialized dealer can service this. For a lot of families, that matters more than the spec sheet.', sentiment: 'positive' as const, reviewDate: '2025-08-15', reviewerName: 'Morgan Tilton' },
  // R&M Load
  { productSlug: 'riese-muller-load-75', sourceName: 'Momentum Mag', sourceUrl: 'https://momentummag.com/riese-muller-load-75-review/', sourceType: 'editorial' as const, rating: 9.0, pullQuote: 'The full suspension ride is in a class of its own. Your kids will fall asleep in the box on rough roads. Seriously.', sentiment: 'positive' as const, reviewDate: '2025-06-20', reviewerName: 'Kristen Steele' },
]

// Video data
const videosData = [
  // RadWagon 5
  { productSlug: 'radwagon-5', youtubeId: 'dQw4w9WgXcQ', title: 'RadWagon 5 Long-Term Review: 6 Months Later', channelName: 'Propel Bikes', videoType: 'review' as const, featured: true },
  { productSlug: 'radwagon-5', youtubeId: 'dQw4w9WgXcQ', title: 'RadWagon 5 vs Lectric XPedition2: Budget Cargo Showdown', channelName: 'Electric Bike Report', videoType: 'comparison' as const, featured: false },
  { productSlug: 'radwagon-5', youtubeId: 'dQw4w9WgXcQ', title: 'Setting Up Kid Seats on the RadWagon 5', channelName: 'Rad Power Bikes', videoType: 'how-to' as const, featured: false },
  // Tern GSD S10
  { productSlug: 'tern-gsd-s10', youtubeId: 'dQw4w9WgXcQ', title: 'Tern GSD S10: The Compact Cargo King', channelName: 'Propel Bikes', videoType: 'review' as const, featured: true },
  { productSlug: 'tern-gsd-s10', youtubeId: 'dQw4w9WgXcQ', title: 'Tern GSD vs Yuba Spicy Curry: Which Longtail?', channelName: 'Electric Bike Report', videoType: 'comparison' as const, featured: false },
  { productSlug: 'tern-gsd-s10', youtubeId: 'dQw4w9WgXcQ', title: 'A Day with the Tern GSD S10 in Brooklyn', channelName: 'Propel Bikes', videoType: 'ride-along' as const, featured: false },
  // Urban Arrow Family
  { productSlug: 'urban-arrow-family', youtubeId: 'dQw4w9WgXcQ', title: 'Urban Arrow Family: Why Amsterdam Chose This Bike', channelName: 'Not Just Bikes', videoType: 'review' as const, featured: true },
  { productSlug: 'urban-arrow-family', youtubeId: 'dQw4w9WgXcQ', title: 'Urban Arrow vs Riese & Müller Load: Front-Loader Face-Off', channelName: 'Propel Bikes', videoType: 'comparison' as const, featured: false },
  { productSlug: 'urban-arrow-family', youtubeId: 'dQw4w9WgXcQ', title: 'School Run with Three Kids in an Urban Arrow', channelName: 'Cargo Bike Mama', videoType: 'ride-along' as const, featured: false },
  // Lectric
  { productSlug: 'lectric-xpedition2', youtubeId: 'dQw4w9WgXcQ', title: 'Lectric XPedition2: Best Budget Cargo Bike?', channelName: 'Electric Bike Report', videoType: 'review' as const, featured: true },
  { productSlug: 'lectric-xpedition2', youtubeId: 'dQw4w9WgXcQ', title: 'Lectric XPedition2 Unboxing and Assembly', channelName: 'Lectric eBikes', videoType: 'unboxing' as const, featured: false },
  // Yuba
  { productSlug: 'yuba-spicy-curry-v3', youtubeId: 'dQw4w9WgXcQ', title: 'Yuba Spicy Curry V3: The Family Hauler', channelName: 'Path Less Pedaled', videoType: 'review' as const, featured: true },
  { productSlug: 'yuba-spicy-curry-v3', youtubeId: 'dQw4w9WgXcQ', title: 'Yuba Accessories Deep Dive: Monkey Bars, Soft Spots, More', channelName: 'Yuba Bikes', videoType: 'how-to' as const, featured: false },
  // Specialized
  { productSlug: 'specialized-globe-haul-lt', youtubeId: 'dQw4w9WgXcQ', title: 'Globe Haul LT: Specialized Gets Serious About Cargo', channelName: 'GCN', videoType: 'review' as const, featured: true },
  // Aventon
  { productSlug: 'aventon-abound-lr', youtubeId: 'dQw4w9WgXcQ', title: 'Aventon Abound LR: GPS Tracking and 921Wh Battery', channelName: 'Electrek', videoType: 'review' as const, featured: true },
  // R&M
  { productSlug: 'riese-muller-load-75', youtubeId: 'dQw4w9WgXcQ', title: 'Riese & Müller Load 75: Full Suspension Luxury', channelName: 'Propel Bikes', videoType: 'review' as const, featured: true },
  { productSlug: 'riese-muller-load-75', youtubeId: 'dQw4w9WgXcQ', title: 'R&M Load vs Trek Fetch+: Premium Front-Loaders Compared', channelName: 'Electric Bike Report', videoType: 'comparison' as const, featured: false },
  // Trek
  { productSlug: 'trek-fetch-plus-4', youtubeId: 'dQw4w9WgXcQ', title: 'Trek Fetch+ 4: Belt Drive Front-Loader Review', channelName: 'BikeRadar', videoType: 'review' as const, featured: true },
]

export const seedProductsV3 = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding product catalog v3 (normalized)...')

  // Clear existing data
  payload.logger.info('— Clearing existing data...')
  for (const collection of ['product-videos', 'review-sources', 'products', 'brands'] as const) {
    await payload.db.deleteMany({ collection, req, where: {} })
    if (payload.collections[collection]?.config?.versions) {
      await payload.db.deleteVersions({ collection, req, where: {} })
    }
  }

  // Seed categories
  payload.logger.info('— Seeding categories...')
  for (const cat of categoriesData) {
    const existing = await payload.find({ collection: 'categories', where: { slug: { equals: cat.slug } }, limit: 1 })
    if (existing.docs.length > 0) {
      await payload.update({ collection: 'categories', id: existing.docs[0].id, data: cat })
    } else {
      await payload.create({ collection: 'categories', data: cat })
    }
  }

  // Seed brands
  payload.logger.info('— Seeding brands...')
  const brandMap: Record<string, number> = {}
  for (const brand of brandsData) {
    const doc = await payload.create({ collection: 'brands', data: brand })
    brandMap[brand.name] = doc.id
  }

  // Seed products with all fields
  payload.logger.info(`— Seeding ${productsData.length} products with normalized specs...`)
  const productMap: Record<string, number> = {}
  for (const product of productsData) {
    const brandId = brandMap[product.brand]
    const { brand: _brand, carryishTake, bestFor, ...rest } = product

    const doc = await payload.create({
      collection: 'products',
      depth: 0,
      context: { disableRevalidate: true },
      data: {
        ...rest,
        brand: brandId || undefined,
        bestFor: bestFor?.map((tag) => ({ tag })),
        carryishTake: {
          root: {
            type: 'root',
            children: [{ type: 'paragraph', children: [{ type: 'text', text: carryishTake }], version: 1 }],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        _status: 'published',
        publishedAt: new Date().toISOString(),
      } as any,
    })
    productMap[product.slug] = doc.id
  }

  // Seed review sources
  payload.logger.info(`— Seeding ${reviewSourcesData.length} review sources...`)
  for (const review of reviewSourcesData) {
    const productId = productMap[review.productSlug]
    if (!productId) continue
    const { productSlug: _, ...rest } = review
    await payload.create({
      collection: 'review-sources',
      data: { ...rest, product: productId } as any,
    })
  }

  // Seed videos
  payload.logger.info(`— Seeding ${videosData.length} product videos...`)
  for (const video of videosData) {
    const productId = productMap[video.productSlug]
    if (!productId) continue
    const { productSlug: _, ...rest } = video
    await payload.create({
      collection: 'product-videos',
      data: { ...rest, product: productId } as any,
    })
  }

  payload.logger.info(`Seeded: ${brandsData.length} brands, ${productsData.length} products, ${reviewSourcesData.length} reviews, ${videosData.length} videos.`)
}
