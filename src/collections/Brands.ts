import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { slugField } from 'payload'

export const Brands: CollectionConfig = {
  slug: 'brands',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({
      fieldToUse: 'name',
    }),
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'websiteUrl',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'logoStatus',
      type: 'select',
      options: [
        { label: 'Needs logo', value: 'needs-logo' },
        { label: 'Has placeholder', value: 'placeholder' },
        { label: 'Uploaded', value: 'uploaded' },
      ],
      defaultValue: 'needs-logo',
      admin: {
        position: 'sidebar',
        description: 'Logo pipeline status',
      },
    },
  ],
}
