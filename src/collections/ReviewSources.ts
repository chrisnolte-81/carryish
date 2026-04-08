import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { anyone } from '../access/anyone'

export const ReviewSources: CollectionConfig = {
  slug: 'review-sources',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'sourceName',
    defaultColumns: ['sourceName', 'product', 'rating', 'sentiment'],
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    { name: 'sourceName', type: 'text', required: true },
    { name: 'sourceUrl', type: 'text' },
    {
      name: 'sourceType',
      type: 'select',
      options: [
        { label: 'Editorial', value: 'editorial' },
        { label: 'YouTube', value: 'youtube' },
        { label: 'User review', value: 'user-review' },
        { label: 'Reddit', value: 'reddit' },
      ],
    },
    { name: 'rating', type: 'number', min: 0, max: 10 },
    { name: 'pullQuote', type: 'textarea' },
    { name: 'reviewDate', type: 'date' },
    { name: 'reviewerName', type: 'text' },
    {
      name: 'sentiment',
      type: 'select',
      options: [
        { label: 'Positive', value: 'positive' },
        { label: 'Mixed', value: 'mixed' },
        { label: 'Negative', value: 'negative' },
      ],
    },
  ],
}
