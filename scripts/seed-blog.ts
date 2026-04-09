/**
 * Seed 3 blog posts into Payload CMS.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/seed-blog.ts
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/seed-blog.ts --dry-run
 */

import 'dotenv/config'

const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'
const DRY_RUN = process.argv.includes('--dry-run')

// ── Lexical helpers ──────────────────────────────────────────────────────────

const t = (text: string, format = 0) => ({
  type: 'text',
  text,
  format,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})
const bold = (text: string) => t(text, 1)

const p = (...children: ReturnType<typeof t>[]) => ({
  type: 'paragraph',
  children,
  direction: 'ltr',
  format: '' as const,
  indent: 0,
  textFormat: 0,
  textStyle: '',
  version: 1,
})

const h2 = (text: string) => ({
  type: 'heading',
  tag: 'h2',
  children: [t(text)],
  direction: 'ltr',
  format: '' as const,
  indent: 0,
  version: 1,
})

const h3 = (text: string) => ({
  type: 'heading',
  tag: 'h3',
  children: [t(text)],
  direction: 'ltr',
  format: '' as const,
  indent: 0,
  version: 1,
})

const li = (value: number, ...children: ReturnType<typeof t>[]) => ({
  type: 'listitem',
  value,
  children,
  direction: 'ltr',
  format: '' as const,
  indent: 0,
  version: 1,
})

const ul = (...items: ReturnType<typeof li>[]) => ({
  type: 'list',
  listType: 'bullet',
  tag: 'ul',
  start: 1,
  children: items,
  direction: 'ltr',
  format: '' as const,
  indent: 0,
  version: 1,
})

