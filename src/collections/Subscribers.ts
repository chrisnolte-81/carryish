import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  access: {
    create: () => true,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
    },
  ],
}
