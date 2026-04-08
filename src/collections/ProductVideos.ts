import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { anyone } from '../access/anyone'

export const ProductVideos: CollectionConfig = {
  slug: 'product-videos',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'product', 'channelName', 'videoType'],
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    { name: 'youtubeId', type: 'text', required: true },
    { name: 'title', type: 'text', required: true },
    { name: 'channelName', type: 'text' },
    {
      name: 'videoType',
      type: 'select',
      options: [
        { label: 'Review', value: 'review' },
        { label: 'Unboxing', value: 'unboxing' },
        { label: 'Comparison', value: 'comparison' },
        { label: 'Ride-along', value: 'ride-along' },
        { label: 'How-to', value: 'how-to' },
      ],
    },
    { name: 'featured', type: 'checkbox', defaultValue: false },
  ],
}
