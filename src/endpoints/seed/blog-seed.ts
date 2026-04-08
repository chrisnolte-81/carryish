import type { Payload, PayloadRequest } from 'payload'

function textNode(text: string) {
  return { type: 'text' as const, text, version: 1 }
}

function paragraph(text: string) {
  return {
    type: 'paragraph' as const,
    children: [textNode(text)],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  }
}

function heading(text: string, tag: 'h2' | 'h3' = 'h2') {
  return {
    type: 'heading' as const,
    tag,
    children: [textNode(text)],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  }
}

function richText(children: any[]) {
  return {
    root: {
      type: 'root' as const,
      children,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

const postsData = [
  {
    title: 'Longtail vs front-loader: which cargo bike layout is right for you?',
    slug: 'longtail-vs-front-loader',
    content: richText([
      paragraph(
        "Two main formats dominate the cargo bike world, and they ride completely differently. Your choice comes down to what you're carrying, where you're riding, and where you're storing it.",
      ),
      heading('Longtails: the practical choice'),
      paragraph(
        "A longtail looks almost like a normal bike with an extended rear rack. Kids sit behind you on padded seats with grab bars or in a bucket. The Tern GSD S10, Yuba Spicy Curry V3, and RadWagon 5 are all longtails.",
      ),
      paragraph(
        "The advantage: they're narrower, lighter (relatively), and easier to store. You can fit a longtail in a standard bike rack, an elevator, or a narrow hallway. The Tern GSD folds to save even more space. Most longtails weigh 57-88 pounds.",
      ),
      paragraph(
        "The tradeoff: your kids are behind you, so you can't see them without turning around. And cargo capacity tops out around 440-450 pounds total weight.",
      ),
      heading('Front-loaders: the minivan'),
      paragraph(
        "A front-loader (or bakfiets) puts a cargo box between the handlebars and the front wheel. The Urban Arrow Family and Trek Fetch+ 4 are front-loaders. Riese & Muller's Load 75 is a front-loader with full suspension.",
      ),
      paragraph(
        "The advantage: your kids face you. You can talk to them, hand them snacks, see if they're sleeping. The cargo box is huge — two kids with seatbelts, a dog, a week of groceries. The Urban Arrow handles 550 pounds total.",
      ),
      paragraph(
        "The tradeoff: they're long. Really long. Parking is harder, U-turns are wider, and you need a garage or large hallway for storage. They're also heavier and more expensive on average.",
      ),
      heading('Our recommendation'),
      paragraph(
        "If you live in an apartment or have limited storage, get a longtail. The Tern GSD S10 ($5,300) is our top pick — it fits in an elevator and hauls like a truck. For tighter budgets, the Lectric XPedition2 ($1,499) is shockingly capable.",
      ),
      paragraph(
        "If you have garage storage and want the maximum kid-hauling experience, get a front-loader. The Urban Arrow Family ($8,000) is what half of Amsterdam rides. The Trek Fetch+ 4 ($6,500) is a solid alternative with better dealer support in the US.",
      ),
      paragraph(
        "We're partial to longtails for most American families. Storage is the bottleneck, and longtails fit where front-loaders don't. But if you've got the space, there's nothing like a front-loader for daily school runs.",
      ),
    ]),
  },
  {
    title: 'The real cost of owning a cargo bike',
    slug: 'real-cost-cargo-bike',
    content: richText([
      paragraph(
        "The sticker price is just the start. Here's what a year of cargo bike ownership actually costs, based on real numbers from owners and our own experience.",
      ),
      heading('The bike itself: $1,499 to $9,500'),
      paragraph(
        "Budget: Lectric XPedition2 at $1,499 or Aventon Abound LR at $1,999. Both are hub motor longtails with solid specs for the money.",
      ),
      paragraph(
        "Mid-range: RadWagon 5 ($2,499), Yuba Kombi E5 ($3,299), or Specialized Globe Haul LT ($3,800). Better components, better ride quality.",
      ),
      paragraph(
        "Premium: Tern GSD S10 ($5,300), Urban Arrow Family ($8,000), or Riese & Muller Load 75 ($9,500). Bosch motors, Gates belt drives, built to last a decade.",
      ),
      heading('Accessories: $200 to $800'),
      paragraph(
        "Kid seats run $100-200 each. Panniers are $50-150 per pair. Rain covers are $100-200. A front rack adds $80-150. Safety rails (Hooptie-style) are $150-250. Budget $400-600 if you're hauling kids, $200-300 for cargo-only setups.",
      ),
      heading('Insurance: $200 to $400 per year'),
      paragraph(
        "Standard homeowner's or renter's insurance might cover theft, but with deductibles it's usually not worth it for a sub-$3K bike. For bikes over $3,000, dedicated e-bike insurance from Velosurance or Spoke runs $200-400/year. Worth it if you park outside.",
      ),
      heading('Maintenance: $100 to $300 per year'),
      paragraph(
        "Chain bikes: $100-200/year for chain, brake pads, tire replacement, and one annual tune-up. Belt drive bikes (Tern GSD, Urban Arrow, Trek Fetch+): $50-100/year because belts last 15,000+ miles and don't stretch.",
      ),
      paragraph(
        "Budget extra for your first year — a professional bike fit ($50-100) and a good lock ($80-120) are worth it.",
      ),
      heading('What you save'),
      paragraph(
        "The average American family spends $10,000-12,000 per year on a second car (payments, insurance, gas, parking, maintenance). If your cargo bike replaces even half of those trips, you're looking at $3,000-5,000 in annual savings. The bike pays for itself in 1-2 years.",
      ),
      paragraph(
        "That math changes if you're in a city with expensive parking. In Brooklyn, a parking spot runs $200-400/month. A cargo bike costs $0/month to park.",
      ),
      heading('Total first-year cost'),
      paragraph(
        "Budget setup (Lectric XPedition2 + accessories + insurance): about $2,300. Mid-range setup (Tern GSD S10 + accessories + insurance): about $6,500. Either way, it's less than a year of car payments on a used Honda.",
      ),
    ]),
  },
  {
    title: 'Best cargo bikes under $3,000 in 2026',
    slug: 'best-cargo-bikes-under-3000-2026',
    content: richText([
      paragraph(
        "Three years ago, sub-$3K cargo bikes were a compromise. Not anymore. The category has gotten so competitive that you can get torque sensors, GPS tracking, and 60+ mile range for under two grand. Here are our top three picks for 2026.",
      ),
      heading('1. Lectric XPedition2 — $1,499'),
      paragraph(
        "The best value in cargo biking, full stop. 450-pound capacity, torque sensor, and a modular battery system that lets you start with one 624Wh pack and add a second later for 100+ mile range.",
      ),
      paragraph(
        "The catch: accessories cost extra. A full family setup with kid seats, rails, and panniers adds $400-600. Even then, your total is still under $2,100. Nobody else gets close at this price.",
      ),
      paragraph(
        "We'd pick this for: budget-conscious families on flat-to-moderate terrain who want to test the cargo bike life without a big financial commitment.",
      ),
      heading('2. Aventon Abound LR — $1,999'),
      paragraph(
        "GPS tracking and an alarm system on a $2K bike. The 921Wh battery is massive — we're talking genuine 50-60 mile range in real-world riding with hills and cargo. The locking kickstand is a nice touch for peace of mind.",
      ),
      paragraph(
        "Limitation: it's a hub motor. Steep hills (10%+ grade) with a full load will feel it. If your commute is flat to rolling, you won't notice. If you live in San Francisco, spend more on a mid-drive.",
      ),
      paragraph(
        "We'd pick this for: riders who want the most built-in features for the money, especially the GPS tracking if theft is a concern.",
      ),
      heading('3. RadWagon 5 — $2,499'),
      paragraph(
        "Gen 5 fixed the two biggest complaints about the RadWagon: it added a torque sensor (the old cadence sensor felt jerky) and upgraded to SafeShield battery cells for better thermal safety. Class 3 speeds up to 28mph help you keep pace with traffic.",
      ),
      paragraph(
        "At 88 pounds, this is the heaviest bike on this list. Plan on parking it where you ride it — you're not carrying this up stairs or into an elevator.",
      ),
      paragraph(
        "We'd pick this for: families who want an established brand with solid customer service and don't need to move the bike up stairs.",
      ),
      heading('The bottom line'),
      paragraph(
        "Get the Lectric if you want the lowest entry price and flat terrain. Get the Aventon if theft protection matters. Get the RadWagon if you want the most established brand. All three will haul two kids and groceries for years.",
      ),
      paragraph(
        "We're partial to the Lectric XPedition2 at this price point. The modular battery system means you're not locked in — add capacity as you need it. That's a smarter buy than over-spending upfront.",
      ),
    ]),
  },
]

export const seedBlogPosts = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding blog posts...')

  for (const post of postsData) {
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: post.slug } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      payload.logger.info(`— Post "${post.title}" already exists, skipping`)
      continue
    }

    await payload.create({
      collection: 'posts',
      depth: 0,
      context: { disableRevalidate: true },
      data: {
        title: post.title,
        slug: post.slug,
        content: post.content as any,
        _status: 'published',
        publishedAt: new Date().toISOString(),
      },
    })
    payload.logger.info(`— Created post: "${post.title}"`)
  }

  payload.logger.info(`Seeded ${postsData.length} blog posts.`)
}