const root = (...children: unknown[]) => ({
  root: {
    type: 'root',
    children,
    direction: 'ltr',
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

// ── Post content ─────────────────────────────────────────────────────────────

const post1 = {
  title: 'Longtail vs front-loader: which cargo bike layout fits your life?',
  slug: 'longtail-vs-front-loader',
  publishedAt: '2026-04-01T12:00:00.000Z',
  meta: {
    title: 'Longtail vs front-loader: which cargo bike layout fits your life? | Carryish',
    description:
      'The two main cargo bike formats handle differently, store differently, and fit different lives. A side-by-side comparison with specific bike picks for each.',
  },
  content: root(
    p(t('The two main cargo bike formats handle differently, store differently, and fit different lives. Here\u2019s how to pick.')),

    h2('Longtails: the gateway cargo bike'),
    p(
      t('A longtail looks like a regular bike that someone stretched. The rear rack extends behind you, kids sit on bench seats facing forward, and the whole thing handles close to a normal bicycle. That last part matters more than any spec sheet.'),
    ),
    p(
      t('The Tern GSD S10 is our favorite example. At 70 pounds, it\u2019s one of the lighter cargo bikes out there. It fits in a standard elevator. You can lean it against the wall in your apartment hallway. Try that with a front-loader.'),
    ),
    p(
      t('Most longtails carry two kids comfortably. The Yuba Spicy Curry GT fits three with the right accessories, though \u201Ccomfortably\u201D is doing some work in that sentence. Kids sit behind you, which means no eye contact while riding but also means your center of gravity stays predictable. You steer the same way you\u2019ve always steered a bike.'),
    ),
    p(bold('Typical longtail specs:')),
    ul(
      li(1, t('Weight: 55\u201375 lbs')),
      li(2, t('Cargo capacity: 300\u2013440 lbs total')),
      li(3, t('Length: 6.5\u20137.5 feet')),
      li(4, t('Price: $2,500\u2013$7,000')),
    ),
    p(
      t('The tradeoff: you can\u2019t see your kids without turning around. Smaller kids need to be old enough to hold on (usually 2+, though accessories help). And cargo goes behind you, not in front, so you\u2019re estimating by feel when you\u2019re loaded up with groceries.'),
    ),

    h2('Front-loaders: the full car replacement'),
    p(
      t('Front-loaders put a big box between you and the front wheel. Kids face you. Groceries are visible. You can carry a ridiculous amount of stuff. The Urban Arrow Family hauls 275 lbs in its box alone, and parents regularly cram two kids, a dog, and a Costco run in there.'),
    ),
    p(
      t('But they\u2019re big. The Urban Arrow Family is 8.5 feet long and weighs 120+ pounds with the battery. Parking means a garage, a shed, or a covered spot outside. Apartment living is basically off the table unless you have ground-floor access.'),
    ),
    p(
      t('Riding a front-loader takes adjustment. The steering feels different because you\u2019re turning a longer wheelbase. Give yourself two weeks. After that, most people forget it ever felt weird.'),
    ),
    p(bold('Typical front-loader specs:')),
    ul(
      li(1, t('Weight: 90\u2013130 lbs')),
      li(2, t('Cargo capacity: 200\u2013350 lbs in the box')),
      li(3, t('Length: 8\u20139 feet')),
      li(4, t('Price: $4,000\u2013$10,000')),
    ),
    p(
      t('The tradeoff: you need space to store it, and you need to be okay with a bike that doesn\u2019t pretend to be anything other than a cargo vehicle. These are purpose-built. They\u2019re not doubling as a commuter.'),
    ),

    h2('So which one?'),
    p(
      t('If you live in an apartment, start with a longtail. The Tern GSD or Lectric XPedition2 will handle school runs and grocery trips without requiring a storage overhaul.'),
    ),
    p(
      t('If you have a house with garage access and want to replace a car for real, a front-loader is the move. The Urban Arrow Family is the benchmark if you have the budget. The RadWagon 5 won\u2019t give you the front-box visibility, but it gets close on capacity for a third of the price.'),
    ),
    p(
      t('If you\u2019re on the fence, start with a longtail. They cost less, store easier, and the learning curve is basically zero. You can always upgrade to a front-loader once you\u2019ve caught the bug.'),
    ),
    p(t('And you will catch the bug.')),
  ),
}

const post2 = {
  title: 'The real cost of owning a cargo bike',
  slug: 'real-cost-owning-cargo-bike',
  publishedAt: '2026-04-04T12:00:00.000Z',
  meta: {
    title: 'The real cost of owning a cargo bike | Carryish',
    description:
      'Purchase price, accessories, insurance, maintenance, battery replacement, electricity. Every dollar, year by year, compared to the $10,729/yr cost of owning a car.',
  },
  content: root(
    p(t('The sticker price is the biggest number you\u2019ll pay, but it\u2019s not the only one. Here\u2019s every dollar, year by year.')),

    h2('The bike itself: $1,500\u2013$10,000'),
    p(
      t('Budget picks like the Lectric XPedition2 ($1,499) and Aventon Abound ($1,999) get you riding for under two grand. Mid-range longtails like the RadWagon 5 ($2,499) and Tern Quick Haul ($3,299) add better components and torque sensors. Premium builds like the Tern GSD S10 ($5,299) and Urban Arrow Family ($6,499+) are buy-it-for-a-decade bikes.'),
    ),
    p(t('Most families land between $2,000 and $5,000.')),

    h2('Year one accessories: $200\u2013$800'),
    p(t('You\u2019ll need some things the bike doesn\u2019t include:')),
    ul(
      li(1, t('Kid seats or bench pads: $80\u2013$200')),
      li(2, t('Rain cover or canopy: $100\u2013$300')),
      li(3, t('Cargo bags or panniers: $50\u2013$150')),
      li(4, t('Lock (get a good one): $60\u2013$120')),
      li(5, t('Lights (if not included): $40\u2013$80')),
    ),
    p(
      t('Budget bikes ship with less. The Lectric XPedition2 arrives with no kid accessories at all. Factor in $300\u2013$500 for a budget bike, $100\u2013$200 for a premium one that includes more from the factory.'),
    ),

    h2('Annual maintenance: $100\u2013$300'),
    p(
      t('Chain or belt, brake pads, tire tubes. A yearly tune-up at a shop runs $80\u2013$150. If you\u2019re riding daily, double the tire and brake pad frequency. Belt drive bikes (like the Tern GSD with the Gates belt option) cut maintenance costs roughly in half compared to chain drives.'),
    ),

    h2('Battery replacement: $400\u2013$800 every 3\u20135 years'),
    p(
      t('Lithium batteries degrade. After 500\u2013800 charge cycles, you\u2019ll notice the range dropping. A replacement battery runs $400\u2013$800 depending on the brand and capacity. Bosch batteries are on the pricier end. Lectric\u2019s are among the cheapest.'),
    ),
    p(
      t('Don\u2019t store the battery fully charged or fully empty. Keep it between 20% and 80% when you\u2019re not riding, and it\u2019ll last longer.'),
    ),

    h2('Insurance: $0\u2013$400/year'),
    p(
      t('Most homeowner\u2019s or renter\u2019s policies cover bikes up to a certain value. For a $5,000+ cargo bike, consider a dedicated bike insurance policy. Velosurance and Spoke charge $150\u2013$400/year depending on coverage and where you live. Theft is the main risk, not crashes.'),
    ),

    h2('Electricity: ~$25/year'),
    p(
      t('This one surprises people. Charging a 500Wh battery from empty costs about 7 cents. If you charge twice a week, that\u2019s $7.28/year. Even heavy riders won\u2019t break $30.'),
    ),

    h2('The comparison that ends the debate'),
    p(
      t('AAA puts the average cost of owning a car at $10,729 per year. That includes gas, insurance, maintenance, depreciation, and financing. A second car in a two-car household costs roughly the same.'),
    ),
    p(
      t('A cargo bike, all in, costs $600\u2013$1,200/year after the initial purchase. Even if you buy a $5,000 bike and spread it over five years, you\u2019re at $1,600\u2013$2,200/year total.'),
    ),
    p(bold('The bike pays for itself in year one if it replaces a second car.'), t(' By year three, you\u2019ve saved $20,000+.')),
    p(t('It\u2019s not even close.')),
  ),
}

const post3 = {
  title: 'Best cargo bikes under $3,000 in 2026',
  slug: 'best-cargo-bikes-under-3000-2026',
  publishedAt: '2026-04-07T12:00:00.000Z',
  meta: {
    title: 'Best cargo bikes under $3,000 in 2026 | Carryish',
    description:
      'Three cargo bikes ranked: Lectric XPedition2 ($1,499), Aventon Abound LR ($1,999), and RadWagon 5 ($2,499). The value play, the sweet spot, and the safe pick.',
  },
  content: root(
    p(
      t('The winner is the Lectric XPedition2 at $1,499. If your budget stretches to $2,000, the Aventon Abound LR is the better bike. The RadWagon 5 at $2,499 is the safe pick. Here\u2019s why.'),
    ),

    h2('#1: Lectric XPedition2 \u2014 $1,499'),
    p(
      t('No cargo bike comes close to this price. The XPedition2 runs a 750W rear hub motor with a 48V/14Ah battery (672Wh), which gives you 40+ miles of real-world range. It folds, sort of, which helps if you\u2019re tight on garage space.'),
    ),
    p(
      t('The catch: it ships bare. No kid seats, no running boards, no rain cover. Lectric sells accessories, but budget $300\u2013$500 to actually outfit it for family use. The hub motor also struggles on steep hills with a full load. Under 8% grade? Fine. Over that, you\u2019ll feel it.'),
    ),
    p(
      bold('Who it\u2019s for:'),
      t(' families who want to try cargo biking without betting $5,000 on a lifestyle change. At $1,499, the risk is low.'),
    ),

    h2('#2: Aventon Abound LR \u2014 $1,999'),
    p(
      t('Five hundred dollars more than the Lectric gets you a lot. The Abound LR packs a 720Wh battery, GPS tracking, an integrated alarm, and a torque sensor (smoother pedal response than the XPedition2\u2019s cadence sensor). It also ships with a rear rack and basic mounting points.'),
    ),
    p(
      t('The LR (Long Range) version is the one to get. The base Abound ($1,599) has a smaller battery, and range anxiety on a cargo bike is a real thing when you\u2019re 6 miles from home with two kids.'),
    ),
    p(
      t('The weakness: same as the Lectric, it\u2019s a hub motor. Hills over 10% grade with 150+ pounds of cargo will have you working. Flat to moderate terrain? This bike overdelivers for $2,000.'),
    ),
    p(
      bold('Who it\u2019s for:'),
      t(' riders who want GPS security and better pedal feel without spending Tern money.'),
    ),

    h2('#3: RadWagon 5 \u2014 $2,499'),
    p(
      t('Rad Power Bikes is the biggest direct-to-consumer e-bike brand in the US, and the RadWagon 5 is their cargo flagship. It\u2019s proven. Parts are easy to find. The community forums are active. When something breaks, you won\u2019t be waiting six weeks for a proprietary part from a startup that might not exist next year.'),
    ),
    p(
      t('The RadWagon 5 runs a 750W geared hub motor with a 48V/14Ah battery (672Wh). Payload capacity is 350 lbs. It\u2019s solidly built but heavy at 88 pounds, which you\u2019ll feel if you ever need to lift it over a curb or up stairs.'),
    ),
    p(
      t('The upgrade over the cheaper options: better fit and finish, an established service network, and the confidence that comes with buying from a company that\u2019s shipped hundreds of thousands of bikes.'),
    ),
    p(
      bold('Who it\u2019s for:'),
      t(' first-time cargo bike buyers who value reliability and brand stability over cutting-edge specs.'),
    ),

    h2('The verdict'),
    p(
      t('At $1,499, the Lectric XPedition2 is the value play. You\u2019ll spend more on accessories, and you\u2019ll compromise on hills, but the entry price is unmatched.'),
    ),
    p(
      t('At $1,999, the Aventon Abound LR is the sweet spot. Better battery, better tech, better riding feel. This is the one we\u2019d recommend for most families.'),
    ),
    p(
      t('At $2,499, the RadWagon 5 is the insurance policy. You\u2019re paying for the brand, the network, and the certainty that this bike will still be supported in five years. Sometimes that\u2019s worth $500.'),
    ),
  ),
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const data = await res.json()
  if (!data.token) throw new Error('Login failed: ' + JSON.stringify(data))
  return data.token
}

async function createPost(
  post: { title: string; slug: string; publishedAt: string; meta: { title: string; description: string }; content: unknown },
  token: string,
): Promise<number | null> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create post: "${post.title}"`)
    return null
  }

  const body = {
    title: post.title,
    slug: post.slug,
    publishedAt: post.publishedAt,
    content: post.content,
    meta: post.meta,
    _status: 'published',
  }

  const res = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (data.errors) {
    console.error(`  Failed to create "${post.title}":`, JSON.stringify(data.errors, null, 2))
    return null
  }

  console.log(`  Created: "${post.title}" (id=${data.doc?.id})`)
  return data.doc?.id ?? null
}

async function setRelatedPosts(postId: number, relatedIds: number[], token: string) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would set related posts for ${postId}: [${relatedIds.join(', ')}]`)
    return
  }

  const res = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify({ relatedPosts: relatedIds }),
  })

  const data = await res.json()
  if (data.errors) {
    console.error(`  Failed to set related posts for ${postId}:`, data.errors)
  } else {
    console.log(`  Set related posts for ${postId}: [${relatedIds.join(', ')}]`)
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱 Seeding blog posts on ${BASE_URL}${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  const token = await getToken()
  console.log('Authenticated.\n')

  // Check for existing posts with these slugs
  for (const post of [post1, post2, post3]) {
    const checkRes = await fetch(
      `${BASE_URL}/api/posts?where[slug][equals]=${post.slug}&limit=1`,
      { headers: { Authorization: `JWT ${token}` } },
    )
    const checkData = await checkRes.json()
    if (checkData.docs?.length > 0) {
      console.log(`  Skipping "${post.title}" — already exists (id=${checkData.docs[0].id})`)
      ;(post as any)._existingId = checkData.docs[0].id
    }
  }

  const posts = [post1, post2, post3]
  const ids: (number | null)[] = []

  for (const post of posts) {
    if ((post as any)._existingId) {
      ids.push((post as any)._existingId)
      continue
    }
    const id = await createPost(post, token)
    ids.push(id)
  }

  // Set related posts (each post links to the other two)
  const validIds = ids.filter((id): id is number => id !== null)
  if (validIds.length >= 2) {
    console.log('\nSetting related posts...')
    for (let i = 0; i < validIds.length; i++) {
      const others = validIds.filter((_, j) => j !== i)
      await setRelatedPosts(validIds[i], others, token)
    }
  }

  console.log('\nDone.\n')
}

main().catch(console.error)
